// Package api is the HTTP API. Handlers read and write the database through
// the sqlc queries and publish realtime events after writes.
package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"time"

	sentryhttp "github.com/getsentry/sentry-go/http"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/laurin-notemann/beerpong/api-go/internal/auth"
	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

// Bucket is the object storage the API signs uploads for.
type Bucket interface {
	PublicURL(key string) string
	UploadURL(ctx context.Context, key, contentType string) (string, error)
	Delete(ctx context.Context, key string) error
}

type Server struct {
	pool   *pgxpool.Pool
	q      *db.Queries
	tokens *auth.Tokens
	bucket Bucket
	hub    *realtime.Hub
	log    *slog.Logger
	// now is the clock for every timestamp the API writes. The Java backend
	// ran in UTC; so does this.
	now func() time.Time
}

func NewServer(pool *pgxpool.Pool, tokens *auth.Tokens, bucket Bucket, hub *realtime.Hub, log *slog.Logger) *Server {
	return &Server{
		pool:   pool,
		q:      db.New(pool),
		tokens: tokens,
		bucket: bucket,
		hub:    hub,
		log:    log,
		now:    func() time.Time { return time.Now().UTC() },
	}
}

// request is what a handler gets: the HTTP request plus the authenticated
// user for /groups/** routes.
type request struct {
	*http.Request
	userID string
}

func (r *request) path(name string) string { return r.PathValue(name) }

type handlerFunc func(*request) response

// route registers one path with its handlers per method. Unknown methods get
// Spring's 405 body.
type route map[string]handlerFunc

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	handle := func(pattern string, methods route) {
		mux.Handle(pattern, s.dispatch(methods))
	}

	handle("/healthcheck", route{"GET": s.healthcheck})
	handle("/group-presets", route{"GET": s.listPresets})
	handle("/assets/{id}", route{"GET": s.getAsset})
	handle("/auth/signup", route{"POST": s.signup})
	handle("/auth/refresh", route{"POST": s.refresh})

	handle("/groups", route{"GET": s.findGroupByInviteCode, "POST": s.createGroup})
	handle("/groups/user", route{"GET": s.userGroups})
	handle("/groups/{id}", route{"GET": s.getGroup, "PUT": s.updateGroup})
	handle("/groups/{id}/wallpaper", route{"PUT": s.setWallpaper, "DELETE": s.deleteWallpaper})
	handle("/groups/{id}/join", route{"POST": s.joinGroup})
	handle("/groups/{id}/leave", route{"POST": s.leaveGroup})
	handle("/groups/{groupId}/leaderboard", route{"GET": s.leaderboard})
	handle("/groups/{groupId}/active-season", route{"PUT": s.startSeason})
	handle("/groups/{groupId}/seasons", route{"GET": s.listSeasons})
	handle("/groups/{groupId}/seasons/{id}", route{"GET": s.getSeason, "PUT": s.updateSeason})
	handle("/groups/{groupId}/profiles", route{"GET": s.listProfiles, "POST": s.createProfile})
	handle("/groups/{groupId}/profiles/{id}", route{"GET": s.getProfile, "PUT": s.updateProfile})
	handle("/groups/{groupId}/profiles/{id}/avatar", route{"PUT": s.setAvatar, "DELETE": s.deleteAvatar})
	handle("/groups/{groupId}/seasons/{seasonId}/rules", route{"GET": s.listRules, "PUT": s.writeRules})
	handle("/groups/{groupId}/seasons/{seasonId}/rule-moves", route{"GET": s.listRuleMoves, "POST": s.createRuleMove})
	handle("/groups/{groupId}/seasons/{seasonId}/rule-moves/{ruleMoveId}", route{"PUT": s.updateRuleMove})
	handle("/groups/{groupId}/seasons/{seasonId}/players", route{"GET": s.listPlayers})
	handle("/groups/{groupId}/seasons/{seasonId}/players/extended", route{"GET": s.listPlayersExtended})
	handle("/groups/{groupId}/seasons/{seasonId}/players/{id}", route{"DELETE": s.deletePlayer})
	handle("/groups/{groupId}/seasons/{seasonId}/matches", route{"GET": s.listMatches, "POST": s.createMatch})
	handle("/groups/{groupId}/seasons/{seasonId}/matches/extended", route{"GET": s.listMatchesExtended})
	handle("/groups/{groupId}/seasons/{seasonId}/matches/overview", route{"GET": s.listMatchOverviews})
	handle("/groups/{groupId}/seasons/{seasonId}/matches/{id}", route{"GET": s.getMatch, "PUT": s.updateMatch, "DELETE": s.deleteMatch})
	handle("/groups/{groupId}/seasons/{seasonId}/matches/{id}/extended", route{"GET": s.getMatchExtended})
	handle("/groups/{groupId}/seasons/{seasonId}/matches/{id}/overview", route{"GET": s.getMatchOverview})
	handle("/groups/{groupId}/seasons/{seasonId}/matches/{id}/photos/{teamId}", route{"PUT": s.setTeamPhoto, "DELETE": s.deleteTeamPhoto})

	// Anything else is a 404, but /groups/** paths are authenticated first,
	// exactly like Spring Security did before routing.
	mux.Handle("/", s.dispatch(nil))

	// The socket stays outside the Sentry middleware: a connection lives for
	// hours and must not become one endless transaction.
	root := http.NewServeMux()
	root.Handle("/update-socket", s.hub)
	root.Handle("/", sentryhttp.New(sentryhttp.Options{}).Handle(mux))
	return root
}

func (s *Server) dispatch(methods route) http.Handler {
	allowed := make([]string, 0, len(methods))
	for m := range methods {
		allowed = append(allowed, m)
	}
	sort.Strings(allowed)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				internal(fmt.Errorf("panic: %v", rec)).write(w, r, s.log)
			}
		}()
		req := &request{Request: r}
		if isGroupsPath(r.URL.Path) {
			if res := s.authenticate(req); res != nil {
				res.write(w, r, s.log)
				return
			}
		}
		if methods == nil {
			writeSpringError(w, r, http.StatusNotFound)
			return
		}
		method := r.Method
		if method == http.MethodHead {
			method = http.MethodGet
		}
		h, ok := methods[method]
		if !ok {
			w.Header().Set("Allow", strings.Join(allowed, ", "))
			writeSpringError(w, r, http.StatusMethodNotAllowed)
			return
		}
		res := h(req)
		if res == nil {
			res = internalf("handler returned no response")
		}
		res.write(w, r, s.log)
	})
}

// tx runs fn in a transaction. Returning a non-nil response from fn rolls
// back and is passed through; so is an error, as an internal error.
func (s *Server) tx(ctx context.Context, fn func(q *db.Queries) (response, error)) response {
	var res response
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		var err error
		res, err = fn(s.q.WithTx(tx))
		if err != nil {
			return err
		}
		if _, failed := res.(errorCode); failed {
			return errRollback
		}
		if _, failed := res.(springError); failed {
			return errRollback
		}
		return nil
	})
	if err != nil && !errors.Is(err, errRollback) {
		return internal(err)
	}
	return res
}

var errRollback = errors.New("rollback")

// notFound reports whether err is "no row".
func notFound(err error) bool { return errors.Is(err, pgx.ErrNoRows) }

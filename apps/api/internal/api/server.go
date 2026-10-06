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
	"github.com/laurin-notemann/beerpong/api-go/internal/observability"
	"github.com/laurin-notemann/beerpong/api-go/internal/push"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
	"github.com/laurin-notemann/beerpong/api-go/openapi"
)

// Bucket is the object storage the API signs uploads for.
type Bucket interface {
	PublicURL(key string) string
	UploadURL(ctx context.Context, key string) (string, error)
	Delete(ctx context.Context, key string) error
}

type Server struct {
	pool   *pgxpool.Pool
	q      *db.Queries
	tokens *auth.Tokens
	bucket Bucket
	hub    *realtime.Hub
	log    *slog.Logger
	// nil without an APNs key (SetAPNs)
	apns   *push.Client
	pushes *liveScorePushes
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
		pushes: newLiveScorePushes(),
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
	for pattern, methods := range s.routes() {
		mux.Handle(pattern, s.dispatch(methods))
	}
	mux.HandleFunc("GET /v3/api-docs", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(openapi.Spec)
	})

	// Anything else is a 404, but /groups/** paths are authenticated first,
	// exactly like Spring Security did before routing.
	mux.Handle("/", s.dispatch(nil))

	// The socket stays outside the Sentry middleware: a connection lives for
	// hours and must not become one endless transaction.
	root := http.NewServeMux()
	root.Handle("/update-socket", s.hub)
	root.Handle("/", observability.MarkSynthetic(sentryhttp.New(sentryhttp.Options{}).Handle(mux)))
	return springHeaders(root)
}

// springHeaders sets the headers Spring Security put on every response. The
// no-store ones keep the app's HTTP stack from caching API responses.
func springHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate")
		h.Set("Pragma", "no-cache")
		h.Set("Expires", "0")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("X-XSS-Protection", "0")
		next.ServeHTTP(w, r)
	})
}

// routes is every endpoint by path and method. openapi/openapi.json documents
// exactly these (TestSpecMatchesRoutes).
func (s *Server) routes() map[string]route {
	return map[string]route{
		"/healthcheck":                 {"GET": s.healthcheck},
		"/group-presets":               {"GET": s.listPresets},
		"/assets/{id}":                 {"GET": s.getAsset},
		"/auth/signup":                 {"POST": s.signup},
		"/auth/refresh":                {"POST": s.refresh},
		"/elo-simulation":              {"GET": s.eloSimulation, "POST": s.eloSimulation},
		"/elo-simulation/search":       {"GET": s.eloSearch},
		"/elo-simulation/live-matches": {"GET": s.eloLiveMatches},
		"/elo-simulation/replays":      {"GET": s.eloReplays},

		"/groups":                                                           {"GET": s.findGroupByInviteCode, "POST": s.createGroup},
		"/groups/user":                                                      {"GET": s.userGroups},
		"/groups/user/push-tokens":                                          {"PUT": s.putPushTokens},
		"/groups/{id}":                                                      {"GET": s.getGroup, "PUT": s.updateGroup},
		"/groups/{id}/wallpaper":                                            {"PUT": s.setWallpaper, "DELETE": s.deleteWallpaper},
		"/groups/{id}/join":                                                 {"POST": s.joinGroup},
		"/groups/{id}/leave":                                                {"POST": s.leaveGroup},
		"/groups/{groupId}/leaderboard":                                     {"GET": s.leaderboard},
		"/groups/{groupId}/leaderboard/projection":                          {"POST": s.leaderboardProjection},
		"/groups/{groupId}/active-season":                                   {"PUT": s.startSeason},
		"/groups/{groupId}/seasons":                                         {"GET": s.listSeasons},
		"/groups/{groupId}/seasons/{id}":                                    {"GET": s.getSeason, "PUT": s.updateSeason},
		"/groups/{groupId}/profiles":                                        {"GET": s.listProfiles, "POST": s.createProfile},
		"/groups/{groupId}/profiles/{id}":                                   {"GET": s.getProfile, "PUT": s.updateProfile},
		"/groups/{groupId}/profiles/{id}/avatar":                            {"PUT": s.setAvatar, "DELETE": s.deleteAvatar},
		"/groups/{groupId}/profiles/{id}/score-clip":                        {"PUT": s.setScoreClip, "DELETE": s.deleteScoreClip},
		"/groups/{groupId}/live-matches":                                    {"GET": s.listLiveMatches},
		"/groups/{groupId}/live-matches/{id}":                               {"GET": s.getLiveMatch, "PUT": s.createLiveMatch, "DELETE": s.abandonLiveMatch},
		"/groups/{groupId}/live-matches/{id}/ops":                           {"POST": s.appendOps},
		"/groups/{groupId}/live-matches/{id}/finish":                        {"POST": s.finishLiveMatch},
		"/groups/{groupId}/live-matches/{id}/display":                       {"PUT": s.putLiveMatchDisplay},
		"/groups/{groupId}/formations":                                      {"GET": s.listFormations},
		"/groups/{groupId}/formations/{id}":                                 {"PUT": s.putFormation, "DELETE": s.deleteFormation},
		"/groups/{groupId}/seasons/{seasonId}/rules":                        {"GET": s.listRules, "PUT": s.writeRules},
		"/groups/{groupId}/seasons/{seasonId}/rule-moves":                   {"GET": s.listRuleMoves, "POST": s.createRuleMove},
		"/groups/{groupId}/seasons/{seasonId}/rule-moves/{ruleMoveId}":      {"PUT": s.updateRuleMove},
		"/groups/{groupId}/seasons/{seasonId}/players":                      {"GET": s.listPlayers},
		"/groups/{groupId}/seasons/{seasonId}/players/extended":             {"GET": s.listPlayersExtended},
		"/groups/{groupId}/seasons/{seasonId}/players/{id}":                 {"DELETE": s.deletePlayer},
		"/groups/{groupId}/seasons/{seasonId}/matches":                      {"GET": s.listMatches, "POST": s.createMatch},
		"/groups/{groupId}/seasons/{seasonId}/matches/extended":             {"GET": s.listMatchesExtended},
		"/groups/{groupId}/seasons/{seasonId}/matches/overview":             {"GET": s.listMatchOverviews},
		"/groups/{groupId}/seasons/{seasonId}/matches/elo":                  {"GET": s.listMatchElo},
		"/groups/{groupId}/seasons/{seasonId}/matches/{id}":                 {"GET": s.getMatch, "PUT": s.updateMatch, "DELETE": s.deleteMatch},
		"/groups/{groupId}/seasons/{seasonId}/matches/{id}/extended":        {"GET": s.getMatchExtended},
		"/groups/{groupId}/seasons/{seasonId}/matches/{id}/overview":        {"GET": s.getMatchOverview},
		"/groups/{groupId}/seasons/{seasonId}/matches/{id}/photos/{teamId}": {"PUT": s.setTeamPhoto, "DELETE": s.deleteTeamPhoto},
	}
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

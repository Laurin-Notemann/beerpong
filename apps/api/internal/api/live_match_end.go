package api

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/observability"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

// The ways a live match ends: finished into a match, abandoned by a phone, or
// abandoned for being idle. Each one runs under the row lock of the live
// match and announces the end only when it changed something, after commit.

const (
	liveFinished  = "FINISHED"
	liveAbandoned = "ABANDONED"

	liveMatchExpiry         = 6 * time.Hour
	liveMatchExpiryInterval = 10 * time.Minute
)

// endLiveMatch writes the end state of a live match whose row the caller has
// locked and returns it as the end event's body (no ops).
func (s *Server) endLiveMatch(ctx context.Context, q *db.Queries, lm db.LockLiveMatchRow, status string, resultMatchID *string) (liveMatchDTO, error) {
	endedAt := s.now().Truncate(time.Microsecond)
	if err := q.EndLiveMatch(ctx, db.EndLiveMatchParams{ID: lm.LiveMatch.ID, Status: status, EndedAt: &endedAt, ResultMatchID: resultMatchID}); err != nil {
		return liveMatchDTO{}, err
	}
	lm.LiveMatch.Status, lm.LiveMatch.EndedAt, lm.LiveMatch.ResultMatchID = status, &endedAt, resultMatchID
	return toLiveMatchDTO(lm.LiveMatch, lm.CreatedByUserID, nil), nil
}

// withOps adds the stored ops to an ended live match, for the endpoints'
// answers (the event body stays small).
func withOps(ctx context.Context, q *db.Queries, ended liveMatchDTO) (liveMatchDTO, error) {
	ops, err := liveMatchOps(ctx, q, []string{ended.ID})
	ended.Ops = orEmpty(ops[ended.ID])
	return ended, err
}

// finishLiveMatch turns the live match into a regular match, with the same
// validation as POST /matches. The match and the status change are one
// transaction, so any failure leaves the live match in progress. Finishing a
// FINISHED live match returns it as it is (two phones finishing at once get
// the same match), also when its match was deleted since (resultMatchId is
// null then). Only the call that finished it announces anything.
func (s *Server) finishLiveMatch(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	expectedSeq, err := o.long("expectedSeq")
	if err != nil {
		return springError(400)
	}
	in, err := parseMatchInput(body)
	if err != nil {
		return springError(400)
	}
	// live matches have no photos, so a savePhoto from the body must not create assets
	for _, t := range in.teams {
		if t != nil {
			t.savePhoto = false
		}
	}
	groupID, id := r.path("groupId"), r.path("id")

	ctx := r.Context()
	var match matchDTO
	var ended liveMatchDTO
	var finished bool
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		lm, err := q.LockLiveMatch(ctx, db.LockLiveMatchParams{ID: id, GroupID: groupID})
		if notFound(err) {
			return fail(errLiveMatchNotFound), nil
		}
		if err != nil {
			return nil, err
		}
		switch lm.LiveMatch.Status {
		case liveFinished:
			current, err := loadLiveMatchDTO(ctx, q, id)
			return ok(current), err
		case liveInProgress:
		default:
			return fail(errLiveMatchEnded), nil
		}
		if expectedSeq == nil || in.teams == nil {
			return fail(errMatchDtoValidationFailed), nil
		}
		if *expectedSeq != lm.LiveMatch.LastSeq {
			return fail(errLiveMatchStale), nil
		}
		_, sn, res := s.activeSeason(ctx, q, groupID, lm.LiveMatch.SeasonID)
		if res != nil {
			return res, nil
		}
		if match, res, err = s.insertValidMatch(r, q, groupID, sn, uuid.NewString(), in); err != nil || res != nil {
			return res, err
		}
		if ended, err = s.endLiveMatch(ctx, q, lm, liveFinished, &match.ID); err != nil {
			return nil, err
		}
		finished = true
		full, err := withOps(ctx, q, ended)
		return ok(full), err
	})
	if _, isOK := res.(okResponse); isOK && finished {
		s.hub.Publish(groupID, realtime.Matches, "matchCreate", match)
		s.hub.Publish(groupID, realtime.LiveMatches, "liveMatchEnd", ended)
	}
	return res
}

// abandonLiveMatch discards a live match. Repeating it is fine and a FINISHED
// live match stays finished.
func (s *Server) abandonLiveMatch(r *request) response {
	groupID, id := r.path("groupId"), r.path("id")
	ctx := r.Context()
	var ended liveMatchDTO
	var changed bool
	res := s.tx(ctx, func(q *db.Queries) (response, error) {
		lm, err := q.LockLiveMatch(ctx, db.LockLiveMatchParams{ID: id, GroupID: groupID})
		if notFound(err) {
			return fail(errLiveMatchNotFound), nil
		}
		if err != nil {
			return nil, err
		}
		if lm.LiveMatch.Status != liveInProgress {
			current, err := loadLiveMatchDTO(ctx, q, id)
			return ok(current), err
		}
		if ended, err = s.endLiveMatch(ctx, q, lm, liveAbandoned, nil); err != nil {
			return nil, err
		}
		changed = true
		full, err := withOps(ctx, q, ended)
		return ok(full), err
	})
	if _, isOK := res.(okResponse); isOK && changed {
		s.hub.Publish(groupID, realtime.LiveMatches, "liveMatchEnd", ended)
	}
	return res
}

// RunLiveMatchExpiry abandons idle live matches until ctx is done: once at
// start, then every 10 minutes. A failure is logged and reported, and the
// next round tries again.
func (s *Server) RunLiveMatchExpiry(ctx context.Context) {
	ticker := time.NewTicker(liveMatchExpiryInterval)
	defer ticker.Stop()
	for {
		s.expiryRound(ctx)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

// expiryRound is one scan. A panic is logged and reported like a handler's, so
// it costs this round and not the API process.
func (s *Server) expiryRound(ctx context.Context) {
	defer func() {
		if rec := recover(); rec != nil {
			err := fmt.Errorf("live match expiry panic: %v", rec)
			s.log.ErrorContext(ctx, "live match expiry failed", "err", err)
			observability.CaptureError(ctx, err)
		}
	}()
	n, err := s.AbandonExpiredLiveMatches(ctx, s.now())
	if err != nil && ctx.Err() == nil {
		s.log.ErrorContext(ctx, "live match expiry failed", "err", err)
		observability.CaptureError(ctx, err)
	}
	if n > 0 {
		s.log.InfoContext(ctx, "abandoned expired live matches", "count", n)
	}
}

// AbandonExpiredLiveMatches abandons the in-progress live matches that had no
// activity for six hours as of now and returns how many it ended. One failing
// match does not stop the others; their errors are joined.
func (s *Server) AbandonExpiredLiveMatches(ctx context.Context, now time.Time) (int, error) {
	cutoff := now.Add(-liveMatchExpiry)
	stale, err := s.q.StaleLiveMatches(ctx, cutoff)
	if err != nil {
		return 0, err
	}
	return s.abandonStale(ctx, stale, cutoff)
}

// abandonStale runs abandonIfExpired for the scan's candidates. Tests call it
// with the candidates of their own group only.
func (s *Server) abandonStale(ctx context.Context, stale []db.StaleLiveMatchesRow, cutoff time.Time) (int, error) {
	var errs []error
	n := 0
	for _, c := range stale {
		abandoned, err := s.abandonIfExpired(ctx, c.ID, c.GroupID, cutoff)
		if err != nil {
			errs = append(errs, err)
		}
		if abandoned {
			n++
		}
	}
	return n, errors.Join(errs...)
}

// abandonIfExpired decides on the row as it is under its lock: an op appended
// since the scan keeps the live match alive, and a live match that ended in
// the meantime is left alone.
func (s *Server) abandonIfExpired(ctx context.Context, id, groupID string, cutoff time.Time) (bool, error) {
	var ended liveMatchDTO
	var changed bool
	err := pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		q := s.q.WithTx(tx)
		lm, err := q.LockLiveMatch(ctx, db.LockLiveMatchParams{ID: id, GroupID: groupID})
		if notFound(err) {
			return nil
		}
		if err != nil {
			return err
		}
		if lm.LiveMatch.Status != liveInProgress || !lm.LiveMatch.LastActivityAt.Before(cutoff) {
			return nil
		}
		if ended, err = s.endLiveMatch(ctx, q, lm, liveAbandoned, nil); err != nil {
			return err
		}
		changed = true
		return nil
	})
	if err != nil {
		return false, err
	}
	if changed {
		s.hub.Publish(groupID, realtime.LiveMatches, "liveMatchEnd", ended)
	}
	return changed, nil
}

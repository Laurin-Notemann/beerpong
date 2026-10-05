package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/observability"
	"github.com/laurin-notemann/beerpong/api-go/internal/push"
)

// Live scores outside the app. The score of a live match is computed by the
// app (its reducer is the only one), so phones report it with PUT .../display
// at the seq they computed it for. The API keeps the newest one and pushes it:
// the first starts a Live Activity on every group member's iPhone (push-to-start
// with a broadcast channel per live match), later ones are broadcast on that
// channel, and the end ends them. Every change also sends the group's phones a
// silent push with the scores of the matches running, for the home screen widget.

const (
	// what the app's Live Activity is called (createLiveActivity) and its
	// attributes' type in expo-widgets
	liveActivityName       = "LiveMatchActivity"
	liveActivityAttributes = "LiveActivityAttributes"
	// how long a finished match's score stays on the Lock Screen
	finishedActivityDismissal = 15 * time.Minute
	// the most matches a widget push carries; the widget shows fewer
	maxWidgetMatches = 4
	maxNamesLength   = 200
	maxScore         = 1000
	maxTokenLength   = 512
)

// liveScoreDTO is a live match's score as the app shows it.
type liveScoreDTO struct {
	BlueNames string `json:"blueNames"`
	BlueScore int32  `json:"blueScore"`
	RedNames  string `json:"redNames"`
	RedScore  int32  `json:"redScore"`
}

type liveScoreResultDTO struct {
	// false if the score wasn't computed at the newest op, or the match ended
	Accepted bool `json:"accepted"`
}

type pushTokensDTO struct {
	DeviceToken        *string `json:"deviceToken"`
	ActivityStartToken *string `json:"activityStartToken"`
}

// SetAPNs turns pushes on. Without it (no key configured) nothing is pushed.
func (s *Server) SetAPNs(client *push.Client) {
	s.apns = client
}

// ---- endpoints ----

// putPushTokens stores the calling phone's push tokens. A null token is
// forgotten: no activity start token means Live Activities are off.
func (s *Server) putPushTokens(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	device, err := o.str("deviceToken")
	if err != nil {
		return springError(400)
	}
	start, err := o.str("activityStartToken")
	if err != nil {
		return springError(400)
	}
	if !isPushToken(device) || !isPushToken(start) {
		return fail(errInvalidPushToken)
	}
	if err := s.q.UpsertPushTokens(r.Context(), db.UpsertPushTokensParams{
		UserID: r.userID, DeviceToken: device, ActivityStartToken: start, UpdatedAt: s.now(),
	}); err != nil {
		return internal(err)
	}
	return ok(pushTokensDTO{DeviceToken: device, ActivityStartToken: start})
}

func isPushToken(token *string) bool {
	if token == nil {
		return true
	}
	t := *token
	return t != "" && len(t) <= maxTokenLength && strings.Trim(t, "0123456789abcdefABCDEF") == ""
}

// putLiveMatchDisplay keeps a phone's score of the live match if it was
// computed at the newest op. Phones that are behind are told so and change
// nothing, so two phones scoring at once can't push an older score.
func (s *Server) putLiveMatchDisplay(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	seq, err := o.long("seq")
	if err != nil {
		return springError(400)
	}
	blueNames, err1 := o.str("blueNames")
	redNames, err2 := o.str("redNames")
	blueScore, err3 := o.integer("blueScore")
	redScore, err4 := o.integer("redScore")
	if err := errors.Join(err1, err2, err3, err4); err != nil {
		return springError(400)
	}
	if seq == nil || blueNames == nil || redNames == nil || blueScore == nil || redScore == nil ||
		len(*blueNames) > maxNamesLength || len(*redNames) > maxNamesLength ||
		*blueScore < 0 || *blueScore > maxScore || *redScore < 0 || *redScore > maxScore {
		return fail(errLiveMatchInvalidDisplay)
	}
	score, err := json.Marshal(liveScoreDTO{BlueNames: *blueNames, BlueScore: *blueScore, RedNames: *redNames, RedScore: *redScore})
	if err != nil {
		return internal(err)
	}

	groupID, id := r.path("groupId"), r.path("id")
	ctx := r.Context()
	var changed bool
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		lm, err := q.LockLiveMatch(ctx, db.LockLiveMatchParams{ID: id, GroupID: groupID})
		if notFound(err) {
			return fail(errLiveMatchNotFound), nil
		}
		if err != nil {
			return nil, err
		}
		m := lm.LiveMatch
		current := m.Status == liveInProgress && *seq == m.LastSeq && (m.DisplaySeq == nil || *seq >= *m.DisplaySeq)
		if !current {
			return ok(liveScoreResultDTO{Accepted: false}), nil
		}
		if m.Display != nil && *m.Display == string(score) {
			return ok(liveScoreResultDTO{Accepted: true}), nil
		}
		if err := q.SetLiveMatchDisplay(ctx, db.SetLiveMatchDisplayParams{ID: id, Display: ptr(string(score)), DisplaySeq: seq}); err != nil {
			return nil, err
		}
		changed = true
		return ok(liveScoreResultDTO{Accepted: true}), nil
	})
	if changed {
		s.queueLiveScore(groupID, id)
	}
	return res
}

// ---- pushes ----

// liveScorePushes is the queue of live matches whose score changed. A match
// queued twice before it's pushed is pushed once, with its newest state.
type liveScorePushes struct {
	mu     sync.Mutex
	queued map[string]string // live match id -> group id
	order  []string
	wake   chan struct{}
}

func newLiveScorePushes() *liveScorePushes {
	return &liveScorePushes{queued: map[string]string{}, wake: make(chan struct{}, 1)}
}

// queueLiveScore schedules the pushes for a live match whose score, or status,
// changed. Call it after the change is committed.
func (s *Server) queueLiveScore(groupID, id string) {
	if s.apns == nil {
		return
	}
	p := s.pushes
	p.mu.Lock()
	if _, found := p.queued[id]; !found {
		p.order = append(p.order, id)
	}
	p.queued[id] = groupID
	p.mu.Unlock()
	select {
	case p.wake <- struct{}{}:
	default:
	}
}

func (p *liveScorePushes) next() (id, groupID string, found bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if len(p.order) == 0 {
		return "", "", false
	}
	id, p.order = p.order[0], p.order[1:]
	groupID = p.queued[id]
	delete(p.queued, id)
	return id, groupID, true
}

// RunLiveScorePushes sends the queued pushes, one live match at a time, until
// ctx is done. A failure is logged and reported; the next change tries again.
func (s *Server) RunLiveScorePushes(ctx context.Context) {
	if s.apns == nil {
		return
	}
	for {
		select {
		case <-ctx.Done():
			return
		case <-s.pushes.wake:
		}
		for {
			id, groupID, found := s.pushes.next()
			if !found {
				break
			}
			if err := s.pushLiveScore(ctx, groupID, id); err != nil && ctx.Err() == nil {
				s.log.ErrorContext(ctx, "live score push failed", "liveMatchId", id, "err", err)
				observability.CaptureError(ctx, err)
			}
		}
	}
}

func (s *Server) pushLiveScore(ctx context.Context, groupID, id string) (err error) {
	defer func() {
		if rec := recover(); rec != nil {
			err = fmt.Errorf("live score push panic: %v", rec)
		}
	}()
	row, err := s.q.GetLiveMatch(ctx, id)
	if err != nil {
		return err
	}
	lm := row.LiveMatch
	tokens, err := s.q.GroupPushTokens(ctx, &groupID)
	if err != nil {
		return err
	}
	var score *liveScoreDTO
	if lm.Display != nil {
		score = new(liveScoreDTO)
		if err := json.Unmarshal([]byte(*lm.Display), score); err != nil {
			return err
		}
	}

	var errs []error
	switch {
	case lm.Status == liveInProgress && score != nil && lm.ActivityChannel == nil:
		errs = append(errs, s.startActivities(ctx, lm, *score, tokens))
	case lm.Status == liveInProgress && score != nil:
		errs = append(errs, s.apns.Broadcast(ctx, *lm.ActivityChannel, activityPayload("update", lm, *score)))
	case lm.Status != liveInProgress && lm.ActivityChannel != nil && !lm.ActivityEnded:
		errs = append(errs, s.endActivities(ctx, lm, score))
	}
	errs = append(errs, s.pushWidgets(ctx, groupID, tokens))
	return errors.Join(errs...)
}

// startActivities opens the live match's channel and starts its Live Activity
// on every group member's phone that has Live Activities on.
func (s *Server) startActivities(ctx context.Context, lm db.LiveMatch, score liveScoreDTO, tokens []db.GroupPushTokensRow) error {
	channel, err := s.apns.CreateChannel(ctx)
	if err != nil {
		return err
	}
	if _, err := s.q.SetLiveMatchActivityChannel(ctx, db.SetLiveMatchActivityChannelParams{ID: lm.ID, ActivityChannel: &channel}); err != nil {
		return err
	}
	payload := activityPayload("start", lm, score)
	aps := payload["aps"].(map[string]any)
	aps["input-push-channel"] = channel
	aps["attributes-type"] = liveActivityAttributes
	aps["attributes"] = map[string]any{"url": liveMatchURL(lm)}
	aps["alert"] = map[string]any{"title": "Live match", "body": score.BlueNames + " vs " + score.RedNames}

	var errs []error
	for _, t := range tokens {
		if t.ActivityStartToken == nil {
			continue
		}
		err := s.apns.Send(ctx, *t.ActivityStartToken, push.LiveActivity, payload)
		if errors.Is(err, push.ErrBadToken) {
			err = s.q.ForgetActivityStartToken(ctx, db.ForgetActivityStartTokenParams{UserID: t.UserID, ActivityStartToken: t.ActivityStartToken})
		}
		errs = append(errs, err)
	}
	return errors.Join(errs...)
}

// endActivities ends the live match's Live Activities: a finished one shows its
// final score for a while, a discarded one goes away. Then the channel is freed.
func (s *Server) endActivities(ctx context.Context, lm db.LiveMatch, score *liveScoreDTO) error {
	final := liveScoreDTO{}
	if score != nil {
		final = *score
	}
	payload := activityPayload("end", lm, final)
	dismissal := s.now()
	if lm.Status == liveFinished {
		dismissal = dismissal.Add(finishedActivityDismissal)
	}
	payload["aps"].(map[string]any)["dismissal-date"] = dismissal.Unix()
	if err := s.apns.Broadcast(ctx, *lm.ActivityChannel, payload); err != nil {
		return err
	}
	if err := s.q.SetLiveMatchActivityEnded(ctx, lm.ID); err != nil {
		return err
	}
	// phones that are offline get the end from the channel's stored message
	channel := *lm.ActivityChannel
	time.AfterFunc(10*time.Minute, func() {
		ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
		defer cancel()
		if err := s.apns.DeleteChannel(ctx, channel); err != nil {
			s.log.WarnContext(ctx, "deleting a live activity channel failed", "err", err)
		}
	})
	return nil
}

// activityPayload is an ActivityKit push whose content state is what
// expo-widgets renders: the activity's name and its props as JSON.
func activityPayload(event string, lm db.LiveMatch, score liveScoreDTO) map[string]any {
	props, _ := json.Marshal(map[string]any{
		"blueNames": score.BlueNames,
		"blueScore": score.BlueScore,
		"redNames":  score.RedNames,
		"redScore":  score.RedScore,
		"startedAt": lm.StartedAt.UnixMilli(),
		"finished":  lm.Status == liveFinished,
	})
	return map[string]any{"aps": map[string]any{
		"event":         event,
		"timestamp":     time.Now().Unix(),
		"content-state": map[string]any{"name": liveActivityName, "props": string(props)},
	}}
}

func liveMatchURL(lm db.LiveMatch) string {
	return "versus://liveMatch?" + url.Values{"id": {lm.ID}, "groupId": {lm.GroupID}}.Encode()
}

// pushWidgets sends the group's phones the scores of its matches running now.
// It's a silent push: iOS wakes the app for a moment to update the widget, as
// often as it allows.
func (s *Server) pushWidgets(ctx context.Context, groupID string, tokens []db.GroupPushTokensRow) error {
	rows, err := s.q.InProgressLiveMatchesByGroup(ctx, groupID)
	if err != nil {
		return err
	}
	matches := []map[string]any{}
	for _, row := range rows {
		lm := row.LiveMatch
		var score liveScoreDTO
		if lm.Display == nil || json.Unmarshal([]byte(*lm.Display), &score) != nil {
			continue
		}
		matches = append(matches, map[string]any{
			"id":        lm.ID,
			"blueNames": score.BlueNames,
			"blueScore": score.BlueScore,
			"redNames":  score.RedNames,
			"redScore":  score.RedScore,
			"startedAt": lm.StartedAt.UnixMilli(),
		})
		if len(matches) == maxWidgetMatches {
			break
		}
	}
	payload := map[string]any{
		"aps":        map[string]any{"content-available": 1},
		"liveScores": map[string]any{"groupId": groupID, "matches": matches},
	}

	var errs []error
	for _, t := range tokens {
		if t.DeviceToken == nil {
			continue
		}
		err := s.apns.Send(ctx, *t.DeviceToken, push.Background, payload)
		if errors.Is(err, push.ErrBadToken) {
			err = s.q.ForgetDeviceToken(ctx, db.ForgetDeviceTokenParams{UserID: t.UserID, DeviceToken: t.DeviceToken})
		}
		errs = append(errs, err)
	}
	return errors.Join(errs...)
}

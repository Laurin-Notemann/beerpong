package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/leaderboard"
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
	// the most matches a widget push carries, and moves per match; a silent
	// push can be at most 4 KB
	maxWidgetMatches = 4
	maxWidgetMoves   = 6
	maxPushBytes     = 4000
	maxNamesLength   = 200
	maxScore         = 1000
	maxTokenLength   = 512
)

// liveScoreDTO is a live match's score as the app shows it, and what the
// "Live matches" widget shows with it.
type liveScoreDTO struct {
	BlueNames string `json:"blueNames"`
	BlueScore int32  `json:"blueScore"`
	RedNames  string `json:"redNames"`
	RedScore  int32  `json:"redScore"`
	// the teams as the match would be entered now, for the players' live Elo
	Teams   json.RawMessage `json:"teams,omitempty"`
	Players []livePlayerDTO `json:"players,omitempty"`
	// the cup hits so far, newest first
	Moves []liveMoveDTO `json:"moves,omitempty"`
}

type livePlayerDTO struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Team string `json:"team"`
}

type liveMoveDTO struct {
	Name string `json:"name"`
	Team string `json:"team"`
	Move string `json:"move"`
	// the score right after it, e.g. "2–0"
	Score string `json:"score,omitempty"`
}

const (
	maxLivePlayers = 20
	maxLiveMoves   = 10
	maxLiveText    = 100
)

// decodeJSONNumbers is json.Unmarshal into any, with numbers kept as json.Number
// like readJSON, so the request binders read them.
func decodeJSONNumbers(raw []byte) (any, error) {
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.UseNumber()
	var v any
	return v, dec.Decode(&v)
}

// liveDetails reads a display's optional teams, players and moves. ok is false
// if one is there but malformed.
func liveDetails(o object, now time.Time) (teams json.RawMessage, players []livePlayerDTO, moves []liveMoveDTO, valid bool) {
	if raw := o["teams"]; raw != nil {
		if _, err := parseProjectedMatch(map[string]any{"teams": raw}, "display", now); err != nil {
			return nil, nil, nil, false
		}
		var err error
		if teams, err = json.Marshal(raw); err != nil {
			return nil, nil, nil, false
		}
	}
	text := func(s string) bool { return len(s) <= maxLiveText }
	team := func(s string) bool { return s == "red" || s == "blue" }
	if raw := o["players"]; raw != nil {
		b, _ := json.Marshal(raw)
		if json.Unmarshal(b, &players) != nil || len(players) > maxLivePlayers {
			return nil, nil, nil, false
		}
		for _, p := range players {
			if !isUUID(p.ID) || !text(p.Name) || !team(p.Team) {
				return nil, nil, nil, false
			}
		}
	}
	if raw := o["moves"]; raw != nil {
		b, _ := json.Marshal(raw)
		if json.Unmarshal(b, &moves) != nil || len(moves) > maxLiveMoves {
			return nil, nil, nil, false
		}
		for _, m := range moves {
			if !text(m.Name) || !text(m.Move) || !team(m.Team) || !text(m.Score) {
				return nil, nil, nil, false
			}
		}
	}
	return teams, players, moves, true
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
	teams, players, moves, valid := liveDetails(o, s.now())
	if !valid {
		return fail(errLiveMatchInvalidDisplay)
	}
	display := liveScoreDTO{
		BlueNames: *blueNames, BlueScore: *blueScore, RedNames: *redNames, RedScore: *redScore,
		Teams: teams, Players: players, Moves: moves,
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
		// a phone on an older app version reports no details; at the same seq the ones another
		// phone reported still hold
		if display.Players == nil && m.Display != nil && m.DisplaySeq != nil && *m.DisplaySeq == *seq {
			var stored liveScoreDTO
			if json.Unmarshal([]byte(*m.Display), &stored) == nil {
				display.Teams, display.Players, display.Moves = stored.Teams, stored.Players, stored.Moves
			}
		}
		score, err := json.Marshal(display)
		if err != nil {
			return nil, err
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

// pushWidgets sends the group's phones the scores of its matches running now,
// with their players' live Elo and their moves. It's a silent push: iOS wakes
// the app for a moment to update the "Live matches" widget, as often as it
// allows.
func (s *Server) pushWidgets(ctx context.Context, groupID string, tokens []db.GroupPushTokensRow) error {
	rows, err := s.q.InProgressLiveMatchesByGroup(ctx, groupID)
	if err != nil {
		return err
	}
	type running struct {
		lm    db.LiveMatch
		score liveScoreDTO
	}
	var live []running
	for _, row := range rows {
		var score liveScoreDTO
		if row.LiveMatch.Display == nil || json.Unmarshal([]byte(*row.LiveMatch.Display), &score) != nil {
			continue
		}
		live = append(live, running{row.LiveMatch, score})
		if len(live) == maxWidgetMatches {
			break
		}
	}

	// the live Elo: the season's ratings as if the running matches ended now,
	// like the TV's leaderboard
	var projected []projectedLive
	for _, m := range live {
		projected = append(projected, projectedLive{seasonID: m.lm.SeasonID, teams: m.score.Teams})
	}
	elo, err := s.liveEloChanges(ctx, groupID, projected)
	if err != nil {
		// the scores still go out, without the Elo
		s.log.WarnContext(ctx, "live Elo for the widget failed", "groupId", groupID, "err", err)
		observability.CaptureError(ctx, err)
	}

	matches := []map[string]any{}
	for _, m := range live {
		players := []map[string]any{}
		for _, p := range m.score.Players {
			player := map[string]any{"name": p.Name, "team": p.Team}
			if change, found := elo[p.ID]; found {
				player["elo"] = int(math.Round(change))
			}
			players = append(players, player)
		}
		moves := m.score.Moves
		if len(moves) > maxWidgetMoves {
			moves = moves[:maxWidgetMoves]
		}
		matches = append(matches, map[string]any{
			"id":        m.lm.ID,
			"blueNames": m.score.BlueNames,
			"blueScore": m.score.BlueScore,
			"redNames":  m.score.RedNames,
			"redScore":  m.score.RedScore,
			"startedAt": m.lm.StartedAt.UnixMilli(),
			"players":   players,
			"moves":     moves,
		})
	}
	payload := map[string]any{
		"aps":        map[string]any{"content-available": 1},
		"liveScores": map[string]any{"groupId": groupID, "matches": matches},
	}
	// APNs refuses a payload over 4 KB: without the moves, then without the players
	for _, details := range []string{"moves", "players"} {
		if b, _ := json.Marshal(payload); len(b) <= maxPushBytes {
			break
		}
		for _, m := range matches {
			delete(m, details)
		}
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

type projectedLive struct {
	seasonID string
	teams    json.RawMessage
}

// liveEloChanges is how much each player's season Elo would change if the
// group's running matches ended now (by player id): the leaderboard projection
// the TV shows. Matches of another season than the running one, or without
// teams, don't count.
func (s *Server) liveEloChanges(ctx context.Context, groupID string, live []projectedLive) (map[string]float64, error) {
	g, err := s.q.GetGroup(ctx, groupID)
	if err != nil {
		return nil, err
	}
	group := toGroupDTO(g)
	if group.ActiveSeasonID == nil {
		return nil, nil
	}
	var matches []leaderboard.Match
	for i, m := range live {
		if m.seasonID != *group.ActiveSeasonID || len(m.teams) == 0 {
			continue
		}
		teams, err := decodeJSONNumbers(m.teams)
		if err != nil {
			return nil, err
		}
		match, err := parseProjectedMatch(map[string]any{"teams": teams}, fmt.Sprintf("projected-%d", i), s.now())
		if err != nil {
			return nil, err
		}
		matches = append(matches, match)
	}
	if len(matches) == 0 {
		return nil, nil
	}
	board := func(projected ...leaderboard.Match) (map[string]float64, error) {
		b, res := s.leaderboardFor(ctx, s.q, group, "season", false, *group.ActiveSeasonID, nil, projected...)
		if res != nil {
			return nil, fmt.Errorf("leaderboard for the live Elo: %v", res)
		}
		out := map[string]float64{}
		for _, e := range b.active {
			out[e.Player.ID] = e.Stats.Elo
		}
		return out, nil
	}
	before, err := board()
	if err != nil {
		return nil, err
	}
	after, err := board(matches...)
	if err != nil {
		return nil, err
	}
	changes := map[string]float64{}
	for _, m := range matches {
		for _, member := range m.Members {
			old, found := before[member.PlayerID]
			if !found {
				// a player's first match starts them at the starting Elo
				old = leaderboard.StartingElo
			}
			if now, found := after[member.PlayerID]; found {
				changes[member.PlayerID] = now - old
			}
		}
	}
	return changes, nil
}

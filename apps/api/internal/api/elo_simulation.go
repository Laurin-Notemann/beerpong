package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"math"
	"net/http"
	"slices"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/leaderboard"
)

// The Elo simulator (beerpong-var): a group's seasons computed by the
// leaderboard's own code, with other Elo weights, made-up test games and
// every game's breakdown. Nothing is stored. Like joining, it needs only the
// group's invite code.

type eloParamsDTO struct {
	K          float64 `json:"k"`
	KR         float64 `json:"kr"`
	RingWeight float64 `json:"ringWeight"`
	Swing      float64 `json:"swing"`
	Spread     float64 `json:"spread"`
}

func toEloParamsDTO(p leaderboard.EloParams) eloParamsDTO {
	return eloParamsDTO{K: p.K, KR: p.KR, RingWeight: p.RingWeight, Swing: p.Swing, Spread: p.Spread}
}

type eloScoreDTO struct {
	LogLoss float64 `json:"logLoss"`
	Correct float64 `json:"correct"`
	Called  int     `json:"called"`
	Games   int     `json:"games"`
}

func toEloScoreDTO(s leaderboard.Score) eloScoreDTO {
	return eloScoreDTO{LogLoss: s.LogLoss, Correct: s.Correct, Called: s.Called, Games: s.Games}
}

type eloSimulationDTO struct {
	GroupID   string  `json:"groupId"`
	GroupName *string `json:"groupName"`
	// Defaults are the season's weights, as its settings have them
	Defaults eloParamsDTO   `json:"defaults"`
	Params   eloParamsDTO   `json:"params"`
	Seasons  []eloSeasonDTO `json:"seasons"`
	SeasonID *string        `json:"seasonId"`
	// Baseline is what the standings compare with: "storedGames" (the same
	// weights without test and live games) when the request has any, else
	// "defaults" (the season's weights).
	Baseline   string           `json:"baseline"`
	Standings  []eloStandingDTO `json:"standings"`
	Games      []eloGameDTO     `json:"games"`
	Prediction eloPredictionDTO `json:"prediction"`
	// what a test game can be made of: the season's moves, and the group's
	// players who weren't removed
	Moves    []eloRuleMoveDTO `json:"moves"`
	Profiles []eloProfileDTO  `json:"profiles"`
	// Replay is the game the request's replay asked for, once after every
	// step and last as stored; empty without one
	Replay []eloGameDTO `json:"replay"`
}

type eloSeasonDTO struct {
	ID                  string       `json:"id"`
	Name                *string      `json:"name"`
	NumMatches          int          `json:"numMatches"`
	MinMatchesToQualify int32        `json:"minMatchesToQualify"`
	Elo                 eloParamsDTO `json:"elo"`
}

type eloRuleMoveDTO struct {
	ID              string `json:"id"`
	Name            string `json:"name"`
	PointsForScorer int32  `json:"pointsForScorer"`
	PointsForTeam   int32  `json:"pointsForTeam"`
	Finishing       bool   `json:"finishing"`
}

type eloProfileDTO struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type eloPredictionDTO struct {
	Params eloScoreDTO `json:"params"`
	// Defaults: every season with its own weights
	Defaults eloScoreDTO `json:"defaults"`
}

// eloStandingDTO is a row of the leaderboard as the app shows it: active
// players, the ones with the season's minimum of matches ranked first.
type eloStandingDTO struct {
	ProfileID string  `json:"profileId"`
	Name      string  `json:"name"`
	Elo       float64 `json:"elo"`
	Rank      *int    `json:"rank"` // nil while unranked
	// the same player in the baseline; nil when they only played test games
	// or were unranked there
	BaselineElo  *float64 `json:"baselineElo"`
	BaselineRank *int     `json:"baselineRank"`
	Matches      int64    `json:"matches"`
	Wins         int64    `json:"wins"`
	Points       int64    `json:"points"`
	Result       float64  `json:"result"`  // sum of the team results
	Hitting      float64  `json:"hitting"` // sum of the hitting changes
}

type eloGameDTO struct {
	MatchID string `json:"matchId"`
	// TestIndex is the test game's place in the request; nil for other games
	TestIndex *int `json:"testIndex"`
	// LiveMatchID is the live match a running game is, counted as if it ended
	// now; nil for other games
	LiveMatchID *string   `json:"liveMatchId"`
	Date        time.Time `json:"date"`
	// Points: own points both teams scored, what the shares are of
	Points int64 `json:"points"`
	// FullPoints: own points of an average full game before this one; an
	// average player scores FullPoints / 2 / team size
	FullPoints float64 `json:"fullPoints"`
	// Ring is what the result counted: more than 1 for a ring win
	Ring       float64      `json:"ring"`
	Finisher   string       `json:"finisher"`
	FinishMove string       `json:"finishMove"`
	Teams      []eloTeamDTO `json:"teams"`
}

type eloTeamDTO struct {
	Won       bool    `json:"won"`
	WinChance float64 `json:"winChance"`
	// Share of the game's own points, set before it
	Share     float64        `json:"share"`
	Points    int64          `json:"points"`
	AvgPoints float64        `json:"avgPoints"`
	Cups      int64          `json:"cups"`
	Players   []eloPlayerDTO `json:"players"`
}

type eloPlayerDTO struct {
	ProfileID string  `json:"profileId"`
	Name      string  `json:"name"`
	Points    int64   `json:"points"`
	Own       int64   `json:"own"`
	Before    float64 `json:"before"`
	After     float64 `json:"after"`
	Result    float64 `json:"result"`
	Hitting   float64 `json:"hitting"`
	// Share of the game's own points, set before it; Expected is Share ×
	// the game's points
	Share    float64      `json:"share"`
	Expected float64      `json:"expected"`
	Moves    []eloMoveDTO `json:"moves"`
}

type eloMoveDTO struct {
	Name  string `json:"name"`
	Count int32  `json:"count"`
}

type eloSearchDTO struct {
	Params     eloParamsDTO `json:"params"`
	Prediction eloScoreDTO  `json:"prediction"`
	Tried      int          `json:"tried"`
}

// eloGroup is a group's seasons, oldest first, ready to compute.
type eloGroup struct {
	group    groupDTO
	seasons  []eloSeasonDTO
	inputs   []leaderboardInput
	profiles map[string]string // name by profile id
	// playing are the profiles with a player that wasn't removed from its
	// season; removing a player in the app keeps the profile
	playing map[string]bool
}

// eloGroupByCode is the group of the request's invite code.
func (s *Server) eloGroupByCode(ctx context.Context, r *request) (db.Group, response) {
	code := strings.Join(r.URL.Query()["inviteCode"], ",")
	if javaTrimEmpty(code) {
		return db.Group{}, fail(errInvalidGroupInviteCode)
	}
	row, err := s.q.GetGroupByInviteCode(ctx, &code)
	if notFound(err) {
		return db.Group{}, fail(errGroupInviteNotFound)
	}
	if err != nil {
		return db.Group{}, internal(err)
	}
	return row, nil
}

func (s *Server) loadEloGroup(ctx context.Context, r *request) (eloGroup, response) {
	row, res := s.eloGroupByCode(ctx, r)
	if res != nil {
		return eloGroup{}, res
	}
	g := eloGroup{group: toGroupDTO(row), profiles: map[string]string{}, playing: map[string]bool{}}
	seasons, err := s.q.SeasonsByGroup(ctx, &row.ID)
	if err != nil {
		return eloGroup{}, internal(err)
	}
	// oldest first; the running season was updated last, so its row isn't
	sort.SliceStable(seasons, func(i, j int) bool {
		a, b := seasons[i].StartDate, seasons[j].StartDate
		return a != nil && (b == nil || a.Before(*b))
	})
	inputs, err := s.groupInputs(ctx, s.q, g.group, seasons, nil)
	if err != nil {
		return eloGroup{}, internal(err)
	}
	for i, sn := range seasons {
		li := inputs[i]
		weights := eloWeights{K: sn.EloK, KR: sn.EloKr, RingWeight: sn.EloRingWeight, Swing: sn.EloSwing, Spread: sn.EloSpread}
		g.seasons = append(g.seasons, eloSeasonDTO{
			ID: sn.ID, Name: sn.Name, NumMatches: len(li.matches), MinMatchesToQualify: deref(sn.MinMatchesToQualify),
			Elo: toEloParamsDTO(weights.params()),
		})
		g.inputs = append(g.inputs, li)
		for _, p := range li.in.Players {
			if p.Active && p.ProfileID != nil {
				g.playing[*p.ProfileID] = true
			}
		}
	}
	profiles, err := s.q.ProfilesByGroup(ctx, &row.ID)
	if err != nil {
		return eloGroup{}, internal(err)
	}
	for _, p := range profiles {
		g.profiles[p.ID] = deref(p.Name)
	}
	return g, nil
}

func (g eloGroup) allInputs() []leaderboard.Input {
	out := make([]leaderboard.Input, len(g.inputs))
	for i, li := range g.inputs {
		out[i] = li.in
	}
	return out
}

// eloSimulation answers /elo-simulation: one season with the given weights
// (the defaults for any left out) and, with POST, test games, plus the
// prediction score over every season's real games.
func (s *Server) eloSimulation(r *request) response {
	ctx := r.Context()
	g, res := s.loadEloGroup(ctx, r)
	if res != nil {
		return res
	}
	si := g.pickSeason(r.URL.Query().Get("seasonId"))
	stored := leaderboard.DefaultElo
	if si >= 0 {
		stored = g.inputs[si].elo
	}
	params, valid := eloParamsFromQuery(r, stored)
	if !valid {
		return springError(400)
	}
	tests, live, replay, res := readExtraGames(r, time.Now())
	if res != nil {
		return res
	}

	out := eloSimulationDTO{
		GroupID: g.group.ID, GroupName: g.group.Name,
		Defaults: toEloParamsDTO(stored), Params: toEloParamsDTO(params),
		Seasons: g.seasons, Baseline: "defaults", Standings: []eloStandingDTO{}, Games: []eloGameDTO{},
		Moves: []eloRuleMoveDTO{}, Profiles: []eloProfileDTO{}, Replay: []eloGameDTO{},
	}
	if out.Seasons == nil {
		out.Seasons = []eloSeasonDTO{}
	}
	for id, name := range g.profiles {
		if g.playing[id] {
			out.Profiles = append(out.Profiles, eloProfileDTO{ID: id, Name: name})
		}
	}
	sort.Slice(out.Profiles, func(i, j int) bool { return out.Profiles[i].Name < out.Profiles[j].Name })
	all := g.allInputs()
	predicted, err := leaderboard.Predict(all, &params)
	if err != nil {
		return internal(err)
	}
	defaults, err := leaderboard.Predict(all, nil)
	if err != nil {
		return internal(err)
	}
	out.Prediction = eloPredictionDTO{Params: toEloScoreDTO(predicted), Defaults: toEloScoreDTO(defaults)}

	if si < 0 {
		if len(tests) > 0 {
			return fail(errEloInvalidTestGame)
		}
		return ok(out)
	}
	sn := g.seasons[si]
	out.SeasonID = &sn.ID
	li := g.inputs[si]
	seasonMoves, err := s.q.RuleMovesBySeason(ctx, &sn.ID)
	if err != nil {
		return internal(err)
	}
	moves := map[string]db.RuleMove{}
	for id, m := range li.ruleMoves {
		moves[id] = m
	}
	for _, m := range seasonMoves {
		moves[m.ID] = m
		out.Moves = append(out.Moves, eloRuleMoveDTO{ID: m.ID, Name: deref(m.Name), PointsForScorer: m.PointsForScorer,
			PointsForTeam: m.PointsForTeam, Finishing: m.FinishingMove})
	}

	// only the season's live matches that are still running count
	if len(live) > 0 {
		running, err := s.inProgressLiveMatches(ctx, g.group.ID)
		if err != nil {
			return internal(err)
		}
		seasonOf := map[string]string{}
		for _, lm := range running {
			seasonOf[lm.ID] = lm.SeasonID
		}
		live = slices.DeleteFunc(live, func(m eloLiveGame) bool { return seasonOf[m.id] != sn.ID })
	}

	in, extra, valid := g.withExtraGames(li.in, sn.ID, tests, live, moves)
	if !valid {
		return fail(errEloInvalidTestGame)
	}
	in.Elo, in.Trace = &params, true
	result, err := leaderboard.Compute(in)
	if errors.Is(err, leaderboard.ErrNoWinner) {
		return fail(errEloInvalidTestGame)
	}
	if err != nil {
		return internal(err)
	}
	baseline := li.in
	if len(tests) > 0 || len(live) > 0 {
		out.Baseline = "storedGames"
		baseline.Elo = &params
	}
	before, err := leaderboard.Compute(baseline)
	if err != nil {
		return internal(err)
	}
	out.Games = g.games(in, moves, result.Games, extra)
	out.Standings = g.standings(result, before, int64(sn.MinMatchesToQualify))
	if replay != nil {
		games, res := g.replay(li.in, params, *replay, moves)
		if res != nil {
			return res
		}
		out.Replay = games
	}
	return ok(out)
}

// replay rates a stored match of the season after every step of its live
// log, then as stored (leaderboard.Replay), with the request's weights.
func (g eloGroup) replay(base leaderboard.Input, params leaderboard.EloParams, rp eloReplay, moves map[string]db.RuleMove) ([]eloGameDTO, response) {
	in := base
	in.Elo = &params
	in.RuleMoves = maps.Clone(base.RuleMoves)
	for id, m := range moves {
		in.RuleMoves[id] = leaderboard.RuleMove{PointsForScorer: m.PointsForScorer, PointsForTeam: m.PointsForTeam, Finishing: m.FinishingMove, Cups: cupsPerHit(m)}
	}
	known := map[string]bool{}
	for _, p := range base.Players {
		known[p.ID] = true
	}
	for _, step := range rp.steps {
		for _, tm := range step.Members {
			if !known[tm.PlayerID] {
				return nil, fail(errEloInvalidLiveMatch)
			}
		}
		for _, mv := range step.Moves {
			if _, ok := moves[mv.MoveID]; !ok {
				return nil, fail(errEloInvalidLiveMatch)
			}
		}
	}
	traced, err := leaderboard.Replay(in, rp.matchID, rp.steps)
	if errors.Is(err, leaderboard.ErrNoMatch) || errors.Is(err, leaderboard.ErrNoWinner) {
		return nil, fail(errEloInvalidLiveMatch)
	}
	if err != nil {
		return nil, internal(err)
	}
	played := leaderboard.Input{Matches: rp.steps}
	for _, m := range base.Matches {
		if m.ID == rp.matchID {
			played.Matches = append(played.Matches, m)
		}
	}
	return g.games(played, moves, traced, extraGames{}), nil
}

// eloReplays answers GET /elo-simulation/replays: the season's live matches
// that became a match, with their ops, for the simulator to replay.
func (s *Server) eloReplays(r *request) response {
	row, res := s.eloGroupByCode(r.Context(), r)
	if res != nil {
		return res
	}
	seasonID := r.URL.Query().Get("seasonId")
	if seasonID == "" {
		seasonID = deref(row.ActiveSeasonID)
	}
	rows, err := s.q.FinishedLiveMatchesBySeason(r.Context(), db.FinishedLiveMatchesBySeasonParams{GroupID: row.ID, SeasonID: seasonID})
	if err != nil {
		return internal(err)
	}
	ids := make([]string, len(rows))
	for i, lm := range rows {
		ids[i] = lm.LiveMatch.ID
	}
	ops, err := liveMatchOps(r.Context(), s.q, ids)
	if err != nil {
		return internal(err)
	}
	out := make([]liveMatchDTO, len(rows))
	for i, lm := range rows {
		out[i] = toLiveMatchDTO(lm.LiveMatch, lm.CreatedByUserID, ops[lm.LiveMatch.ID])
	}
	return ok(out)
}

// eloLiveMatches answers GET /elo-simulation/live-matches: the group's
// running live matches with their ops. The server doesn't interpret ops, so
// the simulator reduces them with the app's code and sends their teams back.
func (s *Server) eloLiveMatches(r *request) response {
	row, res := s.eloGroupByCode(r.Context(), r)
	if res != nil {
		return res
	}
	out, err := s.inProgressLiveMatches(r.Context(), row.ID)
	if err != nil {
		return internal(err)
	}
	return ok(out)
}

// eloSearch answers GET /elo-simulation/search: the grid of weights that
// predicts the group's games best.
func (s *Server) eloSearch(r *request) response {
	g, res := s.loadEloGroup(r.Context(), r)
	if res != nil {
		return res
	}
	best, score, tried, err := leaderboard.Search(g.allInputs())
	if err != nil {
		return internal(err)
	}
	return ok(eloSearchDTO{Params: toEloParamsDTO(best), Prediction: toEloScoreDTO(score), Tried: tried})
}

// eloParamsFromQuery reads the weights; any left out stay at the season's.
func eloParamsFromQuery(r *request, p leaderboard.EloParams) (leaderboard.EloParams, bool) {
	for name, field := range map[string]*float64{"k": &p.K, "kr": &p.KR, "ringWeight": &p.RingWeight, "swing": &p.Swing, "spread": &p.Spread} {
		raw := r.URL.Query().Get(name)
		if raw == "" {
			continue
		}
		v, err := strconv.ParseFloat(raw, 64)
		lo, hi := 0.0, 10000.0
		if name == "spread" {
			lo, hi = 100, 100000
		}
		if err != nil || math.IsNaN(v) || math.IsInf(v, 0) || v < lo || v > hi {
			return p, false
		}
		*field = v
	}
	return p, true
}

// pickSeason is the index of the season asked for, else the running one,
// else the newest; -1 without seasons.
func (g eloGroup) pickSeason(id string) int {
	for _, want := range []string{id, deref(g.group.ActiveSeasonID)} {
		for i, sn := range g.seasons {
			if want != "" && sn.ID == want {
				return i
			}
		}
	}
	return len(g.seasons) - 1
}

const (
	maxTestGames   = 20
	maxTestTeam    = 10
	maxTestMoveHit = 100
)

// eloTestGame is a made-up match: two teams of the group's profiles with
// their move counts, rated right after the game After ("start" before the
// first game, "end" after the last).
type eloTestGame struct {
	After string            `json:"after"`
	Teams [][]eloTestPlayer `json:"teams"`
}

type eloTestPlayer struct {
	ProfileID string        `json:"profileId"`
	Moves     []eloTestMove `json:"moves"`
}

type eloTestMove struct {
	MoveID string `json:"moveId"`
	Count  int32  `json:"count"`
}

// eloReplay is a stored match to replay, step by step: the teams after
// every op of its live log, in the match create format.
type eloReplay struct {
	matchID string
	steps   []leaderboard.Match
}

const maxReplaySteps = 300

// eloLiveGame is a running live match as it would be entered now.
type eloLiveGame struct {
	id    string
	match leaderboard.Match
}

// readExtraGames reads the body of a POST: {"testGames": [...],
// "liveMatches": [{"liveMatchId": ..., "teams": [blue, red]}], "replay":
// {"matchId": ..., "steps": [{"teams": [blue, red]}]}}, the teams in the
// match create format.
func readExtraGames(r *request, now time.Time) ([]eloTestGame, []eloLiveGame, *eloReplay, response) {
	if r.Method != http.MethodPost {
		return nil, nil, nil, nil
	}
	body, res := readJSON(r.Request, false)
	if res != nil || body == nil {
		return nil, nil, nil, res
	}
	o, err := asObject(body)
	if err != nil {
		return nil, nil, nil, springError(400)
	}
	raw, err := json.Marshal(o["testGames"])
	if err != nil {
		return nil, nil, nil, springError(400)
	}
	var tests []eloTestGame
	if err := json.Unmarshal(raw, &tests); err != nil || len(tests) > maxTestGames {
		return nil, nil, nil, fail(errEloInvalidTestGame)
	}
	list, _, err := o.list("liveMatches")
	if err != nil || len(list) > maxProjectedMatches {
		return nil, nil, nil, fail(errEloInvalidLiveMatch)
	}
	var live []eloLiveGame
	for _, item := range list {
		lo, err := asObject(item)
		if err != nil {
			return nil, nil, nil, fail(errEloInvalidLiveMatch)
		}
		id, err := lo.str("liveMatchId")
		if err != nil || id == nil {
			return nil, nil, nil, fail(errEloInvalidLiveMatch)
		}
		m, err := parseProjectedMatch(item, "live-"+*id, now)
		if err != nil {
			return nil, nil, nil, fail(errEloInvalidLiveMatch)
		}
		live = append(live, eloLiveGame{id: *id, match: m})
	}
	replay, err := readReplay(o, now)
	if err != nil {
		return nil, nil, nil, fail(errEloInvalidLiveMatch)
	}
	return tests, live, replay, nil
}

// readReplay reads the body's replay, nil without one.
func readReplay(o object, now time.Time) (*eloReplay, error) {
	if o["replay"] == nil {
		return nil, nil
	}
	ro, err := o.child("replay")
	if err != nil {
		return nil, err
	}
	id, err := ro.str("matchId")
	if err != nil || id == nil {
		return nil, errBadBody
	}
	steps, _, err := ro.list("steps")
	if err != nil || len(steps) > maxReplaySteps {
		return nil, errBadBody
	}
	rp := &eloReplay{matchID: *id}
	for i, item := range steps {
		m, err := parseProjectedMatch(item, fmt.Sprintf("replay-%d", i), now)
		if err != nil {
			return nil, err
		}
		rp.steps = append(rp.steps, m)
	}
	return rp, nil
}

// extraGames maps the match ids of test and live games to where they came
// from.
type extraGames struct {
	test map[string]int    // the test game's place in the request
	live map[string]string // the live match's id
}

// withExtraGames adds test and live games to a season's input. A player
// without a player row in the season joins it for a test game, starting like
// everyone else. A live match whose players aren't the season's is left out.
func (g eloGroup) withExtraGames(base leaderboard.Input, seasonID string, tests []eloTestGame, live []eloLiveGame, moves map[string]db.RuleMove) (leaderboard.Input, extraGames, bool) {
	extra := extraGames{test: map[string]int{}, live: map[string]string{}}
	if len(tests) == 0 && len(live) == 0 {
		return base, extra, true
	}
	in := base
	in.Matches = append([]leaderboard.Match(nil), base.Matches...)
	in.Players = append([]leaderboard.Player(nil), base.Players...)
	in.ProfileOf = map[string]string{}
	for k, v := range base.ProfileOf {
		in.ProfileOf[k] = v
	}
	in.RuleMoves = map[string]leaderboard.RuleMove{}
	for k, v := range base.RuleMoves {
		in.RuleMoves[k] = v
	}
	for id, m := range moves {
		in.RuleMoves[id] = leaderboard.RuleMove{PointsForScorer: m.PointsForScorer, PointsForTeam: m.PointsForTeam, Finishing: m.FinishingMove, Cups: cupsPerHit(m)}
	}

	playerOf := map[string]string{}
	for _, p := range base.Players {
		if p.ProfileID != nil && (p.Active || playerOf[*p.ProfileID] == "") {
			playerOf[*p.ProfileID] = p.ID
		}
	}
	dates := map[string]time.Time{}
	var first, last time.Time
	for i, m := range base.Matches {
		dates[m.ID] = m.Date
		if i == 0 || m.Date.Before(first) {
			first = m.Date
		}
		if i == 0 || m.Date.After(last) {
			last = m.Date
		}
	}
	if len(base.Matches) == 0 {
		first, last = time.Now(), time.Now()
	}

	for i, t := range tests {
		// Compute sorts by date, keeping the order of equal dates, and test
		// games come after the real ones: the same date as a game rates right
		// after it
		date, found := dates[t.After]
		switch t.After {
		case "start":
			date, found = first.Add(-time.Second), true
		case "end":
			date, found = last, true
		}
		if !found || len(t.Teams) != 2 {
			return in, extra, false
		}
		id := fmt.Sprintf("test-%d", i)
		m := leaderboard.Match{ID: id, Date: date}
		inGame := map[string]bool{}
		finishers := 0
		for k, team := range t.Teams {
			if len(team) == 0 || len(team) > maxTestTeam {
				return in, extra, false
			}
			teamID := fmt.Sprintf("%s-team-%d", id, k)
			m.TeamIDs = append(m.TeamIDs, teamID)
			finished := false
			for j, p := range team {
				if !g.playing[p.ProfileID] || inGame[p.ProfileID] {
					return in, extra, false
				}
				inGame[p.ProfileID] = true
				player, ok := playerOf[p.ProfileID]
				if !ok {
					player = "test-player-" + p.ProfileID
					playerOf[p.ProfileID] = player
					profile := p.ProfileID
					in.Players = append(in.Players, leaderboard.Player{ID: player, ProfileID: &profile, SeasonID: seasonID, Active: true})
				}
				in.ProfileOf[player] = p.ProfileID
				memberID := fmt.Sprintf("%s-%d", teamID, j)
				m.Members = append(m.Members, leaderboard.Member{ID: memberID, TeamID: teamID, PlayerID: player})
				for _, mv := range p.Moves {
					rm, known := moves[mv.MoveID]
					if !known || mv.Count < 0 || mv.Count > maxTestMoveHit {
						return in, extra, false
					}
					if rm.FinishingMove && mv.Count > 0 {
						finished = true
					}
					m.Moves = append(m.Moves, leaderboard.Move{TeamMemberID: memberID, MoveID: mv.MoveID, Value: mv.Count})
				}
			}
			if finished {
				finishers++
			}
		}
		if finishers != 1 {
			return in, extra, false
		}
		in.Matches = append(in.Matches, m)
		extra.test[id] = i
	}

	profileOf := map[string]string{}
	for _, p := range base.Players {
		if p.ProfileID != nil {
			profileOf[p.ID] = *p.ProfileID
		}
	}
live:
	for _, lg := range live {
		for _, tm := range lg.match.Members {
			if _, ok := profileOf[tm.PlayerID]; !ok {
				continue live
			}
		}
		for _, mv := range lg.match.Moves {
			if _, ok := moves[mv.MoveID]; !ok {
				continue live
			}
		}
		for _, tm := range lg.match.Members {
			in.ProfileOf[tm.PlayerID] = profileOf[tm.PlayerID]
		}
		in.Matches = append(in.Matches, lg.match)
		extra.live[lg.match.ID] = lg.id
	}
	return in, extra, true
}

func (g eloGroup) games(in leaderboard.Input, moves map[string]db.RuleMove, traced []leaderboard.Game, extra extraGames) []eloGameDTO {
	matches := map[string]leaderboard.Match{}
	for _, m := range in.Matches {
		matches[m.ID] = m
	}
	out := make([]eloGameDTO, 0, len(traced))
	for _, tg := range traced {
		m := matches[tg.MatchID]
		dto := eloGameDTO{MatchID: tg.MatchID, Date: tg.Date.UTC(), Points: tg.Points, FullPoints: tg.FullPoints, Ring: tg.Ring}
		if i, isTest := extra.test[tg.MatchID]; isTest {
			dto.TestIndex = &i
		}
		if id, isLive := extra.live[tg.MatchID]; isLive {
			dto.LiveMatchID = &id
		}
		for _, tt := range tg.Teams {
			team := eloTeamDTO{Won: tt.Won, WinChance: tt.WinChance, Share: tt.Share}
			for _, tp := range tt.Players {
				p := eloPlayerDTO{
					ProfileID: tp.ProfileID, Name: g.profiles[tp.ProfileID], Points: tp.Points, Own: tp.Own,
					Before: tp.Before, After: tp.After, Result: tp.Result, Hitting: tp.Hitting, Share: tp.Share, Expected: tp.Expected,
					Moves: []eloMoveDTO{},
				}
				for _, mv := range m.Moves {
					rm, known := moves[mv.MoveID]
					// old matches stored every move, at count 0 when it wasn't made
					if mv.TeamMemberID != tp.MemberID || !known || mv.Value == 0 {
						continue
					}
					p.Moves = append(p.Moves, eloMoveDTO{Name: deref(rm.Name), Count: mv.Value})
					team.Cups += int64(cupsPerHit(rm) * mv.Value)
					if rm.FinishingMove {
						dto.Finisher, dto.FinishMove = p.Name, deref(rm.Name)
					}
				}
				team.Points += tp.Points
				team.Players = append(team.Players, p)
			}
			if n := len(team.Players); n > 0 {
				team.AvgPoints = float64(team.Points) / float64(n)
			}
			dto.Teams = append(dto.Teams, team)
		}
		out = append(out, dto)
	}
	return out
}

// eloBoard orders a season's leaderboard like the app: active players who
// played, ranked by Elo once they have minMatches, the others after them.
// Equal Elo goes by points, then name.
func (g eloGroup) eloBoard(res leaderboard.Result, minMatches int64) (ranked, unranked []*leaderboard.Entry) {
	for _, e := range res.Entries {
		switch {
		case !e.Player.Active || e.Stats.Matches == 0:
		case e.Stats.Matches >= minMatches:
			ranked = append(ranked, e)
		default:
			unranked = append(unranked, e)
		}
	}
	byElo := func(list []*leaderboard.Entry) {
		sort.SliceStable(list, func(i, j int) bool {
			a, b := list[i], list[j]
			if a.Stats.Elo != b.Stats.Elo {
				return a.Stats.Elo > b.Stats.Elo
			}
			if a.Stats.Points != b.Stats.Points {
				return a.Stats.Points > b.Stats.Points
			}
			return g.profiles[deref(a.Player.ProfileID)] < g.profiles[deref(b.Player.ProfileID)]
		})
	}
	byElo(ranked)
	byElo(unranked)
	return ranked, unranked
}

// standings are the leaderboard next to the same players in the baseline.
func (g eloGroup) standings(result, baseline leaderboard.Result, minMatches int64) []eloStandingDTO {
	baseRank, baseElo := map[string]int{}, map[string]float64{}
	baseRanked, baseUnranked := g.eloBoard(baseline, minMatches)
	for i, e := range baseRanked {
		baseRank[deref(e.Player.ProfileID)] = i + 1
	}
	for _, e := range append(baseRanked, baseUnranked...) {
		baseElo[deref(e.Player.ProfileID)] = e.Stats.Elo
	}
	parts := map[string][2]float64{}
	for _, game := range result.Games {
		for _, t := range game.Teams {
			for _, p := range t.Players {
				sum := parts[p.ProfileID]
				parts[p.ProfileID] = [2]float64{sum[0] + p.Result, sum[1] + p.Hitting}
			}
		}
	}
	ranked, unranked := g.eloBoard(result, minMatches)
	out := []eloStandingDTO{}
	for i, e := range append(ranked, unranked...) {
		id := deref(e.Player.ProfileID)
		row := eloStandingDTO{
			ProfileID: id, Name: g.profiles[id], Elo: e.Stats.Elo,
			Matches: e.Stats.Matches, Wins: e.Stats.Wins, Points: e.Stats.Points, Result: parts[id][0], Hitting: parts[id][1],
		}
		if i < len(ranked) {
			rank := i + 1
			row.Rank = &rank
		}
		if r, ok := baseRank[id]; ok {
			row.BaselineRank = &r
		}
		if elo, ok := baseElo[id]; ok {
			row.BaselineElo = &elo
		}
		out = append(out, row)
	}
	return out
}

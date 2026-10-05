package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
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
	K            float64 `json:"k"`
	MarginWeight float64 `json:"marginWeight"`
	PerPoint     float64 `json:"perPoint"`
	TopWeight    float64 `json:"topWeight"`
}

func toEloParamsDTO(p leaderboard.EloParams) eloParamsDTO {
	return eloParamsDTO{K: p.K, MarginWeight: p.MarginWeight, PerPoint: p.PerPoint, TopWeight: p.TopWeight}
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
	GroupID   string         `json:"groupId"`
	GroupName *string        `json:"groupName"`
	Defaults  eloParamsDTO   `json:"defaults"`
	Params    eloParamsDTO   `json:"params"`
	Seasons   []eloSeasonDTO `json:"seasons"`
	SeasonID  *string        `json:"seasonId"`
	// Baseline is what the standings compare with: "withoutTestGames" when
	// the request has test games, else "defaults" (the default weights).
	Baseline   string           `json:"baseline"`
	Standings  []eloStandingDTO `json:"standings"`
	Games      []eloGameDTO     `json:"games"`
	Prediction eloPredictionDTO `json:"prediction"`
	// what a test game can be made of: the season's moves, and the group's
	// players who weren't removed
	Moves    []eloRuleMoveDTO `json:"moves"`
	Profiles []eloProfileDTO  `json:"profiles"`
}

type eloSeasonDTO struct {
	ID                  string  `json:"id"`
	Name                *string `json:"name"`
	NumMatches          int     `json:"numMatches"`
	MinMatchesToQualify int32   `json:"minMatchesToQualify"`
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
	Params   eloScoreDTO `json:"params"`
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
	// TestIndex is the test game's place in the request; nil for real games
	TestIndex  *int         `json:"testIndex"`
	Date       time.Time    `json:"date"`
	Gap        float64      `json:"gap"`
	Scale      float64      `json:"scale"`
	TeamPoints float64      `json:"teamPoints"`
	Finisher   string       `json:"finisher"`
	FinishMove string       `json:"finishMove"`
	Teams      []eloTeamDTO `json:"teams"`
}

type eloTeamDTO struct {
	Won       bool           `json:"won"`
	Rating    float64        `json:"rating"`
	WinChance float64        `json:"winChance"`
	Points    int64          `json:"points"`
	AvgPoints float64        `json:"avgPoints"`
	Cups      int64          `json:"cups"`
	Players   []eloPlayerDTO `json:"players"`
}

type eloPlayerDTO struct {
	ProfileID string       `json:"profileId"`
	Name      string       `json:"name"`
	Points    int64        `json:"points"`
	Own       int64        `json:"own"`
	Before    float64      `json:"before"`
	After     float64      `json:"after"`
	Result    float64      `json:"result"`
	Hitting   float64      `json:"hitting"`
	Expected  float64      `json:"expected"`
	Moves     []eloMoveDTO `json:"moves"`
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

func (s *Server) loadEloGroup(ctx context.Context, r *request) (eloGroup, response) {
	code := strings.Join(r.URL.Query()["inviteCode"], ",")
	if javaTrimEmpty(code) {
		return eloGroup{}, fail(errInvalidGroupInviteCode)
	}
	row, err := s.q.GetGroupByInviteCode(ctx, &code)
	if notFound(err) {
		return eloGroup{}, fail(errGroupInviteNotFound)
	}
	if err != nil {
		return eloGroup{}, internal(err)
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
	for _, sn := range seasons {
		li, res := s.leaderboardInput(ctx, s.q, g.group, "season", false, sn.ID, nil)
		if res != nil {
			return eloGroup{}, res
		}
		g.seasons = append(g.seasons, eloSeasonDTO{
			ID: sn.ID, Name: sn.Name, NumMatches: len(li.matches), MinMatchesToQualify: deref(sn.MinMatchesToQualify),
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
	params, valid := eloParamsFromQuery(r)
	if !valid {
		return springError(400)
	}
	tests, res := readTestGames(r)
	if res != nil {
		return res
	}

	out := eloSimulationDTO{
		GroupID: g.group.ID, GroupName: g.group.Name,
		Defaults: toEloParamsDTO(leaderboard.DefaultElo), Params: toEloParamsDTO(params),
		Seasons: g.seasons, Baseline: "defaults", Standings: []eloStandingDTO{}, Games: []eloGameDTO{},
		Moves: []eloRuleMoveDTO{}, Profiles: []eloProfileDTO{},
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
	predicted, err := leaderboard.Predict(all, params)
	if err != nil {
		return internal(err)
	}
	defaults, err := leaderboard.Predict(all, leaderboard.DefaultElo)
	if err != nil {
		return internal(err)
	}
	out.Prediction = eloPredictionDTO{Params: toEloScoreDTO(predicted), Defaults: toEloScoreDTO(defaults)}

	si := g.pickSeason(r.URL.Query().Get("seasonId"))
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

	in, testOf, valid := g.withTestGames(li.in, sn.ID, tests, moves)
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
	if len(tests) > 0 {
		out.Baseline = "withoutTestGames"
		baseline.Elo = &params
	}
	before, err := leaderboard.Compute(baseline)
	if err != nil {
		return internal(err)
	}
	out.Games = g.games(in, moves, result.Games, testOf)
	out.Standings = g.standings(result, before, int64(sn.MinMatchesToQualify))
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

// eloParamsFromQuery reads the weights; any left out stay at the default.
func eloParamsFromQuery(r *request) (leaderboard.EloParams, bool) {
	p := leaderboard.DefaultElo
	for name, field := range map[string]*float64{"k": &p.K, "marginWeight": &p.MarginWeight, "perPoint": &p.PerPoint, "topWeight": &p.TopWeight} {
		raw := r.URL.Query().Get(name)
		if raw == "" {
			continue
		}
		v, err := strconv.ParseFloat(raw, 64)
		if err != nil || math.IsNaN(v) || math.IsInf(v, 0) || v < 0 || v > 10000 {
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

// readTestGames reads the body of a POST: {"testGames": [...]}.
func readTestGames(r *request) ([]eloTestGame, response) {
	if r.Method != http.MethodPost {
		return nil, nil
	}
	body, res := readJSON(r.Request, false)
	if res != nil || body == nil {
		return nil, res
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return nil, springError(400)
	}
	var req struct {
		TestGames []eloTestGame `json:"testGames"`
	}
	if err := json.Unmarshal(raw, &req); err != nil || len(req.TestGames) > maxTestGames {
		return nil, fail(errEloInvalidTestGame)
	}
	return req.TestGames, nil
}

// withTestGames adds the test games to a season's input. testOf maps a test
// game's match id to its place in the request. A player without a player row
// in the season joins it for the test, starting like everyone else.
func (g eloGroup) withTestGames(base leaderboard.Input, seasonID string, tests []eloTestGame, moves map[string]db.RuleMove) (leaderboard.Input, map[string]int, bool) {
	testOf := map[string]int{}
	if len(tests) == 0 {
		return base, testOf, true
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
			return in, nil, false
		}
		id := fmt.Sprintf("test-%d", i)
		m := leaderboard.Match{ID: id, Date: date}
		inGame := map[string]bool{}
		finishers := 0
		for k, team := range t.Teams {
			if len(team) == 0 || len(team) > maxTestTeam {
				return in, nil, false
			}
			teamID := fmt.Sprintf("%s-team-%d", id, k)
			m.TeamIDs = append(m.TeamIDs, teamID)
			finished := false
			for j, p := range team {
				if !g.playing[p.ProfileID] || inGame[p.ProfileID] {
					return in, nil, false
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
						return in, nil, false
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
			return in, nil, false
		}
		in.Matches = append(in.Matches, m)
		testOf[id] = i
	}
	return in, testOf, true
}

func (g eloGroup) games(in leaderboard.Input, moves map[string]db.RuleMove, traced []leaderboard.Game, testOf map[string]int) []eloGameDTO {
	matches := map[string]leaderboard.Match{}
	for _, m := range in.Matches {
		matches[m.ID] = m
	}
	out := make([]eloGameDTO, 0, len(traced))
	for _, tg := range traced {
		m := matches[tg.MatchID]
		dto := eloGameDTO{MatchID: tg.MatchID, Date: tg.Date.UTC(), Gap: tg.Gap, Scale: tg.Scale, TeamPoints: tg.TeamPoints}
		if i, isTest := testOf[tg.MatchID]; isTest {
			dto.TestIndex = &i
		}
		for _, tt := range tg.Teams {
			team := eloTeamDTO{Won: tt.Won, Rating: tt.Rating, WinChance: tt.WinChance}
			for _, tp := range tt.Players {
				p := eloPlayerDTO{
					ProfileID: tp.ProfileID, Name: g.profiles[tp.ProfileID], Points: tp.Points, Own: tp.Own,
					Before: tp.Before, After: tp.After, Result: tp.Result, Hitting: tp.Hitting, Expected: tp.Expected,
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

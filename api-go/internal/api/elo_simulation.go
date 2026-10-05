package api

import (
	"context"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/laurin-notemann/beerpong/api-go/internal/leaderboard"
)

// The Elo simulator (beerpong-var): a group's seasons computed by the
// leaderboard's own code, with other Elo weights and every game's
// breakdown. Like joining, it needs only the group's invite code.

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
	GroupID    string           `json:"groupId"`
	GroupName  *string          `json:"groupName"`
	Defaults   eloParamsDTO     `json:"defaults"`
	Params     eloParamsDTO     `json:"params"`
	Seasons    []eloSeasonDTO   `json:"seasons"`
	SeasonID   *string          `json:"seasonId"`
	Standings  []eloStandingDTO `json:"standings"`
	Games      []eloGameDTO     `json:"games"`
	Prediction eloPredictionDTO `json:"prediction"`
}

type eloSeasonDTO struct {
	ID         string  `json:"id"`
	Name       *string `json:"name"`
	NumMatches int     `json:"numMatches"`
}

type eloPredictionDTO struct {
	Params   eloScoreDTO `json:"params"`
	Defaults eloScoreDTO `json:"defaults"`
}

type eloStandingDTO struct {
	ProfileID   string  `json:"profileId"`
	Name        string  `json:"name"`
	Elo         float64 `json:"elo"`
	DefaultElo  float64 `json:"defaultElo"`
	DefaultRank int     `json:"defaultRank"`
	Matches     int64   `json:"matches"`
	Wins        int64   `json:"wins"`
	Points      int64   `json:"points"`
	Result      float64 `json:"result"`  // sum of the team results
	Hitting     float64 `json:"hitting"` // sum of the hitting changes
}

type eloGameDTO struct {
	MatchID    string       `json:"matchId"`
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
	g := eloGroup{group: toGroupDTO(row), profiles: map[string]string{}}
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
		g.seasons = append(g.seasons, eloSeasonDTO{ID: sn.ID, Name: sn.Name, NumMatches: len(li.matches)})
		g.inputs = append(g.inputs, li)
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

// eloSimulation answers GET /elo-simulation: one season with the given
// weights (the defaults for any left out), and the prediction score over
// every season.
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

	out := eloSimulationDTO{
		GroupID: g.group.ID, GroupName: g.group.Name,
		Defaults: toEloParamsDTO(leaderboard.DefaultElo), Params: toEloParamsDTO(params),
		Seasons: g.seasons, Standings: []eloStandingDTO{}, Games: []eloGameDTO{},
	}
	if out.Seasons == nil {
		out.Seasons = []eloSeasonDTO{}
	}
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
		return ok(out)
	}
	out.SeasonID = &g.seasons[si].ID
	li := g.inputs[si]
	in := li.in
	in.Elo, in.Trace = &params, true
	result, err := leaderboard.Compute(in)
	if err != nil {
		return internal(err)
	}
	in.Elo, in.Trace = nil, false
	byDefault, err := leaderboard.Compute(in)
	if err != nil {
		return internal(err)
	}
	out.Games = g.games(li, result.Games)
	out.Standings = g.standings(result, byDefault)
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

func (g eloGroup) games(li leaderboardInput, traced []leaderboard.Game) []eloGameDTO {
	matches := map[string]fullMatch{}
	for _, m := range li.matches {
		matches[m.match.ID] = m
	}
	out := make([]eloGameDTO, 0, len(traced))
	for _, tg := range traced {
		m := matches[tg.MatchID]
		dto := eloGameDTO{MatchID: tg.MatchID, Date: tg.Date.UTC(), Gap: tg.Gap, Scale: tg.Scale, TeamPoints: tg.TeamPoints}
		for _, tt := range tg.Teams {
			team := eloTeamDTO{Won: tt.Won, Rating: tt.Rating, WinChance: tt.WinChance}
			for _, tp := range tt.Players {
				p := eloPlayerDTO{
					ProfileID: tp.ProfileID, Name: g.profiles[tp.ProfileID], Points: tp.Points, Own: tp.Own,
					Before: tp.Before, After: tp.After, Result: tp.Result, Hitting: tp.Hitting, Expected: tp.Expected,
					Moves: []eloMoveDTO{},
				}
				for _, mv := range m.moves {
					rm, known := li.ruleMoves[deref(mv.MoveID)]
					// old matches stored every move, at count 0 when it wasn't made
					if deref(mv.TeamMemberID) != tp.MemberID || !known || mv.Value == 0 {
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

// standings are everyone who played, best first, next to where the default
// weights put them.
func (g eloGroup) standings(result, byDefault leaderboard.Result) []eloStandingDTO {
	played := func(res leaderboard.Result) []*leaderboard.Entry {
		var out []*leaderboard.Entry
		for _, e := range res.Entries {
			if e.Stats.Matches > 0 {
				out = append(out, e)
			}
		}
		sort.SliceStable(out, func(i, j int) bool { return out[i].Stats.Elo > out[j].Stats.Elo })
		return out
	}
	defaultRank, defaultElo := map[string]int{}, map[string]float64{}
	for i, e := range played(byDefault) {
		defaultRank[deref(e.Player.ProfileID)] = i + 1
		defaultElo[deref(e.Player.ProfileID)] = e.Stats.Elo
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
	out := []eloStandingDTO{}
	for _, e := range played(result) {
		id := deref(e.Player.ProfileID)
		out = append(out, eloStandingDTO{
			ProfileID: id, Name: g.profiles[id], Elo: e.Stats.Elo, DefaultElo: defaultElo[id], DefaultRank: defaultRank[id],
			Matches: e.Stats.Matches, Wins: e.Stats.Wins, Points: e.Stats.Points, Result: parts[id][0], Hitting: parts[id][1],
		})
	}
	return out
}

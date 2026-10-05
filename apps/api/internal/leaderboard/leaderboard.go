// Package leaderboard turns matches into player statistics and Elo ratings.
// It is a straight port of the Java LeaderboardService: the same inputs give
// the same numbers and the same entry order.
package leaderboard

import (
	"errors"
	"fmt"
	"sort"
	"time"
)

type Stats struct {
	Points            int64
	Matches           int64
	Wins              int64
	Moves             int64
	TotalTeamSize     int64
	AvgPointsPerMatch float64
	AvgTeamSize       float64
	Elo               float64
	// PlayerID is the player the entry represents; Elo shares key on it.
	PlayerID string
}

// FreshStats is what a player starts with.
func FreshStats() Stats { return Stats{Elo: StartingElo} }

func (s *Stats) calculate() {
	if s.Matches > 0 {
		s.AvgPointsPerMatch = float64(s.Points) / float64(s.Matches)
		s.AvgTeamSize = float64(s.TotalTeamSize) / float64(s.Matches)
	} else {
		s.AvgPointsPerMatch = 0
		s.AvgTeamSize = 0
	}
}

// Player is one player row: a profile in one season.
type Player struct {
	ID        string
	ProfileID *string
	SeasonID  string
	SeasonEnd *time.Time
	Active    bool
	Stored    Stats // statistics as stored with the player
}

type Match struct {
	ID      string
	Date    time.Time
	TeamIDs []string // first team is blue, second red
	Members []Member
	Moves   []Move
	// Projected is a live match counted as if it ended now. Until a finish
	// decides it, the team that took more cups wins; a tie is a draw.
	Projected bool
	// Elo is the weights of the match's season; DefaultElo without.
	Elo *EloParams
}

type Member struct {
	ID       string
	TeamID   string
	PlayerID string
}

type Move struct {
	TeamMemberID string
	MoveID       string
	Value        int32
}

type RuleMove struct {
	PointsForScorer int32
	PointsForTeam   int32
	Finishing       bool
	// Cups is how many cups one hit takes; the Moves statistic counts cups.
	Cups int32
}

type Input struct {
	Players   []Player
	Matches   []Match
	RuleMoves map[string]RuleMove
	// ProfileOf maps the players appearing in matches to their profile.
	ProfileOf map[string]string
	// KeepStoredStats starts from the stored statistics instead of zero
	// (season boards used to carry stats forward).
	KeepStoredStats bool
	// Elo replaces every match's weights (the simulator).
	Elo *EloParams
	// Trace records how every match moved the ratings in Result.Games.
	Trace bool
}

// Entry is one profile on the board with the player that represents it.
type Entry struct {
	Player Player
	Stats  *Stats
}

type Result struct {
	// Entries are in the order the Java backend returned them (HashMap
	// iteration order over profile ids). Callers filter inactive players.
	Entries    []*Entry
	NumMatches int64
	Games      []Game // with Input.Trace, in the order they were rated
}

// Game is how one match moved the ratings.
type Game struct {
	MatchID    string
	Date       time.Time
	Points     int64   // own points both teams scored
	FullPoints float64 // own points of an average full game before this one
	Ring       float64 // what the result counted: more than 1 for a ring win
	Teams      [2]GameTeam
}

type GameTeam struct {
	TeamID    string
	Won       bool
	WinChance float64
	Share     float64 // of the game's points, set before it
	Players   []GamePlayer
}

type GamePlayer struct {
	MemberID  string
	ProfileID string
	Points    int64 // app points
	Own       int64 // without the finish bonus
	Before    float64
	After     float64
	Result    float64 // the team's result, the same for every player
	Hitting   float64 // K × (Own − Expected) / an average player's full game
	Share     float64 // of the game's points, set before it
	Expected  float64 // Share × the game's points
}

// draw stands for the winner of a tied projected match.
const draw = "draw"

// ErrNoWinner is returned for a match without a finishing move. The Java
// backend failed the whole request in that case.
var ErrNoWinner = errors.New("match has no winning team")

func Compute(in Input) (Result, error) {
	entries, order := buildEntries(in.Players, in.KeepStoredStats)

	memberProfile := map[string]string{}
	for _, m := range in.Matches {
		for _, tm := range m.Members {
			if profile, ok := in.ProfileOf[tm.PlayerID]; ok {
				memberProfile[tm.ID] = profile
			}
		}
	}

	matches := make([]Match, len(in.Matches))
	copy(matches, in.Matches)
	sort.SliceStable(matches, func(i, j int) bool { return matches[i].Date.Before(matches[j].Date) })

	var numMatches int64
	r := &rating{override: in.Elo, normalBonus: normalFinishBonus(in.RuleMoves), trace: in.Trace}
	for _, m := range matches {
		processed, err := processMatch(m, entries, memberProfile, in.RuleMoves, r)
		if err != nil {
			return Result{}, err
		}
		if processed {
			numMatches++
		}
	}

	out := make([]*Entry, 0, len(order))
	for _, key := range javaHashMapOrder(order) {
		e := entries[key]
		e.Stats.calculate()
		out = append(out, e)
	}
	return Result{Entries: out, NumMatches: numMatches, Games: r.games}, nil
}

// rating is the Elo state of one Compute.
type rating struct {
	override *EloParams
	// full: hitting is scaled to what an average full game had so far
	full fullGames
	// normalBonus is a normal finish's team bonus, what a ring's is compared
	// with
	normalBonus int32
	trace       bool
	games       []Game
}

func (r *rating) params(m Match) EloParams {
	switch {
	case r.override != nil:
		return *r.override
	case m.Elo != nil:
		return *m.Elo
	default:
		return DefaultElo
	}
}

// normalFinishBonus is the team bonus of a finish that takes no cups of its
// own (a normal finish; a ring takes its formation), the smallest if the
// rules have several.
func normalFinishBonus(moves map[string]RuleMove) int32 {
	var bonus int32
	for _, m := range moves {
		if m.Finishing && m.Cups == 0 && m.PointsForTeam > 0 && (bonus == 0 || m.PointsForTeam < bonus) {
			bonus = m.PointsForTeam
		}
	}
	return bonus
}

// buildEntries keeps one player per profile: the one from the most recent
// season (the active season wins).
func buildEntries(players []Player, keepStored bool) (map[string]*Entry, []string) {
	entries := map[string]*Entry{}
	var order []string
	for _, p := range players {
		key := profileKey(p.ProfileID)
		existing, found := entries[key]
		if found && !isNewer(p, existing.Player) {
			continue
		}
		stats := FreshStats()
		if keepStored {
			stats = p.Stored
			// every season starts at StartingElo; the all-time board replays
			// all seasons instead (allTimeBoard in the API)
			stats.Elo = StartingElo
		}
		stats.PlayerID = p.ID
		if !found {
			order = append(order, key)
		}
		entries[key] = &Entry{Player: p, Stats: &stats}
	}
	return entries, order
}

func isNewer(candidate, existing Player) bool {
	if candidate.SeasonID == "" || candidate.SeasonEnd == nil {
		return true
	}
	if existing.SeasonEnd == nil {
		return false
	}
	return candidate.SeasonEnd.After(*existing.SeasonEnd)
}

func processMatch(m Match, entries map[string]*Entry, memberProfile map[string]string, ruleMoves map[string]RuleMove, r *rating) (bool, error) {
	if len(m.TeamIDs) < 2 {
		return false, nil
	}
	blue := m.TeamIDs[0]
	red := m.TeamIDs[1]

	var bluePoints, redPoints, blueCups, redCups int64
	winner := ""
	// finishCups: what the finish took off the table itself (a ring's cups)
	var finishCups int64
	var finishBonus int32
	playerPoints := map[string]int64{}
	// appPoints are the points the app shows for this match: own points plus
	// every finish bonus of the team. The Elo rates on these.
	appPoints := map[string]int64{}

	entryOf := func(memberID string) *Entry {
		profile, ok := memberProfile[memberID]
		if !ok {
			return nil
		}
		return entries[profile]
	}

	for _, team := range m.TeamIDs {
		var members []Member
		inTeam := map[string]bool{}
		for _, tm := range m.Members {
			if tm.TeamID == team {
				members = append(members, tm)
				inTeam[tm.ID] = true
			}
		}
		for _, tm := range members {
			if e := entryOf(tm.ID); e != nil {
				e.Stats.Matches++
				e.Stats.TotalTeamSize += int64(len(members))
			}
		}
		for _, mv := range m.Moves {
			if !inTeam[mv.TeamMemberID] {
				continue
			}
			e := entryOf(mv.TeamMemberID)
			if e == nil {
				continue
			}
			rm, ok := ruleMoves[mv.MoveID]
			if !ok {
				continue
			}
			own := rm.PointsForScorer * mv.Value
			if team == blue {
				blueCups += int64(rm.Cups * mv.Value)
			} else {
				redCups += int64(rm.Cups * mv.Value)
			}
			e.Stats.Moves += int64(rm.Cups * mv.Value)
			e.Stats.Points += int64(own)
			appPoints[e.Stats.PlayerID] += int64(own)
			if rm.PointsForTeam > 0 {
				for _, tm := range members {
					if mate := entryOf(tm.ID); mate != nil {
						mate.Stats.Points += int64(rm.PointsForTeam * mv.Value)
						appPoints[mate.Stats.PlayerID] += int64(rm.PointsForTeam * mv.Value)
					}
				}
			}
			// Old matches stored every move, finishes included, with value 0.
			if rm.Finishing && mv.Value > 0 {
				winner = team
				finishCups = int64(rm.Cups * mv.Value)
				finishBonus = rm.PointsForTeam
			}
			playerPoints[e.Stats.PlayerID] += int64(own)
			if team == blue {
				bluePoints += int64(own)
			} else {
				redPoints += int64(own)
			}
		}
	}

	inProgress := winner == "" && m.Projected
	if inProgress {
		switch {
		case blueCups > redCups:
			winner = blue
		case redCups > blueCups:
			winner = red
		default:
			winner = draw
		}
	}
	if winner == "" {
		return false, fmt.Errorf("%w: match %s", ErrNoWinner, m.ID)
	}

	blueStats, blueMembers := teamStats(m, blue, entryOf)
	redStats, redMembers := teamStats(m, red, entryOf)
	resultBlue := 0.5
	switch winner {
	case blue:
		resultBlue = 1
	case red:
		resultBlue = 0
	}
	winners := map[string][]*Stats{blue: blueStats, red: redStats}[winner]
	for _, s := range winners {
		s.Wins++
	}
	var before []float64
	if r.trace {
		for _, s := range append(append([]*Stats{}, blueStats...), redStats...) {
			before = append(before, s.Elo)
		}
	}
	params := r.params(m)
	ring := 1.0
	if !inProgress && finishCups > 0 {
		ring = ringFactor(params, finishBonus, r.normalBonus)
	}
	full := r.full.value()
	g := calculateElo(params, resultBlue, ring, [2][]*Stats{blueStats, redStats}, playerPoints, full)
	if !m.Projected && finishCups == 0 {
		r.full.add(bluePoints + redPoints)
	}
	if !r.trace {
		return true, nil
	}

	game := Game{MatchID: m.ID, Date: m.Date, Points: bluePoints + redPoints, FullPoints: full, Ring: ring}
	sides := [2][]*Stats{blueStats, redStats}
	members := [2][]string{blueMembers, redMembers}
	for k, team := range [2]string{blue, red} {
		chance := g.winChance
		if k == 1 {
			chance = 1 - chance
		}
		gt := GameTeam{TeamID: team, Won: winner == team, WinChance: chance}
		for i, s := range sides[k] {
			b := before[0]
			before = before[1:]
			gp := GamePlayer{
				MemberID: members[k][i], ProfileID: memberProfile[members[k][i]],
				Points: appPoints[s.PlayerID], Own: playerPoints[s.PlayerID], Before: b, After: s.Elo,
			}
			if len(g.share[k]) > i {
				gp.Result, gp.Hitting, gp.Share, gp.Expected = g.result[k], g.hitting[k][i], g.share[k][i], g.expected[k][i]
				gt.Share += gp.Share
			}
			gt.Players = append(gt.Players, gp)
		}
		game.Teams[k] = gt
	}
	r.games = append(r.games, game)
	return true, nil
}

// teamStats are the statistics of a team's players, with their team member
// ids.
func teamStats(m Match, team string, entryOf func(string) *Entry) ([]*Stats, []string) {
	var out []*Stats
	var ids []string
	for _, tm := range m.Members {
		if tm.TeamID != team {
			continue
		}
		if e := entryOf(tm.ID); e != nil {
			out = append(out, e.Stats)
			ids = append(ids, tm.ID)
		}
	}
	return out, ids
}

// nullProfile stands in for players without a profile, which Java keyed
// under null.
const nullProfile = "\x00null"

func profileKey(id *string) string {
	if id == nil {
		return nullProfile
	}
	return *id
}

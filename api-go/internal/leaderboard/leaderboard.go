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
	// (all-time boards, and season boards used to carry stats forward).
	KeepStoredStats bool
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
}

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
	// The Elo's expected points follow what teams scored so far this season.
	var teamPoints teamPointsAverage
	for _, m := range matches {
		processed, err := processMatch(m, entries, memberProfile, in.RuleMoves, &teamPoints)
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
	return Result{Entries: out, NumMatches: numMatches}, nil
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
			// every season starts at StartingElo, so the all-time Elo is the
			// running season's
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

func processMatch(m Match, entries map[string]*Entry, memberProfile map[string]string, ruleMoves map[string]RuleMove, teamPoints *teamPointsAverage) (bool, error) {
	if len(m.TeamIDs) < 2 {
		return false, nil
	}
	blue := m.TeamIDs[0]
	red := m.TeamIDs[1]

	var bluePoints, redPoints int64
	winner := ""
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
			}
			playerPoints[e.Stats.PlayerID] += int64(own)
			if team == blue {
				bluePoints += int64(own)
			} else {
				redPoints += int64(own)
			}
		}
	}

	if winner == "" {
		return false, fmt.Errorf("%w: match %s", ErrNoWinner, m.ID)
	}

	blueStats := teamStats(m, blue, entryOf)
	redStats := teamStats(m, red, entryOf)
	winners := redStats
	if winner == blue {
		winners = blueStats
	}
	for _, s := range winners {
		s.Wins++
	}
	calculateElo(winner == blue, blueStats, redStats, appPoints, playerPoints, teamPoints.value(bluePoints, redPoints))
	teamPoints.add(bluePoints)
	teamPoints.add(redPoints)
	return true, nil
}

func teamStats(m Match, team string, entryOf func(string) *Entry) []*Stats {
	var out []*Stats
	for _, tm := range m.Members {
		if tm.TeamID != team {
			continue
		}
		if e := entryOf(tm.ID); e != nil {
			out = append(out, e.Stats)
		}
	}
	return out
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

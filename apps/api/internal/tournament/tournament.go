// Package tournament plans stages and advances fixed teams. Match ids are reserved
// before play, so starting a fixture from two offline phones converges on one game.
package tournament

import (
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	RoundRobin = "ROUND_ROBIN"
	Knockout   = "KNOCKOUT"
)

type Team struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	PlayerIDs []string `json:"playerIds"`
}
type Fixture struct {
	ID            string  `json:"id"`
	BlueTeamID    *string `json:"blueTeamId"`
	RedTeamID     *string `json:"redTeamId"`
	Status        string  `json:"status"`
	ResultMatchID *string `json:"resultMatchId"`
	WinnerTeamID  *string `json:"winnerTeamId"`
	BlueScore     int32   `json:"blueScore"`
	RedScore      int32   `json:"redScore"`
}
type Stage struct {
	Name         string    `json:"name"`
	Strategy     string    `json:"strategy"`
	AdvanceCount int       `json:"advanceCount"`
	TeamIDs      []string  `json:"teamIds"`
	Matches      []Fixture `json:"matches"`
}
type Tournament struct {
	ID           string     `json:"id"`
	GroupID      string     `json:"groupId"`
	SeasonID     string     `json:"seasonId"`
	Name         string     `json:"name"`
	TeamSize     int        `json:"teamSize"`
	Status       string     `json:"status"`
	CreatedAt    time.Time  `json:"createdAt"`
	EndedAt      *time.Time `json:"endedAt"`
	WinnerTeamID *string    `json:"winnerTeamId"`
	Teams        []Team     `json:"teams"`
	Stages       []Stage    `json:"stages"`
}
type Create struct {
	Name     string  `json:"name"`
	SeasonID string  `json:"seasonId"`
	TeamSize int     `json:"teamSize"`
	Teams    []Team  `json:"teams"`
	Stages   []Stage `json:"stages"`
}
type Standing struct {
	TeamID   string `json:"teamId"`
	Played   int    `json:"played"`
	Wins     int    `json:"wins"`
	Scored   int32  `json:"scored"`
	Conceded int32  `json:"conceded"`
}

var ErrInvalid = errors.New("invalid tournament plan")

func New(id, groupID string, in Create, now time.Time) (Tournament, error) {
	t := Tournament{ID: id, GroupID: groupID, SeasonID: in.SeasonID, Name: strings.TrimSpace(in.Name), TeamSize: in.TeamSize, Status: "ACTIVE", CreatedAt: now, Teams: in.Teams, Stages: in.Stages}
	if len([]rune(t.Name)) < 2 || len([]rune(t.Name)) > 80 || t.TeamSize < 1 || t.TeamSize > 10 || len(t.Teams) < 2 || len(t.Teams) > 32 || len(t.Stages) == 0 || len(t.Stages) > 10 {
		return t, ErrInvalid
	}
	used := map[string]bool{}
	ids := []string{}
	for i := range t.Teams {
		team := &t.Teams[i]
		team.ID = uuid.NewString()
		team.Name = strings.TrimSpace(team.Name)
		if team.Name == "" {
			team.Name = fmt.Sprintf("Team %d", i+1)
		}
		if len([]rune(team.Name)) > 80 || len(team.PlayerIDs) != t.TeamSize {
			return t, ErrInvalid
		}
		for _, p := range team.PlayerIDs {
			if _, err := uuid.Parse(p); err != nil || used[p] {
				return t, ErrInvalid
			}
			used[p] = true
		}
		ids = append(ids, team.ID)
	}
	count := len(ids)
	for i := range t.Stages {
		stage := &t.Stages[i]
		stage.Name = strings.TrimSpace(stage.Name)
		if len([]rune(stage.Name)) < 2 || len([]rune(stage.Name)) > 80 || count < 2 {
			return t, ErrInvalid
		}
		switch stage.Strategy {
		case Knockout:
			if stage.AdvanceCount != (count+1)/2 {
				return t, ErrInvalid
			}
		case RoundRobin:
			if stage.AdvanceCount < 1 || stage.AdvanceCount >= count {
				return t, ErrInvalid
			}
		default:
			return t, ErrInvalid
		}
		if i == len(t.Stages)-1 && stage.AdvanceCount != 1 {
			return t, ErrInvalid
		}
		stage.TeamIDs = []string{}
		n := (count + 1) / 2
		if stage.Strategy == RoundRobin {
			n = count * (count - 1) / 2
		}
		stage.Matches = make([]Fixture, n)
		for j := range stage.Matches {
			stage.Matches[j] = Fixture{ID: uuid.NewString(), Status: "BLOCKED"}
		}
		count = stage.AdvanceCount
	}
	t.seed(0, ids)
	t.Advance(now)
	return t, nil
}

func (t *Tournament) Team(id string) *Team {
	for i := range t.Teams {
		if t.Teams[i].ID == id {
			return &t.Teams[i]
		}
	}
	return nil
}
func (t *Tournament) Fixture(id string) (*Stage, *Fixture) {
	for i := range t.Stages {
		for j := range t.Stages[i].Matches {
			if t.Stages[i].Matches[j].ID == id {
				return &t.Stages[i], &t.Stages[i].Matches[j]
			}
		}
	}
	return nil, nil
}
func str(s string) *string { return &s }
func (t *Tournament) seed(index int, ids []string) {
	stage := &t.Stages[index]
	stage.TeamIDs = slices.Clone(ids)
	j := 0
	if stage.Strategy == RoundRobin {
		for a := 0; a < len(ids); a++ {
			for b := a + 1; b < len(ids); b++ {
				stage.Matches[j].BlueTeamID, stage.Matches[j].RedTeamID, stage.Matches[j].Status = str(ids[a]), str(ids[b]), "READY"
				j++
			}
		}
	} else {
		// Pair high seeds against low seeds. An odd field gives the highest seed a bye.
		for j := range stage.Matches {
			f := &stage.Matches[j]
			f.BlueTeamID, f.Status = str(ids[j]), "READY"
			other := len(stage.Matches)*2 - 1 - j
			if other < len(ids) {
				f.RedTeamID = str(ids[other])
			} else {
				f.Status, f.WinnerTeamID = "BYE", str(ids[j])
			}
		}
	}
}

// Standings use wins, then point difference, then points scored, then original
// seeding. This final tie-break stays deterministic across phones and replays.
func Standings(stage Stage) []Standing {
	rows := make([]Standing, len(stage.TeamIDs))
	for i, id := range stage.TeamIDs {
		rows[i].TeamID = id
	}
	for _, f := range stage.Matches {
		if f.Status != "FINISHED" {
			continue
		}
		for i := range rows {
			row := &rows[i]
			if f.BlueTeamID != nil && row.TeamID == *f.BlueTeamID {
				row.Played++
				row.Scored += f.BlueScore
				row.Conceded += f.RedScore
			}
			if f.RedTeamID != nil && row.TeamID == *f.RedTeamID {
				row.Played++
				row.Scored += f.RedScore
				row.Conceded += f.BlueScore
			}
			if f.WinnerTeamID != nil && row.TeamID == *f.WinnerTeamID {
				row.Wins++
			}
		}
	}
	slices.SortStableFunc(rows, func(a, b Standing) int {
		if a.Wins != b.Wins {
			return b.Wins - a.Wins
		}
		ad, bd := a.Scored-a.Conceded, b.Scored-b.Conceded
		if ad != bd {
			if ad > bd {
				return -1
			}
			return 1
		}
		if a.Scored > b.Scored {
			return -1
		}
		if a.Scored < b.Scored {
			return 1
		}
		return 0
	})
	return rows
}
func (t *Tournament) Advance(now time.Time) {
	if t.Status != "ACTIVE" {
		return
	}
	for i, stage := range t.Stages {
		if len(stage.TeamIDs) == 0 {
			return
		}
		winners := []string{}
		for _, f := range stage.Matches {
			if f.Status != "FINISHED" && f.Status != "BYE" {
				return
			}
			if f.WinnerTeamID != nil {
				winners = append(winners, *f.WinnerTeamID)
			}
		}
		if stage.Strategy == RoundRobin {
			winners = []string{}
			for _, row := range Standings(stage)[:stage.AdvanceCount] {
				winners = append(winners, row.TeamID)
			}
		}
		if i == len(t.Stages)-1 {
			t.Status, t.EndedAt, t.WinnerTeamID = "FINISHED", &now, str(winners[0])
		} else if len(t.Stages[i+1].TeamIDs) == 0 {
			t.seed(i+1, winners)
		}
	}
}

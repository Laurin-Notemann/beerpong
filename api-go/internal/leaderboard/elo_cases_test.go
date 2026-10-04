package leaderboard

import (
	"encoding/json"
	"flag"
	"fmt"
	"math"
	"os"
	"sort"
	"strconv"
	"strings"
	"testing"
)

var updateEloCases = flag.Bool("update-elo-cases", false, "rewrite testdata/elo-testcases.out")

// TestEloCases is the Java EloTest: it plays the 62 recorded matches in
// testdata/elo-testcases.json through the Elo algorithm and prints every
// player's rating change and the final standings, line for line like the
// Java test did. testdata/elo-testcases.out is the Java test's output, so the
// test fails when the Go ratings drift from Java's. Run with -v to see it.
func TestEloCases(t *testing.T) {
	raw, err := os.ReadFile("testdata/elo-testcases.json")
	if err != nil {
		t.Fatal(err)
	}
	var games []struct {
		MatchID string `json:"matchId"`
		Teams   []struct {
			TeamID  string `json:"teamId"`
			Players []struct {
				PlayerName string `json:"playerName"`
				Points     int64  `json:"points"`
			} `json:"players"`
		} `json:"teams"`
	}
	if err := json.Unmarshal(raw, &games); err != nil {
		t.Fatal(err)
	}
	if len(games) != 62 {
		t.Fatalf("got %d games, want 62", len(games))
	}

	stats := map[string]*Stats{}
	var names []string
	for _, g := range games {
		for _, team := range g.Teams {
			for _, p := range team.Players {
				if stats[p.PlayerName] == nil {
					stats[p.PlayerName] = &Stats{Elo: StartingElo, PlayerID: p.PlayerName}
					names = append(names, p.PlayerName)
				}
			}
		}
	}

	var out strings.Builder
	println := func(parts ...string) { out.WriteString(strings.Join(parts, "") + "\n") }

	for _, g := range games {
		if len(g.Teams) != 2 {
			continue
		}
		blueTeam, redTeam := g.Teams[0], g.Teams[1]
		var bluePoints, redPoints int64
		for _, p := range blueTeam.Players {
			bluePoints += p.Points
		}
		for _, p := range redTeam.Players {
			redPoints += p.Points
		}
		playerPoints := map[string]int64{}
		eloBefore := map[string]float64{}
		for _, team := range g.Teams {
			for _, p := range team.Players {
				playerPoints[p.PlayerName] += p.Points
				eloBefore[p.PlayerName] = stats[p.PlayerName].Elo
			}
		}
		var blue, red []*Stats
		for _, p := range blueTeam.Players {
			blue = append(blue, stats[p.PlayerName])
		}
		for _, p := range redTeam.Players {
			red = append(red, stats[p.PlayerName])
		}

		blueAvg, redAvg := averageElo(blue), averageElo(red)
		expectedBlue := expectedScore(blueAvg, redAvg)
		expectedRed := 1.0 - expectedBlue
		resultBlue := 0.0
		if bluePoints == redPoints {
			resultBlue = 0.5
		} else if bluePoints > redPoints {
			resultBlue = 1.0
		}
		resultRed := 1.0 - resultBlue

		winner := redTeam.TeamID
		if resultBlue == 1.0 {
			winner = blueTeam.TeamID
		}
		calculateElo(winner, blueTeam.TeamID, bluePoints, redPoints, blue, red, playerPoints)

		// like the Java test, the shares are printed with the updated ratings
		expShare, actShare := map[string]float64{}, map[string]float64{}
		expectedShare(blue, expShare)
		expectedShare(red, expShare)
		actualShare(blue, playerPoints, bluePoints, actShare)
		actualShare(red, playerPoints, redPoints, actShare)

		printTeam := func(team []*Stats, points []int64) {
			for i, s := range team {
				diff := s.Elo - eloBefore[s.PlayerID]
				s.Matches++
				change := "loss: "
				if diff >= 0 {
					s.Wins++
					change = "gain: +"
				}
				println("  ", s.PlayerID, ":",
					" points: ", strconv.FormatInt(points[i], 10),
					" elo before: ", javaDouble(round2(eloBefore[s.PlayerID])),
					" elo after: ", javaDouble(round2(s.Elo)),
					" elo ", change, javaDouble(round2(diff)),
					" exp share: ", javaDouble(round2(expShare[s.PlayerID])),
					" act share: ", javaDouble(round2(actShare[s.PlayerID])))
			}
		}
		pointsOf := func(i int) []int64 {
			var ps []int64
			for _, p := range g.Teams[i].Players {
				ps = append(ps, p.Points)
			}
			return ps
		}

		println("------------------------------")
		println("game: ", g.MatchID)
		println()
		println("team blue (points: ", strconv.FormatInt(bluePoints, 10), " avg: ", javaDouble(round2(blueAvg)), " exp: ", javaDouble(round2(expectedBlue)), " act: ", javaDouble(resultBlue), ")")
		printTeam(blue, pointsOf(0))
		println()
		println("team red (points: ", strconv.FormatInt(redPoints, 10), " avg: ", javaDouble(round2(redAvg)), " exp: ", javaDouble(round2(expectedRed)), " act: ", javaDouble(resultRed), ")")
		printTeam(red, pointsOf(1))
	}

	// HashMap values, stably sorted by Elo, then reversed
	var standings []*Stats
	for _, name := range javaHashMapOrder(names) {
		standings = append(standings, stats[name])
	}
	sort.SliceStable(standings, func(i, j int) bool { return standings[i].Elo < standings[j].Elo })
	for i, j := 0, len(standings)-1; i < j; i, j = i+1, j-1 {
		standings[i], standings[j] = standings[j], standings[i]
	}
	println()
	println()
	println("final standings:")
	for i, s := range standings {
		println(fmt.Sprintf("  %d. %s elo: %s games: %d wins: %d", i+1, s.PlayerID, javaDouble(round2(s.Elo)), s.Matches, s.Wins))
	}

	got := out.String()
	if testing.Verbose() {
		fmt.Print(got)
	}
	if *updateEloCases {
		if err := os.WriteFile("testdata/elo-testcases.out", []byte(got), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	want, err := os.ReadFile("testdata/elo-testcases.out")
	if err != nil {
		t.Fatal(err)
	}
	if got != string(want) {
		gotLines, wantLines := strings.Split(got, "\n"), strings.Split(string(want), "\n")
		for i := range min(len(gotLines), len(wantLines)) {
			if gotLines[i] != wantLines[i] {
				t.Fatalf("line %d differs from the Java output\n got: %s\nwant: %s", i+1, gotLines[i], wantLines[i])
			}
		}
		t.Fatalf("output has %d lines, the Java output %d", len(gotLines), len(wantLines))
	}
}

// round2 is the Java test's Math.round(d * 100.0) / 100.0.
func round2(d float64) float64 { return math.Floor(d*100.0+0.5) / 100.0 }

// javaDouble formats like Java's Double.toString for the values printed here.
func javaDouble(d float64) string {
	s := strconv.FormatFloat(d, 'f', -1, 64)
	if !strings.Contains(s, ".") {
		s += ".0"
	}
	return s
}


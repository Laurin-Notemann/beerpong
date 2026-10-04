package api

import "github.com/laurin-notemann/beerpong/api-go/internal/database/db"

// defaultCups is how many cups a move takes off the table. The match score
// is the sum of these, so a won match ends at 10: a Bouncer takes two cups,
// a Bomb one (it's worth two points, not two cups), the last cup is entered
// as a normal hit and the finish on top of it adds none, a Save (the last hit
// in overtime) adds none, and the rings take their whole formation.
var defaultCups = map[string]int32{
	"Normal":                 1,
	"Bomb":                   1,
	"Bouncer":                2,
	"Trickshot":              1,
	"Save":                   0,
	"Finish - Normal":        0,
	"Finish - Ring of fire":  6,
	"Finish - Ring of water": 4,
}

// defaultCupsFor is the cup count of a move that never had one: the default
// moves by name, otherwise 1 (a finish 0).
func defaultCupsFor(name *string, finish bool) int32 {
	if name != nil {
		if c, ok := defaultCups[*name]; ok {
			return c
		}
	}
	if finish {
		return 0
	}
	return 1
}

// cupsPerHit resolves rows from before the cups column existed.
func cupsPerHit(m db.RuleMove) int32 {
	if m.Cups != nil {
		return *m.Cups
	}
	return defaultCupsFor(m.Name, m.FinishingMove)
}

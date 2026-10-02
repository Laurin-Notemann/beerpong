package harness

import (
	"encoding/base64"
	"encoding/json"
	"sort"
	"strings"
)

// User is a signed-up device with a refresh and an access token.
type User struct {
	ID      string
	Refresh string
	Access  string
}

func (u *User) Bearer() string { return "Bearer " + u.Access }

// NewUser signs up a fresh device and exchanges its refresh token.
func (h *H) NewUser() *User {
	h.Helper()
	// device ids are not unique in the backend; a fixed one keeps transcripts stable
	device := "api-tests-device"
	signup := h.OK(h.Do(Req{Method: "POST", Path: "/auth/signup", Body: map[string]any{"installationType": "IOS", "deviceId": device}}))
	u := &User{Refresh: signup.Str("token")}
	u.ID = JWTSubject(u.Refresh)
	refresh := h.OK(h.Do(Req{Method: "POST", Path: "/auth/refresh", Body: map[string]any{"refreshToken": u.Refresh}}))
	u.Access = refresh.Str("token")
	return u
}

// JWTSubject reads the sub claim without verifying the signature.
func JWTSubject(token string) string {
	claims := JWTClaims(token)
	s, _ := claims["sub"].(string)
	return s
}

func JWTClaims(token string) map[string]any {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil
	}
	b, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil
	}
	var claims map[string]any
	_ = json.Unmarshal(b, &claims)
	return claims
}

// Group is a created group with lookups by name for profiles, players and rule moves.
type Group struct {
	ID         string
	SeasonID   string
	InviteCode string
	Owner      *User
	Profiles   map[string]string // name -> profile id
	Players    map[string]string // name -> player id in the active season
	Moves      map[string]string // rule move name -> id in the active season
}

func (g *Group) Path(suffix string) string       { return "/groups/" + g.ID + suffix }
func (g *Group) SeasonPath(suffix string) string { return g.Path("/seasons/" + g.SeasonID + suffix) }

// NewGroup creates a group (beerpong preset unless overridden) owned by owner
// and loads its profiles, players and rule moves.
func (h *H) NewGroup(owner *User, name string, profiles ...string) *Group {
	h.Helper()
	return h.NewGroupWith(owner, map[string]any{"name": name, "profileNames": profiles, "sportPreset": "beerpong"})
}

func (h *H) NewGroupWith(owner *User, body map[string]any) *Group {
	h.Helper()
	res := h.OK(h.Do(Req{Method: "POST", Path: "/groups", Body: body, Auth: owner.Bearer()}))
	g := &Group{ID: res.Str("id"), SeasonID: res.Str("activeSeasonId"), InviteCode: res.Str("inviteCode"), Owner: owner}
	h.Reload(g)
	return g
}

// Reload refreshes the active season and the name lookups.
func (h *H) Reload(g *Group) {
	h.Helper()
	group := h.OK(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: g.Owner.Bearer(), Skip: true}))
	g.SeasonID = group.Str("activeSeasonId")
	g.Profiles = map[string]string{}
	byProfile := map[string]string{}
	for _, p := range h.OK(h.Do(Req{Method: "GET", Path: g.Path("/profiles"), Auth: g.Owner.Bearer(), Skip: true})).List() {
		name, _ := Get(p, "name").(string)
		id, _ := Get(p, "id").(string)
		g.Profiles[name] = id
		byProfile[id] = name
	}
	g.Players = map[string]string{}
	for _, p := range h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players?showInactive=true"), Auth: g.Owner.Bearer(), Skip: true})).List() {
		profile, _ := Get(p, "profileId").(string)
		id, _ := Get(p, "id").(string)
		g.Players[byProfile[profile]] = id
	}
	g.Moves = map[string]string{}
	for _, m := range h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/rule-moves"), Auth: g.Owner.Bearer(), Skip: true})).List() {
		name, _ := Get(m, "name").(string)
		id, _ := Get(m, "id").(string)
		g.Moves[name] = id
	}
	h.norm.Register(g.ID)
	h.norm.Register(g.SeasonID)
	for _, lookup := range []map[string]string{g.Profiles, g.Players, g.Moves} {
		for _, name := range sortedKeys(lookup) {
			h.norm.Register(lookup[name])
		}
	}
}

func sortedKeys(m map[string]string) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

// Member is one player's line in a match: player name and move counts by rule move name.
type Member struct {
	Player string
	Moves  map[string]int
}

// MatchBody builds a MatchCreateDto from player and move names. Moves are
// listed in name order so request bodies are stable.
func (g *Group) MatchBody(blue, red []Member) map[string]any {
	team := func(members []Member) map[string]any {
		tm := []any{}
		for _, m := range members {
			moves := []any{}
			names := make([]string, 0, len(m.Moves))
			for name := range m.Moves {
				names = append(names, name)
			}
			sort.Strings(names)
			for _, name := range names {
				moves = append(moves, map[string]any{"moveId": g.Moves[name], "count": m.Moves[name]})
			}
			tm = append(tm, map[string]any{"playerId": g.Players[m.Player], "moves": moves})
		}
		return map[string]any{"teamMembers": tm}
	}
	return map[string]any{"teams": []any{team(blue), team(red)}}
}

// CreateMatch posts a match in the group's active season as user.
func (h *H) CreateMatch(u *User, g *Group, blue, red []Member) *Resp {
	h.Helper()
	return h.Do(Req{Method: "POST", Path: g.SeasonPath("/matches"), Body: g.MatchBody(blue, red), Auth: u.Bearer()})
}

// Join makes u an active member of g.
func (h *H) Join(u *User, g *Group) {
	h.Helper()
	h.OK(h.Do(Req{Method: "POST", Path: g.Path("/join"), Auth: u.Bearer()}))
}

// StartSeason ends the active season under oldName and starts a new one with
// the default beerpong rule moves, then reloads g.
func (h *H) StartSeason(g *Group, oldName string) *Resp {
	h.Helper()
	res := h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/active-season"), Auth: g.Owner.Bearer(), Body: map[string]any{
		"oldSeasonName": oldName,
		"ruleMoves":     DefaultBeerpongMoves(),
	}}))
	h.Reload(g)
	return res
}

func DefaultBeerpongMoves() []any {
	return []any{
		map[string]any{"name": "Normal", "pointsForScorer": 1, "pointsForTeam": 0, "finishingMove": false},
		map[string]any{"name": "Bomb", "pointsForScorer": 2, "pointsForTeam": 0, "finishingMove": false},
		map[string]any{"name": "Finish - Normal", "pointsForScorer": 1, "pointsForTeam": 3, "finishingMove": true},
	}
}

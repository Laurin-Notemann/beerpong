package apitests

import (
	"strings"
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

func TestCreateGroupBeerpong(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	res := h.OK(h.Do(Req{Method: "POST", Path: "/groups", Auth: owner.Bearer(), Body: map[string]any{
		"name": "Beer Friends", "profileNames": []string{"Anna", "Ben", "Cleo"}, "sportPreset": "beerpong",
	}}))
	h.Equal(res.Str("name"), "Beer Friends", "name")
	h.Equal(len(res.Str("inviteCode")), 9, "invite code length")
	h.Equal(res.Str("sportPreset", "id"), "beerpong", "preset")
	h.Equal(res.Data("customSportName"), nil, "custom sport")
	h.Equal(res.Data("assetIdWallpaper"), nil, "wallpaper")
	h.True(res.Str("createdById") != "", "createdById is the owner's membership")
	h.True(res.Str("activeSeasonId") != "", "group starts with an active season")
	for _, k := range []string{"numberOfPlayers", "numberOfMatches", "numberOfSeasons"} {
		h.Equal(res.Num(k), 0, k+" on create")
	}

	g := &Group{ID: res.Str("id"), SeasonID: res.Str("activeSeasonId"), Owner: owner}
	h.Reload(g)
	h.Equal(len(g.Profiles), 3, "profiles created")
	h.Equal(len(g.Players), 3, "players created in the first season")
	h.Equal(len(g.Moves), 8, "beerpong rule moves")

	rules := h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/rules"), Auth: owner.Bearer()}))
	h.Equal(len(rules.List()), 19, "beerpong default rules")
	h.Equal(Get(rules.List()[0], "createdById"), res.Str("createdById"), "rule creator")
	h.Equal(Get(rules.List()[0], "title"), "Teams", "first default rule")
	h.Equal(Get(rules.List()[18], "title"), "Saves", "last default rule")

	moves := h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/rule-moves"), Auth: owner.Bearer()}))
	finishes := 0
	cups := map[string]any{}
	for _, m := range moves.List() {
		if Get(m, "finishingMove") == true {
			finishes++
		}
		cups[Get(m, "name").(string)] = Get(m, "cups")
	}
	h.Equal(finishes, 3, "beerpong finishing moves")
	h.Equal(cups, map[string]any{
		"Normal": 1.0, "Bomb": 1.0, "Bouncer": 2.0, "Trickshot": 1.0, "Save": 0.0,
		"Finish - Normal": 0.0, "Finish - Ring of fire": 4.0, "Finish - Ring of water": 6.0,
	}, "cups per move")

	seasons := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/seasons"), Auth: owner.Bearer()}))
	h.Equal(len(seasons.List()), 1, "one season")
	h.Equal(Get(seasons.List()[0], "seasonSettings", "wakeTime"), "00:00:00", "default wake time")
	h.Equal(Get(seasons.List()[0], "seasonSettings", "dailyLeaderboard"), "WAKE_TIME", "default daily leaderboard")
	h.Equal(Get(seasons.List()[0], "seasonSettings", "rankingAlgorithm"), "AVERAGE", "default ranking")

	players := h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players/extended"), Auth: owner.Bearer()}))
	for _, p := range players.List() {
		h.Equal(Get(p, "statistics", "elo"), 1500, "starting elo")
		h.Equal(Get(p, "statistics", "matches"), 0, "no matches yet")
	}
}

func TestCreateGroupPresetsAndCustomSports(t *testing.T) {
	h := New(t)
	owner := h.NewUser()

	kicker := h.OK(h.Do(Req{Method: "POST", Path: "/groups", Auth: owner.Bearer(), Body: map[string]any{"name": "Kicker", "profileNames": []string{"a"}, "sportPreset": "kicker"}}))
	g := &Group{ID: kicker.Str("id"), SeasonID: kicker.Str("activeSeasonId"), Owner: owner}
	h.Reload(g)
	h.Equal(len(g.Moves), 2, "generic rule moves")
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/rules"), Auth: owner.Bearer()})).List()), 0, "no default rules outside beerpong")

	custom := h.OK(h.Do(Req{Method: "POST", Path: "/groups", Auth: owner.Bearer(), Body: map[string]any{"name": "Darts", "profileNames": []string{"a"}, "customSportName": "Darts"}}))
	h.Equal(custom.Data("sportPreset"), nil, "custom sport has no preset")
	h.Equal(custom.Str("customSportName"), "Darts", "custom sport name")

	both := h.OK(h.Do(Req{Method: "POST", Path: "/groups", Auth: owner.Bearer(), Body: map[string]any{"name": "Both", "profileNames": []string{"a"}, "sportPreset": "chess", "customSportName": "Ignored"}}))
	h.Equal(both.Str("sportPreset", "id"), "chess", "preset wins")
	h.Equal(both.Data("customSportName"), nil, "custom name dropped when a preset is set")

	h.Fail(h.Do(Req{Method: "POST", Path: "/groups", Auth: owner.Bearer(), Body: map[string]any{"name": "None", "profileNames": []string{"a"}}}), 400, "invalidGroupSport")
	h.Fail(h.Do(Req{Method: "POST", Path: "/groups", Auth: owner.Bearer(), Body: map[string]any{"name": "Unknown", "profileNames": []string{"a"}, "sportPreset": "curling"}}), 400, "invalidGroupSport")
	h.Fail(h.Do(Req{Method: "POST", Path: "/groups", Auth: owner.Bearer(), Body: map[string]any{"name": "Blank", "profileNames": []string{"a"}, "customSportName": "  "}}), 400, "invalidGroupSport")

	unknownPresetWithCustom := h.OK(h.Do(Req{Method: "POST", Path: "/groups", Auth: owner.Bearer(), Body: map[string]any{"name": "Fallback", "profileNames": []string{"a"}, "sportPreset": "curling", "customSportName": "Curling"}}))
	h.Equal(unknownPresetWithCustom.Data("sportPreset"), nil, "unknown preset is dropped")
	h.Equal(unknownPresetWithCustom.Str("customSportName"), "Curling", "custom name kept")
}

func TestCreateGroupValidation(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	create := func(body map[string]any) *Resp {
		return h.Do(Req{Method: "POST", Path: "/groups", Auth: owner.Bearer(), Body: body})
	}
	for _, name := range []any{nil, "", "   ", "a", strings.Repeat("x", 51)} {
		h.Fail(create(map[string]any{"name": name, "profileNames": []string{"a"}, "sportPreset": "beerpong"}), 400, "invalidGroupName")
	}
	h.OK(create(map[string]any{"name": strings.Repeat("x", 50), "profileNames": []string{"a"}, "sportPreset": "beerpong"}))
	h.OK(create(map[string]any{"name": " a", "profileNames": []string{"a"}, "sportPreset": "beerpong"}))

	for _, names := range []any{nil, []string{}, []string{"a", "b", "a"}} {
		h.Fail(create(map[string]any{"name": "valid", "profileNames": names, "sportPreset": "beerpong"}), 400, "invalidGroupProfileNames")
	}
	// name is validated before profile names
	h.Fail(create(map[string]any{"name": "x", "profileNames": nil}), 400, "invalidGroupName")
	// profile names before the sport
	h.Fail(create(map[string]any{"name": "valid", "profileNames": nil}), 400, "invalidGroupProfileNames")
}

func TestGroupLookup(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Lookup", "a", "b")
	other := h.NewUser()

	h.CreateMatch(owner, g, []Member{{"a", map[string]int{"Normal": 1, "Finish - Normal": 1}}}, []Member{{"b", nil}})
	byID := h.OK(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: owner.Bearer()}))
	h.Equal(byID.Num("numberOfPlayers"), 2, "numberOfPlayers by id")
	h.Equal(byID.Num("numberOfMatches"), 1, "numberOfMatches by id")
	h.Equal(byID.Num("numberOfSeasons"), 1, "numberOfSeasons by id")

	byCode := h.OK(h.Do(Req{Method: "GET", Path: "/groups?inviteCode=" + g.InviteCode, Auth: other.Bearer()}))
	h.Equal(byCode.Str("id"), g.ID, "lookup by invite code")
	h.Fail(h.Do(Req{Method: "GET", Path: "/groups?inviteCode=NOPE12345", Auth: other.Bearer()}), 404, "groupInviteNotFound")
	h.Fail(h.Do(Req{Method: "GET", Path: "/groups?inviteCode=", Auth: other.Bearer()}), 400, "invalidGroupInviteCode")
	h.Fail(h.Do(Req{Method: "GET", Path: "/groups?inviteCode=%20%20", Auth: other.Bearer()}), 400, "invalidGroupInviteCode")
	h.SpringError(h.Do(Req{Method: "GET", Path: "/groups", Auth: other.Bearer()}), 400, "Bad Request", "/groups")
}

func TestUserGroupsWithStats(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: "/groups/user", Auth: owner.Bearer()})).List()), 0, "new user has no groups")

	g := h.NewGroup(owner, "Stats", "a", "b", "c")
	h.CreateMatch(owner, g, []Member{{"a", map[string]int{"Normal": 2, "Finish - Normal": 1}}}, []Member{{"b", map[string]int{"Normal": 1}}})
	h.NewGroup(owner, "Second", "x")

	groups := h.OK(h.Do(Req{Method: "GET", Path: "/groups/user", Auth: owner.Bearer()}))
	h.Equal(len(groups.List()), 2, "user groups")
	for _, gr := range groups.List() {
		if Get(gr, "id") == g.ID {
			h.Equal(Get(gr, "numberOfPlayers"), 3, "players in active season")
			h.Equal(Get(gr, "numberOfMatches"), 1, "matches in active season")
			h.Equal(Get(gr, "numberOfSeasons"), 1, "seasons")
		}
	}

	h.OK(h.Do(Req{Method: "POST", Path: g.Path("/leave"), Auth: owner.Bearer()}))
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: "/groups/user", Auth: owner.Bearer()})).List()), 1, "left group is gone")
}

func TestUpdateGroup(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Before", "a")
	ws := h.Listen(g.ID)

	res := h.OK(h.Do(Req{Method: "PUT", Path: g.Path(""), Auth: owner.Bearer(), Body: map[string]any{"name": "After", "profileNames": []string{"ignored"}, "sportPreset": "chess"}}))
	h.Equal(res.Str("name"), "After", "renamed")
	h.Equal(res.Str("sportPreset", "id"), "beerpong", "preset unchanged")
	events := ws.Expect(1)
	h.Equal(EventScope(events[0]), "groupUpdate", "event scope")
	h.Equal(EventType(events[0]), "GROUPS", "event type")
	h.Equal(EventGroupID(events[0]), g.ID, "event group")

	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path(""), Auth: owner.Bearer(), Body: map[string]any{"name": "x"}}), 400, "invalidGroupName")
	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path(""), Auth: owner.Bearer(), Body: map[string]any{}}), 400, "invalidGroupName")
	ws.ExpectNone()
}

func TestJoinAndLeave(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Membership", "a", "b")
	friend := h.NewUser()

	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: friend.Bearer()}), "No access to this group!")
	h.Equal(h.OK(h.Do(Req{Method: "POST", Path: g.Path("/join"), Auth: friend.Bearer()})).Data(), "OK", "join")
	h.OK(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: friend.Bearer()}))
	h.Fail(h.Do(Req{Method: "POST", Path: g.Path("/join"), Auth: friend.Bearer()}), 403, "groupAlreadyInGroup")
	h.Fail(h.Do(Req{Method: "POST", Path: "/groups/00000000-0000-0000-0000-000000000000/join", Auth: friend.Bearer()}), 403, "groupAlreadyInGroup")

	h.Equal(h.OK(h.Do(Req{Method: "POST", Path: g.Path("/leave"), Auth: friend.Bearer()})).Data(), "OK", "leave")
	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: friend.Bearer()}), "No access to this group!")
	h.Unauthorized(h.Do(Req{Method: "POST", Path: g.Path("/leave"), Auth: friend.Bearer()}), "No access to this group!")

	// rejoining reactivates the membership
	h.OK(h.Do(Req{Method: "POST", Path: g.Path("/join"), Auth: friend.Bearer()}))
	h.OK(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: friend.Bearer()}))

	// matches created by a joined member reference their own membership
	match := h.OK(h.CreateMatch(friend, g, []Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"b", nil}}))
	h.True(match.Str("createdById") != "", "match creator is the friend's membership")
}

func TestGroupWallpaper(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Wallpaper", "a")
	ws := h.Listen(g.ID)

	first := h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/wallpaper"), Auth: owner.Bearer()}))
	h.Equal(first.Str("type"), "GROUP_WALLPAPER", "asset type")
	h.Equal(first.Num("zoom"), 0, "default zoom")
	h.True(strings.HasSuffix(first.Str("url"), "/"+first.Str("id")), "public url ends with the asset id: %s", first.Str("url"))
	h.True(strings.Contains(first.Str("singleUploadUrl"), "X-Amz-Signature="), "presigned upload url")
	ev := ws.Expect(1)
	h.Equal(EventScope(ev[0]), "groupWallpaperSet", "wallpaper event")
	h.Equal(EventType(ev[0]), "ASSETS", "wallpaper event type")

	group := h.OK(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: owner.Bearer()}))
	h.Equal(group.Str("assetIdWallpaper"), first.Str("id"), "group points at wallpaper")
	h.OK(h.Do(Req{Method: "GET", Path: "/assets/" + first.Str("id")}))

	cropped := h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/wallpaper"), Auth: owner.Bearer(), Body: map[string]any{"offsetX": 1.5, "offsetY": 2, "zoom": 1.25}}))
	h.Equal(cropped.Num("offsetX"), 1.5, "offsetX")
	h.Equal(cropped.Num("zoom"), 1.25, "zoom")
	ws.Expect(1)
	// replacing the wallpaper deletes the previous asset
	h.Fail(h.Do(Req{Method: "GET", Path: "/assets/" + first.Str("id")}), 404, "assetNotFound")
	asset := h.OK(h.Do(Req{Method: "GET", Path: "/assets/" + cropped.Str("id")}))
	h.Equal(asset.Num("offsetY"), 2, "stored offsetY")

	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/wallpaper"), Auth: owner.Bearer(), Body: map[string]any{"offsetX": -1, "offsetY": 0, "zoom": 1}}), 400, "assetValidationFailed")
	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/wallpaper"), Auth: owner.Bearer(), Body: map[string]any{"zoom": -0.5}}), 400, "assetValidationFailed")

	deleted := h.OK(h.Do(Req{Method: "DELETE", Path: g.Path("/wallpaper"), Auth: owner.Bearer()}))
	h.Equal(deleted.Data("assetIdWallpaper"), nil, "wallpaper cleared")
	ev = ws.Expect(1)
	h.Equal(EventScope(ev[0]), "groupWallpaperDelete", "wallpaper delete event")
	h.Fail(h.Do(Req{Method: "GET", Path: "/assets/" + cropped.Str("id")}), 404, "assetNotFound")
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.Path("/wallpaper"), Auth: owner.Bearer()}), 404, "groupHasNoWallpaper")
	ws.ExpectNone()
}

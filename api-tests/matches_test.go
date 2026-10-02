package apitests

import (
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

func TestCreateAndReadMatch(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Matches", "a", "b", "c", "d")
	ws := h.Listen(g.ID)

	created := h.OK(h.CreateMatch(owner, g,
		[]Member{{"a", map[string]int{"Normal": 2, "Bomb": 1}}, {"b", map[string]int{"Finish - Normal": 1, "Normal": 0}}},
		[]Member{{"c", map[string]int{"Normal": 3}}, {"d", map[string]int{"Trickshot": 1}}},
	))
	matchID := created.Str("id")
	h.Equal(created.Str("seasonId"), g.SeasonID, "season")
	h.True(created.Str("createdById") != "", "creator membership")
	h.Equal(len(created.List("photoUploads")), 0, "no photo uploads requested")
	ev := ws.Expect(1)
	h.Equal(EventScope(ev[0]), "matchCreate", "create event")
	h.Equal(EventType(ev[0]), "MATCHES", "event type")
	h.Equal(Get(ev[0], "body", "id"), matchID, "event body is the match")

	path := g.SeasonPath("/matches/" + matchID)
	match := h.OK(h.Do(Req{Method: "GET", Path: path, Auth: owner.Bearer()}))
	h.Equal(match.Data("photoUploads"), nil, "photoUploads only on writes")
	h.Equal(match.Str("createdById"), created.Str("createdById"), "creator")

	extended := h.OK(h.Do(Req{Method: "GET", Path: path + "/extended", Auth: owner.Bearer()}))
	h.Equal(len(extended.List("teams")), 2, "teams")
	h.Equal(len(extended.List("teamMembers")), 4, "team members")
	// moves with count 0 are not stored
	h.Equal(len(extended.List("matchMoves")), 5, "match moves")

	overview := h.OK(h.Do(Req{Method: "GET", Path: path + "/overview", Auth: owner.Bearer(), Ordered: true}))
	// blue: a = 2*1 + 1*2 = 4, b = finish 1 scorer + 3 team (once per member for the team total)
	h.Equal(overview.Num("blueTeam", "points"), 4+1+3*2, "blue team points")
	h.Equal(overview.Num("redTeam", "points"), 3+2, "red team points")
	for _, m := range overview.List("blueTeam", "members") {
		switch Get(m, "playerId") {
		case g.Players["a"]:
			h.Equal(Get(m, "points"), 4, "a points")
		case g.Players["b"]:
			h.Equal(Get(m, "points"), 4, "b points (scorer + team)")
		}
	}

	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches"), Auth: owner.Bearer()})).List()), 1, "match list")
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/extended"), Auth: owner.Bearer()})).List()), 1, "extended list")
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/overview"), Auth: owner.Bearer()})).List()), 1, "overview list")

	h.Fail(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/nope"), Auth: owner.Bearer()}), 404, "matchNotFound")
	h.Fail(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/nope/extended"), Auth: owner.Bearer()}), 404, "matchNotFound")
	h.Fail(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/nope/overview"), Auth: owner.Bearer()}), 404, "matchNotFound")

	other := h.NewGroup(owner, "Other", "z")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + other.SeasonID + "/matches"), Auth: owner.Bearer()}), 404, "seasonHasDifferentGroup")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + other.SeasonID + "/matches/" + matchID), Auth: owner.Bearer()}), 404, "seasonHasDifferentGroup")

	// a match read through another season of the same group
	oldSeason := g.SeasonID
	h.StartSeason(g, "Old")
	ws.Expect(1)
	h.Fail(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/" + matchID), Auth: owner.Bearer()}), 400, "matchGroupOrSeasonIdDontMatch")
	h.Fail(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/" + matchID + "/extended"), Auth: owner.Bearer()}), 400, "matchGroupOrSeasonIdDontMatch")
	h.Fail(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/" + matchID + "/overview"), Auth: owner.Bearer()}), 400, "matchGroupOrSeasonIdDontMatch")
	h.OK(h.Do(Req{Method: "GET", Path: g.Path("/seasons/" + oldSeason + "/matches/" + matchID + "/overview"), Auth: owner.Bearer(), Ordered: true}))
	h.Equal(len(h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches"), Auth: owner.Bearer()})).List()), 0, "new season has no matches")
}

func TestCreateMatchValidation(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Match validation", "a", "b", "c")
	other := h.NewGroup(owner, "Other", "z")
	ws := h.Listen(g.ID)
	post := func(body any) *Resp {
		return h.Do(Req{Method: "POST", Path: g.SeasonPath("/matches"), Auth: owner.Bearer(), Body: body})
	}
	finish := map[string]int{"Finish - Normal": 1}

	// team sizes are checked before the team count
	h.Fail(post(g.MatchBody([]Member{{"a", finish}}, []Member{})), 400, "matchDtoValidationFailed")
	one := g.MatchBody([]Member{{"a", finish}}, []Member{{"b", nil}})
	one["teams"] = one["teams"].([]any)[:1]
	h.Fail(post(one), 400, "matchWrongAmountOfTeams")
	three := g.MatchBody([]Member{{"a", finish}}, []Member{{"b", nil}})
	three["teams"] = append(three["teams"].([]any), map[string]any{"teamMembers": []any{map[string]any{"playerId": g.Players["c"], "moves": []any{}}}})
	h.Fail(post(three), 400, "matchWrongAmountOfTeams")

	for _, c := range []struct {
		name string
		body map[string]any
	}{
		{"duplicate player", g.MatchBody([]Member{{"a", finish}}, []Member{{"a", nil}})},
		{"no finish", g.MatchBody([]Member{{"a", map[string]int{"Normal": 1}}}, []Member{{"b", nil}})},
		{"two finishes", g.MatchBody([]Member{{"a", finish}}, []Member{{"b", finish}})},
		{"two finish kinds", g.MatchBody([]Member{{"a", map[string]int{"Finish - Normal": 1, "Finish - Ring of fire": 1}}}, []Member{{"b", nil}})},
		{"finish count two", g.MatchBody([]Member{{"a", map[string]int{"Finish - Normal": 2}}}, []Member{{"b", nil}})},
		{"finish count zero", g.MatchBody([]Member{{"a", map[string]int{"Finish - Normal": 0}}}, []Member{{"b", nil}})},
	} {
		h.Note("%s", c.name)
		h.Fail(post(c.body), 400, "matchDtoValidationFailed")
	}

	foreignMove := g.MatchBody([]Member{{"a", finish}}, []Member{{"b", nil}})
	foreignMove["teams"].([]any)[1].(map[string]any)["teamMembers"].([]any)[0].(map[string]any)["moves"] = []any{map[string]any{"moveId": other.Moves["Normal"], "count": 1}}
	h.Fail(post(foreignMove), 400, "matchDtoValidationFailed")

	unknownMove := g.MatchBody([]Member{{"a", finish}}, []Member{{"b", nil}})
	unknownMove["teams"].([]any)[1].(map[string]any)["teamMembers"].([]any)[0].(map[string]any)["moves"] = []any{map[string]any{"moveId": "nope", "count": 1}}
	h.Fail(post(unknownMove), 400, "matchDtoValidationFailed")

	// a move with count 0 may reference anything, it is ignored
	ignored := g.MatchBody([]Member{{"a", finish}}, []Member{{"b", nil}})
	ignored["teams"].([]any)[1].(map[string]any)["teamMembers"].([]any)[0].(map[string]any)["moves"] = []any{map[string]any{"moveId": "nope", "count": 0}}
	h.OK(post(ignored))
	ws.Expect(1)

	foreignPlayer := g.MatchBody([]Member{{"a", finish}}, []Member{{"b", nil}})
	foreignPlayer["teams"].([]any)[1].(map[string]any)["teamMembers"].([]any)[0].(map[string]any)["playerId"] = other.Players["z"]
	h.Fail(post(foreignPlayer), 400, "matchDtoValidationFailed")

	unknownPlayer := g.MatchBody([]Member{{"a", finish}}, []Member{{"b", nil}})
	unknownPlayer["teams"].([]any)[1].(map[string]any)["teamMembers"].([]any)[0].(map[string]any)["playerId"] = "nope"
	h.Fail(post(unknownPlayer), 400, "matchDtoValidationFailed")

	// team size limits from the season settings
	h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + g.SeasonID), Auth: owner.Bearer(), Body: map[string]any{"seasonSettings": map[string]any{"minTeamSize": 2, "maxTeamSize": 2}}}))
	ws.Expect(1)
	h.Fail(post(g.MatchBody([]Member{{"a", finish}}, []Member{{"b", nil}})), 400, "matchDtoValidationFailed")

	// malformed bodies are server errors
	h.SpringError(post(map[string]any{}), 500, "Internal Server Error", g.SeasonPath("/matches"))
	h.SpringError(post(map[string]any{"teams": []any{map[string]any{}, map[string]any{}}}), 500, "Internal Server Error", g.SeasonPath("/matches"))

	h.Fail(h.Do(Req{Method: "POST", Path: g.Path("/seasons/" + other.SeasonID + "/matches"), Auth: owner.Bearer(), Body: map[string]any{"teams": []any{}}}), 404, "seasonHasDifferentGroup")
	h.Fail(h.Do(Req{Method: "POST", Path: g.Path("/seasons/nope/matches"), Auth: owner.Bearer(), Body: map[string]any{"teams": []any{}}}), 404, "seasonNotFound")
	ws.ExpectNone()
}

func TestInactivePlayersCanPlay(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Inactive", "a", "b")
	h.OK(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/players/" + g.Players["b"]), Auth: owner.Bearer()}))
	h.OK(h.CreateMatch(owner, g, []Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"b", nil}}))
}

func TestMatchPhotos(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Photos", "a", "b")
	body := g.MatchBody([]Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"b", nil}})
	body["teams"].([]any)[1].(map[string]any)["savePhoto"] = true
	created := h.OK(h.Do(Req{Method: "POST", Path: g.SeasonPath("/matches"), Auth: owner.Bearer(), Body: body}))
	uploads := created.List("photoUploads")
	h.Equal(len(uploads), 1, "one photo upload")
	h.Equal(Get(uploads[0], "teamId"), nil, "create uploads carry no team id")
	h.Equal(Get(uploads[0], "teamPhoto", "type"), "TEAM_PHOTO", "asset type")
	matchID := created.Str("id")
	matchPath := g.SeasonPath("/matches/" + matchID)

	extended := h.OK(h.Do(Req{Method: "GET", Path: matchPath + "/extended", Auth: owner.Bearer(), Ordered: true}))
	blue := extended.Str("teams", "0", "id")
	red := extended.Str("teams", "1", "id")
	h.Equal(extended.Data("teams", "0", "photoAssetId"), nil, "blue has no photo")
	h.Equal(extended.Str("teams", "1", "photoAssetId"), Get(uploads[0], "teamPhoto", "id"), "red photo")

	groupWS := h.Listen(g.ID)
	matchWS := h.Listen(matchID)
	photo := h.OK(h.Do(Req{Method: "PUT", Path: matchPath + "/photos/" + blue, Auth: owner.Bearer()}))
	h.Equal(photo.Str("type"), "TEAM_PHOTO", "photo type")
	// photo events are addressed to the match id
	groupWS.ExpectNone()
	ev := matchWS.Expect(1)
	h.Equal(EventScope(ev[0]), "matchTeamPhotoSet", "photo set event")
	h.Equal(EventGroupID(ev[0]), matchID, "photo event keyed by match")

	replaced := h.OK(h.Do(Req{Method: "PUT", Path: matchPath + "/photos/" + blue, Auth: owner.Bearer()}))
	matchWS.Expect(1)
	h.Fail(h.Do(Req{Method: "GET", Path: "/assets/" + photo.Str("id")}), 404, "assetNotFound")

	deleted := h.OK(h.Do(Req{Method: "DELETE", Path: matchPath + "/photos/" + blue, Auth: owner.Bearer()}))
	h.Equal(deleted.Data("photoAssetId"), nil, "photo cleared")
	h.Equal(deleted.Str("matchId"), matchID, "team match")
	ev = matchWS.Expect(1)
	h.Equal(EventScope(ev[0]), "matchTeamPhotoDelete", "photo delete event")
	h.Fail(h.Do(Req{Method: "GET", Path: "/assets/" + replaced.Str("id")}), 404, "assetNotFound")
	h.Fail(h.Do(Req{Method: "DELETE", Path: matchPath + "/photos/" + blue, Auth: owner.Bearer()}), 404, "matchTeamHasNoPhoto")

	other := h.OK(h.CreateMatch(owner, g, []Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"b", nil}}))
	h.Fail(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/matches/" + other.Str("id") + "/photos/" + red), Auth: owner.Bearer()}), 403, "matchNoTeamFound")
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/matches/" + other.Str("id") + "/photos/" + red), Auth: owner.Bearer()}), 403, "matchNoTeamFound")
	h.Fail(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/matches/nope/photos/" + red), Auth: owner.Bearer()}), 404, "matchNotFound")
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/matches/nope/photos/" + red), Auth: owner.Bearer()}), 404, "matchNotFound")
	groupWS.Expect(1)

	// photos can still be changed after the season ended
	oldSeason := g.SeasonID
	h.StartSeason(g, "Old")
	groupWS.Expect(1)
	h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + oldSeason + "/matches/" + matchID + "/photos/" + blue), Auth: owner.Bearer()}))
	matchWS.Expect(1)

	h.Fail(h.Do(Req{Method: "DELETE", Path: g.Path("/seasons/" + oldSeason + "/matches/" + matchID), Auth: owner.Bearer()}), 403, "seasonAlreadyEnded")
}

func TestUpdateMatch(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Update", "a", "b", "c")
	ws := h.Listen(g.ID)
	body := g.MatchBody([]Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"b", map[string]int{"Normal": 2}}})
	body["teams"].([]any)[0].(map[string]any)["savePhoto"] = true
	created := h.OK(h.Do(Req{Method: "POST", Path: g.SeasonPath("/matches"), Auth: owner.Bearer(), Body: body}))
	ws.Expect(1)
	matchID := created.Str("id")
	path := g.SeasonPath("/matches/" + matchID)
	before := h.OK(h.Do(Req{Method: "GET", Path: path + "/extended", Auth: owner.Bearer(), Ordered: true}))
	blue, red := before.Str("teams", "0", "id"), before.Str("teams", "1", "id")
	bluePhoto := before.Str("teams", "0", "photoAssetId")

	withIDs := func(b map[string]any, ids ...string) map[string]any {
		for i, id := range ids {
			b["teams"].([]any)[i].(map[string]any)["existingTeamId"] = id
		}
		return b
	}
	put := func(b any) *Resp { return h.Do(Req{Method: "PUT", Path: path, Auth: owner.Bearer(), Body: b}) }

	update := withIDs(g.MatchBody([]Member{{"a", map[string]int{"Normal": 1}}, {"c", nil}}, []Member{{"b", map[string]int{"Finish - Ring of fire": 1}}}), blue, red)
	updated := h.OK(put(update))
	h.Equal(updated.Str("id"), matchID, "same match")
	h.Equal(len(updated.List("photoUploads")), 0, "no new photos")
	ev := ws.Expect(1)
	h.Equal(EventScope(ev[0]), "matchUpdate", "update event")

	after := h.OK(h.Do(Req{Method: "GET", Path: path + "/extended", Auth: owner.Bearer(), Ordered: true}))
	h.True(after.Str("teams", "0", "id") != blue, "teams are recreated on update")
	h.Equal(after.Str("teams", "0", "photoAssetId"), bluePhoto, "existing photo moves to the recreated team")
	h.Equal(len(after.List("teamMembers")), 3, "members replaced")
	h.OK(h.Do(Req{Method: "GET", Path: path + "/overview", Auth: owner.Bearer(), Ordered: true}))

	// the old team ids no longer exist
	h.Fail(put(withIDs(g.MatchBody([]Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"b", nil}}), blue, red)), 400, "matchTeamNotFound")
	newBlue, newRed := after.Str("teams", "0", "id"), after.Str("teams", "1", "id")

	photoUpdate := withIDs(g.MatchBody([]Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"b", nil}}), newBlue, newRed)
	photoUpdate["teams"].([]any)[0].(map[string]any)["savePhoto"] = true
	photoUpdate["teams"].([]any)[1].(map[string]any)["savePhoto"] = true
	withPhotos := h.OK(put(photoUpdate))
	uploads := withPhotos.List("photoUploads")
	h.Equal(len(uploads), 2, "two photo uploads")
	h.Equal(Get(uploads[0], "teamId"), newBlue, "update uploads carry the (old) team id")
	ws.Expect(1)
	h.Fail(h.Do(Req{Method: "GET", Path: "/assets/" + bluePhoto}), 404, "assetNotFound")

	latest := h.OK(h.Do(Req{Method: "GET", Path: path + "/extended", Auth: owner.Bearer(), Ordered: true}))
	ids := []string{latest.Str("teams", "0", "id"), latest.Str("teams", "1", "id")}
	valid := func() map[string]any {
		return withIDs(g.MatchBody([]Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"b", nil}}), ids...)
	}

	h.Fail(put(g.MatchBody([]Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"b", nil}})), 400, "matchCreateDtoNeedsIds")
	h.Fail(put(withIDs(valid(), ids[0], ids[0])), 400, "matchTeamNotUnique")
	h.Fail(put(withIDs(valid(), ids[0], "nope")), 400, "matchTeamNotFound")
	bad := valid()
	bad["teams"].([]any)[1].(map[string]any)["teamMembers"].([]any)[0].(map[string]any)["moves"] = []any{map[string]any{"moveId": g.Moves["Finish - Normal"], "count": 1}}
	h.Fail(put(bad), 400, "matchDtoValidationFailed")
	h.Fail(put(withIDs(g.MatchBody([]Member{{"a", nil}}, []Member{}), ids...)), 400, "matchDtoValidationFailed")
	h.Fail(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/matches/nope"), Auth: owner.Bearer(), Body: valid()}), 404, "seasonHasDifferentGroup")

	// team ids of any match pass the existence check
	second := h.OK(h.CreateMatch(owner, g, []Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"c", nil}}))
	ws.Expect(1)
	h.OK(h.Do(Req{Method: "PUT", Path: g.SeasonPath("/matches/" + second.Str("id")), Auth: owner.Bearer(), Body: valid()}))
	ws.Expect(1)

	oldSeason := g.SeasonID
	h.StartSeason(g, "Old")
	ws.Expect(1)
	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/seasons/" + oldSeason + "/matches/" + matchID), Auth: owner.Bearer(), Body: valid()}), 403, "seasonAlreadyEnded")
	ws.ExpectNone()
}

func TestDeleteMatch(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Delete", "a", "b")
	other := h.NewGroup(owner, "Other", "z", "y")
	ws := h.Listen(g.ID)
	body := g.MatchBody([]Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"b", nil}})
	body["teams"].([]any)[0].(map[string]any)["savePhoto"] = true
	created := h.OK(h.Do(Req{Method: "POST", Path: g.SeasonPath("/matches"), Auth: owner.Bearer(), Body: body}))
	ws.Expect(1)
	photo := Get(created.List("photoUploads")[0], "teamPhoto", "id").(string)
	matchID := created.Str("id")

	h.Fail(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/matches/nope"), Auth: owner.Bearer()}), 404, "matchNotFound")
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.Path("/seasons/nope/matches/" + matchID), Auth: owner.Bearer()}), 404, "seasonNotFound")
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.Path("/seasons/" + other.SeasonID + "/matches/" + matchID), Auth: owner.Bearer()}), 404, "seasonHasDifferentGroup")

	res := h.OK(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/matches/" + matchID), Auth: owner.Bearer()}))
	h.Equal(res.Data(), "OK", "deleted")
	ev := ws.Expect(1)
	h.Equal(EventScope(ev[0]), "matchDelete", "delete event")
	h.Equal(Get(ev[0], "body"), matchID, "delete event body is the match id")
	h.Fail(h.Do(Req{Method: "GET", Path: g.SeasonPath("/matches/" + matchID), Auth: owner.Bearer()}), 404, "matchNotFound")
	h.Fail(h.Do(Req{Method: "GET", Path: "/assets/" + photo}), 404, "assetNotFound")
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/matches/" + matchID), Auth: owner.Bearer()}), 404, "matchNotFound")

	kept := h.OK(h.CreateMatch(owner, g, []Member{{"a", map[string]int{"Finish - Normal": 1}}}, []Member{{"b", nil}}))
	ws.Expect(1)
	oldSeason := g.SeasonID
	h.StartSeason(g, "Old")
	ws.Expect(1)
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.Path("/seasons/" + oldSeason + "/matches/" + kept.Str("id")), Auth: owner.Bearer()}), 403, "seasonAlreadyEnded")
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/matches/" + kept.Str("id")), Auth: owner.Bearer()}), 400, "matchGroupOrSeasonIdDontMatch")
	ws.ExpectNone()
}

package apitests

import (
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

func TestCreateProfile(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Profiles", "a", "b")
	ws := h.Listen(g.ID)

	created := h.OK(h.Do(Req{Method: "POST", Path: g.Path("/profiles"), Auth: owner.Bearer(), Body: map[string]any{"name": "Cleo"}}))
	h.Equal(created.Str("name"), "Cleo", "name")
	h.Equal(created.Data("reactivated"), false, "reactivated")
	h.Equal(created.Data("lastActiveSeasonId"), nil, "lastActiveSeasonId")
	h.Equal(created.Str("groupId"), g.ID, "groupId")
	h.Equal(created.Data("assetIdAvatar"), nil, "avatar")
	ev := ws.Expect(1)
	h.Equal(EventScope(ev[0]), "profileCreate", "profile event")
	h.Equal(EventType(ev[0]), "PROFILES", "profile event type")

	h.Reload(g)
	h.True(g.Players["Cleo"] != "", "a player was created in the active season")

	h.Fail(h.Do(Req{Method: "POST", Path: g.Path("/profiles"), Auth: owner.Bearer(), Body: map[string]any{"name": "Cleo"}}), 400, "profileAlreadyExists")
	h.Fail(h.Do(Req{Method: "POST", Path: g.Path("/profiles"), Auth: owner.Bearer(), Body: map[string]any{"name": "a"}}), 400, "profileAlreadyExists")
	ws.ExpectNone()

	// names are matched exactly
	h.OK(h.Do(Req{Method: "POST", Path: g.Path("/profiles"), Auth: owner.Bearer(), Body: map[string]any{"name": "cleo"}}))
	ws.Expect(1)

	// the API accepts a profile without a name
	unnamed := h.OK(h.Do(Req{Method: "POST", Path: g.Path("/profiles"), Auth: owner.Bearer(), Body: map[string]any{}}))
	h.Equal(unnamed.Data("name"), nil, "unnamed profile")
	ws.Expect(1)

	list := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/profiles"), Auth: owner.Bearer()}))
	h.Equal(len(list.List()), 5, "profiles in group")
}

func TestReactivateProfile(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Reactivate", "a", "b")
	ws := h.Listen(g.ID)

	h.OK(h.Do(Req{Method: "DELETE", Path: g.SeasonPath("/players/" + g.Players["b"]), Auth: owner.Bearer()}))
	ws.Expect(1)
	active := h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players"), Auth: owner.Bearer()}))
	h.Equal(len(active.List()), 1, "one active player")

	again := h.OK(h.Do(Req{Method: "POST", Path: g.Path("/profiles"), Auth: owner.Bearer(), Body: map[string]any{"name": "b"}}))
	h.Equal(again.Data("reactivated"), true, "reactivated")
	h.Equal(again.Str("lastActiveSeasonId"), g.SeasonID, "lastActiveSeasonId")
	h.Equal(again.Str("id"), g.Profiles["b"], "same profile")
	ev := ws.Expect(1)
	h.Equal(EventScope(ev[0]), "profileCreate", "reactivation emits profileCreate")

	active = h.OK(h.Do(Req{Method: "GET", Path: g.SeasonPath("/players"), Auth: owner.Bearer()}))
	h.Equal(len(active.List()), 2, "player is active again")
}

func TestGetAndUpdateProfile(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Profile CRUD", "a", "b")
	other := h.NewGroup(owner, "Other", "z")
	ws := h.Listen(g.ID)

	got := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/profiles/" + g.Profiles["a"]), Auth: owner.Bearer()}))
	h.Equal(got.Str("name"), "a", "profile name")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/profiles/" + other.Profiles["z"]), Auth: owner.Bearer()}), 404, "profileNotFound")
	h.Fail(h.Do(Req{Method: "GET", Path: g.Path("/profiles/nope"), Auth: owner.Bearer()}), 404, "profileNotFound")

	renamed := h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/profiles/" + g.Profiles["a"]), Auth: owner.Bearer(), Body: map[string]any{"name": "Alpha"}}))
	h.Equal(renamed.Str("name"), "Alpha", "renamed")
	ev := ws.Expect(1)
	h.Equal(EventScope(ev[0]), "profileUpdate", "update event")

	// renaming does not check for duplicates or empty names
	h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/profiles/" + g.Profiles["b"]), Auth: owner.Bearer(), Body: map[string]any{"name": "Alpha"}}))
	ws.Expect(1)
	h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/profiles/" + g.Profiles["b"]), Auth: owner.Bearer(), Body: map[string]any{}}))
	ws.Expect(1)

	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/profiles/" + other.Profiles["z"]), Auth: owner.Bearer(), Body: map[string]any{"name": "x"}}), 400, "profileNotOfGroup")
	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/profiles/nope"), Auth: owner.Bearer(), Body: map[string]any{"name": "x"}}), 404, "profileNotFound")
	ws.ExpectNone()
}

func TestProfileAvatar(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Avatars", "a")
	other := h.NewGroup(owner, "Other", "z")
	profile := g.Profiles["a"]
	groupWS := h.Listen(g.ID)
	profileWS := h.Listen(profile)

	first := h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/profiles/" + profile + "/avatar"), Auth: owner.Bearer()}))
	h.Equal(first.Str("type"), "PROFILE_AVATAR", "asset type")
	ev := groupWS.Expect(1)
	h.Equal(EventScope(ev[0]), "profileAvatarSet", "avatar set event")
	got := h.OK(h.Do(Req{Method: "GET", Path: g.Path("/profiles/" + profile), Auth: owner.Bearer()}))
	h.Equal(got.Str("assetIdAvatar"), first.Str("id"), "profile avatar")

	second := h.OK(h.Do(Req{Method: "PUT", Path: g.Path("/profiles/" + profile + "/avatar"), Auth: owner.Bearer(), Body: map[string]any{"offsetX": 3, "offsetY": 4, "zoom": 2}}))
	groupWS.Expect(1)
	h.Fail(h.Do(Req{Method: "GET", Path: "/assets/" + first.Str("id")}), 404, "assetNotFound")
	h.Equal(h.OK(h.Do(Req{Method: "GET", Path: "/assets/" + second.Str("id")})).Num("zoom"), 2, "stored zoom")

	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/profiles/" + profile + "/avatar"), Auth: owner.Bearer(), Body: map[string]any{"offsetX": 0, "offsetY": -1, "zoom": 0}}), 400, "assetValidationFailed")
	h.Fail(h.Do(Req{Method: "PUT", Path: g.Path("/profiles/" + other.Profiles["z"] + "/avatar"), Auth: owner.Bearer()}), 404, "profileNotFound")
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.Path("/profiles/" + other.Profiles["z"] + "/avatar"), Auth: owner.Bearer()}), 404, "profileNotFound")

	deleted := h.OK(h.Do(Req{Method: "DELETE", Path: g.Path("/profiles/" + profile + "/avatar"), Auth: owner.Bearer()}))
	h.Equal(deleted.Data("assetIdAvatar"), nil, "avatar cleared")
	// the group hears about it (the Java backend sent it to the profile id)
	ev = groupWS.Expect(1)
	h.Equal(EventScope(ev[0]), "profileAvatarDelete", "avatar delete event")
	h.Equal(EventGroupID(ev[0]), g.ID, "avatar delete event is keyed by group id")
	profileWS.ExpectNone()
	h.Fail(h.Do(Req{Method: "GET", Path: "/assets/" + second.Str("id")}), 404, "assetNotFound")
	h.Fail(h.Do(Req{Method: "DELETE", Path: g.Path("/profiles/" + profile + "/avatar"), Auth: owner.Bearer()}), 404, "profileHasNoAvatar")
}

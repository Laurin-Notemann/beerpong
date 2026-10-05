package apitests

import (
	"testing"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

func formationPath(g *Group, suffix string) string { return g.Path("/formations" + suffix) }

func cupsAt(xy ...int) []map[string]any {
	out := []map[string]any{}
	for i := 0; i+1 < len(xy); i += 2 {
		out = append(out, map[string]any{"x": xy[i], "y": xy[i+1]})
	}
	return out
}

func putFormation(h *H, u *User, g *Group, id string, body map[string]any) *Resp {
	h.Helper()
	return h.Do(Req{Method: "PUT", Path: formationPath(g, "/"+id), Auth: u.Bearer(), Body: body, Ordered: true})
}

func TestFormations(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Formations", "a", "b")
	ws := h.Listen(g.ID)
	id := newLiveMatchID()

	// the name is trimmed; the app makes the id, so the create is a PUT
	created := h.OK(putFormation(h, owner, g, id, map[string]any{"name": "  Six  ", "cups": cupsAt(1, 2, 3, 2, 5, 2, 2, 4, 4, 4, 3, 6)}))
	h.Equal(created.Str("id"), id, "id")
	h.Equal(created.Str("groupId"), g.ID, "group")
	h.Equal(created.Str("name"), "Six", "name")
	h.Equal(len(created.List("cups")), 6, "cups")
	h.Equal(created.Num("cups", "5", "y"), 6, "cup order is kept")
	ev := ws.Expect(1)
	h.Equal(EventType(ev[0]), "FORMATIONS", "event type")
	h.Equal(EventScope(ev[0]), "formationUpdate", "event scope")
	h.Equal(Get(ev[0], "body", "id"), id, "event body")

	// the same id again updates it
	updated := h.OK(putFormation(h, owner, g, id, map[string]any{"name": "Three", "cups": cupsAt(2, 4, 4, 4, 3, 6)}))
	h.Equal(updated.Str("name"), "Three", "renamed")
	h.Equal(len(updated.List("cups")), 3, "fewer cups")
	ws.Expect(1)

	list := h.OK(h.Do(Req{Method: "GET", Path: formationPath(g, ""), Auth: owner.Bearer(), Ordered: true}))
	h.Equal(len(list.List()), 1, "listed")
	h.Equal(list.Data("0"), updated.Data(), "list entry")

	// deleting is idempotent and only the first one announces it
	h.OK(h.Do(Req{Method: "DELETE", Path: formationPath(g, "/"+id), Auth: owner.Bearer()}))
	ev = ws.Expect(1)
	h.Equal(EventScope(ev[0]), "formationDelete", "delete event")
	h.Equal(Get(ev[0], "body"), id, "delete event body")
	h.OK(h.Do(Req{Method: "DELETE", Path: formationPath(g, "/"+id), Auth: owner.Bearer()}))
	ws.ExpectNone()

	empty := h.OK(h.Do(Req{Method: "GET", Path: formationPath(g, ""), Auth: owner.Bearer()}))
	h.Equal(len(empty.List()), 0, "deleted")
}

func TestFormationValidation(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "Formation validation", "a")
	other := h.NewGroup(owner, "Formation other group", "z")
	ws := h.Listen(g.ID)

	valid := map[string]any{"name": "Line", "cups": cupsAt(0, 0, 2, 0)}
	h.Fail(putFormation(h, owner, g, "not-a-uuid", valid), 400, "invalidFormation")
	h.Fail(putFormation(h, owner, g, newLiveMatchID(), map[string]any{"name": "  ", "cups": cupsAt(0, 0)}), 400, "invalidFormation")
	h.Fail(putFormation(h, owner, g, newLiveMatchID(), map[string]any{"name": "Empty", "cups": cupsAt()}), 400, "invalidFormation")
	h.Fail(putFormation(h, owner, g, newLiveMatchID(), map[string]any{"name": "Off the grid", "cups": cupsAt(7, 0)}), 400, "invalidFormation")
	h.Fail(putFormation(h, owner, g, newLiveMatchID(), map[string]any{"name": "Twice", "cups": cupsAt(1, 1, 1, 1)}), 400, "invalidFormation")

	// only members write, and a formation stays in its group
	stranger := h.NewUser()
	h.Unauthorized(putFormation(h, stranger, g, newLiveMatchID(), valid), "No access to this group!")
	h.Unauthorized(h.Do(Req{Method: "DELETE", Path: formationPath(g, "/"+newLiveMatchID()), Auth: stranger.Bearer()}), "No access to this group!")
	id := newLiveMatchID()
	h.OK(putFormation(h, owner, other, id, valid))
	h.Fail(putFormation(h, owner, g, id, valid), 404, "formationNotFound")
	ws.ExpectNone()
}

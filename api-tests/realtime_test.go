package apitests

import (
	"testing"
	"time"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

func TestRealtimeSubscriptions(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	a := h.NewGroup(owner, "Group A", "a")
	b := h.NewGroup(owner, "Group B", "b")

	onlyA := h.Listen(a.ID)
	both := h.Listen(a.ID, b.ID, a.ID, "not-a-uuid")
	none := h.Connect()

	h.OK(h.Do(Req{Method: "PUT", Path: a.Path(""), Auth: owner.Bearer(), Body: map[string]any{"name": "Group A2"}}))
	h.OK(h.Do(Req{Method: "PUT", Path: b.Path(""), Auth: owner.Bearer(), Body: map[string]any{"name": "Group B2"}}))

	ev := onlyA.Expect(1)
	h.Equal(EventGroupID(ev[0]), a.ID, "a only")
	got := both.Expect(2)
	h.Equal(EventGroupID(got[0]), a.ID, "first event")
	h.Equal(EventGroupID(got[1]), b.ID, "second event")
	none.ExpectNone()
	onlyA.ExpectNone()

	// messages that are not subscriptions are ignored
	none.Send(`{"hello":"world"}`)
	none.Send(`{"groupIds":"` + a.ID + `"}`)
	none.Send(`{"groupIds":[]}`)
	time.Sleep(150 * time.Millisecond)
	h.OK(h.Do(Req{Method: "PUT", Path: a.Path(""), Auth: owner.Bearer(), Body: map[string]any{"name": "Group A3"}}))
	none.ExpectNone()
	onlyA.Expect(1)
	both.Expect(1)

	// a later subscription adds groups
	none.Subscribe(b.ID)
	h.OK(h.Do(Req{Method: "PUT", Path: b.Path(""), Auth: owner.Bearer(), Body: map[string]any{"name": "Group B3"}}))
	none.Expect(1)
	both.Expect(1)
}

func TestRealtimeInvalidJSONClosesSocket(t *testing.T) {
	h := New(t)
	s := h.Connect()
	s.Send("not json")
	h.True(s.Closed(3*time.Second), "server closes the socket after an unparseable message")
}

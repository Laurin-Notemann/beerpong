package apitests

import (
	"crypto/rand"
	"math/big"
	"testing"
	"time"

	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

// newTransactionID is an App Store originalTransactionId nobody used before;
// purchases outlive a test run in the database.
func newTransactionID(h *H) string {
	n, err := rand.Int(rand.Reader, big.NewInt(1e15))
	if err != nil {
		h.Fatalf("transaction id: %v", err)
	}
	return "2000" + n.String()
}

func redeem(h *H, u *User, g *Group, token string) *Resp {
	return h.Do(Req{Method: "POST", Path: g.Path("/premium"), Auth: u.Bearer(), Body: map[string]any{"store": "apple", "token": token}})
}

func premium(h *H, u *User, g *Group) bool {
	return h.OK(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: u.Bearer()})).Data("premium") == true
}

func TestPremiumUnlocksTheBuyersGroups(t *testing.T) {
	h := New(t)
	buyer, friend := h.NewUser(), h.NewUser()
	own := h.NewGroup(buyer, "Own", "a")
	other := h.NewGroup(buyer, "Other", "a")
	friends := h.NewGroup(friend, "Friends", "a")
	untouched := h.NewGroup(friend, "Untouched", "a")
	h.Join(buyer, friends)
	h.Join(friend, own)
	h.Equal(premium(h, buyer, own), false, "no premium before buying")

	onOwn, onOther, onFriends, onUntouched := h.Listen(own.ID), h.Listen(other.ID), h.Listen(friends.ID), h.Listen(untouched.ID)

	h.Note("buying in a group someone else created")
	token := h.Apple().Transaction(newTransactionID(h), nil)
	res := h.OK(redeem(h, buyer, friends, token))
	h.Equal(res.Data("premium"), true, "the group the buyer is in")
	for _, s := range []*Socket{onOwn, onOther, onFriends} {
		ev := s.Expect(1)
		h.Equal(EventScope(ev[0]), "groupUpdate", "event scope")
		h.Equal(Get(ev[0], "body", "premium"), true, "event carries premium")
	}
	onUntouched.ExpectNone()
	h.Equal(premium(h, friend, own), true, "every member sees the buyer's groups unlocked")
	h.Equal(premium(h, buyer, other), true, "every group the buyer created")
	h.Equal(premium(h, friend, untouched), false, "the friend's other group stays locked")

	h.Note("redeeming again changes nothing")
	h.OK(redeem(h, buyer, friends, token))
	onOwn.ExpectNone()

	h.Note("a group created after buying starts unlocked")
	created := h.OK(h.Do(Req{Method: "POST", Path: "/groups", Auth: buyer.Bearer(), Body: map[string]any{"name": "Later", "profileNames": []string{"a"}, "sportPreset": "beerpong"}}))
	h.Equal(created.Data("premium"), true, "new group of the buyer")
	h.Equal(h.OK(h.Do(Req{Method: "POST", Path: "/groups", Auth: friend.Bearer(), Body: map[string]any{"name": "Not", "profileNames": []string{"a"}, "sportPreset": "beerpong"}})).Data("premium"), false, "new group of someone else")
}

func TestPremiumFollowsTheStoreAccount(t *testing.T) {
	h := New(t)
	oldPhone, newPhone := h.NewUser(), h.NewUser()
	old := h.NewGroup(oldPhone, "Old phone", "a")
	transaction := newTransactionID(h)
	h.OK(redeem(h, oldPhone, old, h.Apple().Transaction(transaction, nil)))

	h.Note("the same purchase, synced by StoreKit to a new install")
	fresh := h.NewGroup(newPhone, "New phone", "a")
	h.Equal(premium(h, newPhone, fresh), false, "before the new install redeems")
	h.Equal(h.OK(redeem(h, newPhone, fresh, h.Apple().Transaction(transaction, nil))).Data("premium"), true, "the new install's group")
	h.Equal(premium(h, oldPhone, old), true, "the old install's group stays unlocked")
	later := h.OK(h.Do(Req{Method: "POST", Path: "/groups", Auth: newPhone.Bearer(), Body: map[string]any{"name": "Later", "profileNames": []string{"a"}, "sportPreset": "beerpong"}}))
	h.Equal(later.Data("premium"), true, "groups the new install creates")
}

func TestPremiumRejectsPurchasesItCantBelieve(t *testing.T) {
	h := New(t)
	buyer, stranger := h.NewUser(), h.NewUser()
	g := h.NewGroup(buyer, "Locked", "a")
	apple := h.Apple()

	for _, c := range []struct{ what, token string }{
		{"another root", h.ForgedApple().Transaction(newTransactionID(h), nil)},
		{"another app", apple.Transaction(newTransactionID(h), map[string]any{"bundleId": "com.example.other"})},
		{"another product", apple.Transaction(newTransactionID(h), map[string]any{"productId": "coins"})},
		{"refunded", apple.Transaction(newTransactionID(h), map[string]any{"revocationDate": time.Now().UnixMilli()})},
		{"Xcode StoreKit tests", apple.Transaction(newTransactionID(h), map[string]any{"environment": "Xcode"})},
		{"not a JWS", "not-a-jws"},
	} {
		h.Note("%s", c.what)
		h.Fail(redeem(h, buyer, g, c.token), 400, "purchaseInvalid")
	}
	h.Note("a tampered payload")
	token := apple.Transaction(newTransactionID(h), map[string]any{"productId": "coins"})
	other := apple.Transaction(newTransactionID(h), nil)
	h.Fail(redeem(h, buyer, g, token[:len(token)-86]+other[len(other)-86:]), 400, "purchaseInvalid")

	h.Fail(h.Do(Req{Method: "POST", Path: g.Path("/premium"), Auth: buyer.Bearer(), Body: map[string]any{"store": "nokia", "token": other}}), 400, "purchaseInvalid")
	h.Fail(h.Do(Req{Method: "POST", Path: g.Path("/premium"), Auth: buyer.Bearer(), Body: map[string]any{"store": "apple"}}), 400, "purchaseInvalid")
	h.Unauthorized(redeem(h, stranger, g, other), "No access to this group!")
	h.Equal(premium(h, buyer, g), false, "still locked")
}

func TestAppleRefunds(t *testing.T) {
	h := New(t)
	buyer, friend := h.NewUser(), h.NewUser()
	own := h.NewGroup(buyer, "Own", "a")
	shared := h.NewGroup(friend, "Shared", "a")
	h.Join(buyer, shared)
	apple := h.Apple()
	transaction := newTransactionID(h)
	token := apple.Transaction(transaction, nil)
	h.OK(redeem(h, buyer, own, token))
	h.OK(redeem(h, friend, shared, apple.Transaction(newTransactionID(h), nil)))
	h.OK(redeem(h, buyer, shared, token))
	onOwn, onShared := h.Listen(own.ID), h.Listen(shared.ID)

	h.Note("refund")
	refunded := apple.Transaction(transaction, map[string]any{"revocationDate": time.Now().UnixMilli(), "revocationReason": 0})
	h.OK(h.Do(Req{Method: "POST", Path: "/webhooks/apple", Body: apple.Notification("REFUND", refunded)}))
	ev := onOwn.Expect(1)
	h.Equal(Get(ev[0], "body", "premium"), false, "event carries the lost premium")
	h.Equal(premium(h, buyer, own), false, "the refunded purchase's group is locked again")
	h.Equal(premium(h, buyer, shared), true, "a group another purchase unlocked stays unlocked")
	onShared.ExpectNone()
	h.Fail(redeem(h, buyer, own, token), 400, "purchaseInvalid")

	h.Note("refund reversed")
	h.OK(h.Do(Req{Method: "POST", Path: "/webhooks/apple", Body: apple.Notification("REFUND_REVERSED", token)}))
	onOwn.Expect(1)
	h.Equal(premium(h, buyer, own), true, "unlocked again")

	h.Note("notifications Versus doesn't act on, and purchases nobody redeemed")
	h.OK(h.Do(Req{Method: "POST", Path: "/webhooks/apple", Body: apple.Notification("TEST", "")}))
	h.OK(h.Do(Req{Method: "POST", Path: "/webhooks/apple", Body: apple.Notification("REFUND", apple.Transaction(newTransactionID(h), nil))}))
	onOwn.ExpectNone()

	h.Note("a notification Apple didn't sign")
	forged := h.ForgedApple()
	res := h.Do(Req{Method: "POST", Path: "/webhooks/apple", Body: forged.Notification("REFUND", forged.Transaction(transaction, nil))})
	h.Equal(res.Status, 400, "forged notification")
	h.Equal(premium(h, buyer, own), true, "a forged refund changes nothing")
}

func TestGoogleNotificationNeedsItsToken(t *testing.T) {
	h := New(t)
	push := map[string]any{"message": map[string]any{"data": "e30=", "messageId": "1"}}
	h.Equal(h.Do(Req{Method: "POST", Path: "/webhooks/google", Body: push}).Status, 403, "no token")
	h.Equal(h.Do(Req{Method: "POST", Path: "/webhooks/google?token=guessed", Body: push}).Status, 403, "wrong token")
}

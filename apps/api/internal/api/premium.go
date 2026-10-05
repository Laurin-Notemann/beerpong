package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"

	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/purchases"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

// purchase is a store purchase of Versus Premium, verified.
type purchase struct {
	store         string
	transactionID string
	productID     string
	environment   string
	purchasedAt   time.Time
	expiresAt     *time.Time
	revoked       bool
}

// redeemPurchase links the caller's install to a store purchase, which
// unlocks every group a linked install created. Right after buying, the app
// sets unlockGroup and the group in the path is unlocked too; after a restore
// or when the store reports a purchase on a new install it doesn't, so a
// purchase doesn't unlock every group its buyer opens. Safe to repeat.
func (s *Server) redeemPurchase(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	store, err1 := o.str("store")
	token, err2 := o.str("token")
	unlockGroup, err3 := o.primitiveBool("unlockGroup")
	if err1 != nil || err2 != nil || err3 != nil || store == nil || token == nil {
		return fail(errPurchaseInvalid)
	}

	ctx := r.Context()
	p, err := s.verifyPurchase(ctx, *store, *token)
	if err == nil && (p.productID != purchases.Premium || p.revoked) {
		err = fmt.Errorf("%w: product %q, revoked %v", purchases.ErrInvalid, p.productID, p.revoked)
	}
	if errors.Is(err, purchases.ErrInvalid) {
		s.log.WarnContext(ctx, "purchase rejected", "store", *store, "err", err)
		return fail(errPurchaseInvalid)
	}
	if err != nil {
		return internal(err)
	}

	groupID := r.path("groupId")
	var unlock *string
	if unlockGroup {
		unlock = &groupID
	}
	var changed []db.Group
	res = s.tx(ctx, func(q *db.Queries) (response, error) {
		e, err := q.SaveEntitlement(ctx, db.SaveEntitlementParams{
			ID: uuid.NewString(), Store: p.store, ProductID: p.productID, StoreTransactionID: p.transactionID,
			Environment: p.environment, PurchasedAt: p.purchasedAt, ExpiresAt: p.expiresAt,
		})
		if err != nil {
			return nil, err
		}
		if e.RevokedAt != nil {
			return fail(errPurchaseInvalid), nil
		}
		if err := q.LinkEntitlementUser(ctx, db.LinkEntitlementUserParams{EntitlementID: e.ID, UserID: r.userID}); err != nil {
			return nil, err
		}
		if err := q.UnlockGroups(ctx, db.UnlockGroupsParams{EntitlementID: e.ID, GroupID: unlock}); err != nil {
			return nil, err
		}
		if changed, err = refreshEntitlementGroups(ctx, q, e.ID); err != nil {
			return nil, err
		}
		group, err := q.GetGroup(ctx, groupID)
		if err != nil {
			return nil, err
		}
		return ok(toGroupDTO(group)), nil
	})
	if _, isOK := res.(okResponse); isOK {
		s.publishGroups(changed)
	}
	return res
}

func (s *Server) verifyPurchase(ctx context.Context, store, token string) (purchase, error) {
	switch store {
	case "apple":
		t, err := s.stores.Apple.Transaction(token)
		if err != nil {
			return purchase{}, err
		}
		return purchase{
			store: "apple", transactionID: t.OriginalTransactionID, productID: t.ProductID, environment: t.Environment,
			purchasedAt: time.UnixMilli(t.PurchaseDate).UTC(), expiresAt: millis(t.ExpiresDate), revoked: t.RevocationDate != nil,
		}, nil
	case "google":
		if s.stores.Google == nil {
			return purchase{}, errors.New("google play purchase, but the API has no Play service account")
		}
		p, err := s.stores.Google.Product(ctx, purchases.Premium, token)
		if err != nil {
			return purchase{}, err
		}
		return purchase{
			store: "google", transactionID: token, productID: purchases.Premium, environment: p.Environment(),
			purchasedAt: p.PurchasedAt(), revoked: p.PurchaseState == 1,
		}, nil
	}
	return purchase{}, fmt.Errorf("%w: unknown store", purchases.ErrInvalid)
}

// appleNotification takes App Store Server Notifications V2. Refunds and
// revocations take premium away from the groups the purchase unlocked; a
// reversed refund gives it back. Everything else is answered with 200 so
// Apple stops retrying.
func (s *Server) appleNotification(r *request) response {
	body, res := readJSON(r.Request, true)
	if res != nil {
		return res
	}
	o, err := asObject(body)
	if err != nil {
		return springError(400)
	}
	payload, err := o.str("signedPayload")
	if err != nil || payload == nil {
		return springError(400)
	}
	ctx := r.Context()
	n, err := s.stores.Apple.Notification(*payload)
	if err != nil {
		s.log.WarnContext(ctx, "apple notification rejected", "err", err)
		return springError(400)
	}
	s.log.InfoContext(ctx, "apple notification", "type", n.Type, "subtype", n.Subtype)

	var revokedAt *time.Time
	switch n.Type {
	case "REFUND", "REVOKE":
		revokedAt = ptr(s.now())
		if n.Transaction != nil && n.Transaction.RevocationDate != nil {
			revokedAt = millis(n.Transaction.RevocationDate)
		}
	case "REFUND_REVERSED":
	default:
		return ok("OK")
	}
	if n.Transaction == nil {
		return ok("OK")
	}
	return s.setRevoked(ctx, "apple", n.Transaction.OriginalTransactionID, revokedAt)
}

// googleNotification takes Google Play's Real-time Developer Notifications,
// pushed by Pub/Sub. A voided one-time purchase (refund, chargeback) takes
// premium away like an App Store refund; everything else is acknowledged.
func (s *Server) googleNotification(r *request) response {
	if s.stores.Google == nil || !s.stores.Google.Authorized(r.URL.Query().Get("token")) {
		return springError(403)
	}
	raw, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		return springError(400)
	}
	ctx := r.Context()
	n, err := purchases.ParseNotification(raw)
	if err != nil {
		s.log.WarnContext(ctx, "google notification rejected", "err", err)
		return springError(400)
	}
	s.log.InfoContext(ctx, "google notification", "package", n.PackageName, "voided", n.Voided != nil)
	if n.Voided == nil || n.Voided.ProductType != 2 || n.PackageName != s.stores.Google.PackageName() {
		return ok("OK")
	}
	return s.setRevoked(ctx, "google", n.Voided.PurchaseToken, ptr(n.EventTime))
}

// setRevoked records the store's word on a purchase and updates the groups
// it unlocked. A purchase no install ever redeemed has no row and is fine.
func (s *Server) setRevoked(ctx context.Context, store, transactionID string, revokedAt *time.Time) response {
	var changed []db.Group
	res := s.tx(ctx, func(q *db.Queries) (response, error) {
		e, err := q.GetEntitlement(ctx, db.GetEntitlementParams{Store: store, StoreTransactionID: transactionID})
		if notFound(err) {
			return ok("OK"), nil
		}
		if err != nil {
			return nil, err
		}
		if err := q.SetEntitlementRevoked(ctx, db.SetEntitlementRevokedParams{ID: e.ID, RevokedAt: revokedAt}); err != nil {
			return nil, err
		}
		changed, err = refreshEntitlementGroups(ctx, q, e.ID)
		return ok("OK"), err
	})
	if _, isOK := res.(okResponse); isOK {
		s.publishGroups(changed)
	}
	return res
}

func refreshEntitlementGroups(ctx context.Context, q *db.Queries, entitlementID string) ([]db.Group, error) {
	ids, err := q.EntitlementGroupIDs(ctx, entitlementID)
	if err != nil {
		return nil, err
	}
	return q.RefreshPremium(ctx, ids)
}

// publishGroups tells every member of the groups that premium changed.
func (s *Server) publishGroups(groups []db.Group) {
	for _, g := range groups {
		s.hub.Publish(g.ID, realtime.Groups, "groupUpdate", toGroupDTO(g))
	}
}

// requirePremium answers 403 premiumRequired when the group hasn't unlocked
// premium, and nil when it has.
func (s *Server) requirePremium(r *request, groupID string) response {
	premium, err := s.q.GroupPremium(r.Context(), groupID)
	if notFound(err) {
		return fail(errGroupNotFound)
	}
	if err != nil {
		return internal(err)
	}
	if !premium {
		return fail(errPremiumRequired)
	}
	return nil
}

func millis(ms *int64) *time.Time {
	if ms == nil {
		return nil
	}
	return ptr(time.UnixMilli(*ms).UTC())
}

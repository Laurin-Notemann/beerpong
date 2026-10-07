-- name: SaveEntitlement :one
-- A purchase seen again (another device, a restore) keeps its row: only the
-- store's notifications change whether it is revoked, so replaying an old
-- signed purchase can't undo a refund.
INSERT INTO entitlements (id, store, product_id, store_transaction_id, environment, purchased_at, expires_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
ON CONFLICT (store, store_transaction_id) DO UPDATE SET store = EXCLUDED.store
RETURNING *;

-- name: GetEntitlement :one
SELECT * FROM entitlements WHERE store = $1 AND store_transaction_id = $2;

-- name: SetEntitlementRevoked :exec
UPDATE entitlements SET revoked_at = $2 WHERE id = $1;

-- name: LinkEntitlementUser :exec
INSERT INTO entitlement_users (entitlement_id, user_id) VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: UnlockGroups :exec
-- An entitlement unlocks every group a linked install created, and the group
-- the buyer was in when buying (group_id, null otherwise).
INSERT INTO entitlement_groups (entitlement_id, group_id)
SELECT @entitlement_id::text, g.id FROM groups g
WHERE g.id = sqlc.narg(group_id)::text
    OR g.created_by IN (
        SELECT gm.id FROM group_members gm
        JOIN entitlement_users eu ON eu.user_id = gm.user_id
        WHERE eu.entitlement_id = @entitlement_id::text
    )
ON CONFLICT DO NOTHING;

-- name: UnlockNewGroup :exec
-- A group created by an install linked to a live entitlement.
INSERT INTO entitlement_groups (entitlement_id, group_id)
SELECT eu.entitlement_id, @group_id::text FROM entitlement_users eu
JOIN entitlements e ON e.id = eu.entitlement_id
WHERE eu.user_id = @user_id::text AND e.revoked_at IS NULL;

-- name: EntitlementGroupIDs :many
SELECT group_id FROM entitlement_groups WHERE entitlement_id = $1;

-- name: RefreshPremium :many
-- Sets groups.premium to whether a live entitlement unlocked the group and
-- returns the groups it changed.
UPDATE groups g SET premium = NOT g.premium
WHERE g.id = ANY(@group_ids::text[])
    AND g.premium <> EXISTS (
        SELECT 1 FROM entitlement_groups eg
        JOIN entitlements e ON e.id = eg.entitlement_id
        WHERE eg.group_id = g.id AND e.revoked_at IS NULL
    )
RETURNING *;

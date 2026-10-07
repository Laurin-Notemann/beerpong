-- Versus Premium, bought in the App Store or on Google Play. A purchase is
-- tied to the store account, not to a Versus user: every install that shows
-- the same purchase is linked to it, and it unlocks every group a linked
-- install created plus the group the buyer was in when they bought.

-- +goose Up
CREATE TABLE entitlements (
    id text PRIMARY KEY,
    -- 'apple' or 'google'
    store text NOT NULL,
    product_id text NOT NULL,
    -- Apple's originalTransactionId or Google's purchase token. Both stay the
    -- same on every device of the store account (and across renewals, once
    -- there are subscriptions).
    store_transaction_id text NOT NULL,
    -- Apple's 'Sandbox' or 'Production'; Google's 'test' or 'production'
    environment text NOT NULL,
    purchased_at timestamp(6) with time zone NOT NULL,
    -- null for a one-time purchase
    expires_at timestamp(6) with time zone,
    -- refunded or revoked by the store
    revoked_at timestamp(6) with time zone,
    UNIQUE (store, store_transaction_id)
);

CREATE TABLE entitlement_users (
    entitlement_id text NOT NULL REFERENCES entitlements (id),
    user_id varchar(255) NOT NULL REFERENCES users (id),
    PRIMARY KEY (entitlement_id, user_id)
);

CREATE INDEX entitlement_users_user_idx ON entitlement_users (user_id);

CREATE TABLE entitlement_groups (
    entitlement_id text NOT NULL REFERENCES entitlements (id),
    group_id varchar(255) NOT NULL REFERENCES groups (id),
    PRIMARY KEY (entitlement_id, group_id)
);

CREATE INDEX entitlement_groups_group_idx ON entitlement_groups (group_id);

-- Whether a live (not revoked) entitlement is in entitlement_groups for the
-- group. Kept in step by the purchase and revoke paths, so every query that
-- reads a group has it.
ALTER TABLE groups ADD COLUMN premium boolean NOT NULL DEFAULT false;

-- +goose Down
ALTER TABLE groups DROP COLUMN premium;
DROP TABLE entitlement_groups;
DROP TABLE entitlement_users;
DROP TABLE entitlements;

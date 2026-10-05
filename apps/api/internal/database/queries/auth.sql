-- name: CreateUser :exec
INSERT INTO users (id) VALUES ($1);

-- name: CreateDevice :exec
INSERT INTO devices (id, type, device_id, push_notification_token, user_id)
VALUES ($1, $2, $3, NULL, $4);

-- name: UserExists :one
SELECT EXISTS (SELECT 1 FROM users WHERE id = $1);

-- name: AuthorizeRequest :one
-- One round trip for the auth filter: does the user exist and is it an
-- active member of the group in the path.
SELECT
    EXISTS (SELECT 1 FROM users u WHERE u.id = @user_id) AS user_exists,
    EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.user_id = @user_id AND gm.group_id = @group_id AND gm.active
    ) AS is_member;

-- name: ActiveMembershipID :one
SELECT id FROM group_members
WHERE user_id = $1 AND group_id = $2 AND active
LIMIT 1;

-- name: AnyMembership :one
SELECT id, active FROM group_members
WHERE user_id = $1 AND group_id = $2
LIMIT 1;

-- name: CreateMembership :exec
INSERT INTO group_members (id, active, group_id, user_id) VALUES ($1, true, $2, $3);

-- name: SetMembershipActive :exec
UPDATE group_members SET active = $2 WHERE id = $1;

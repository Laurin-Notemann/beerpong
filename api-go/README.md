# api-go

The Versus API. It replaced the retired Spring Boot API with the same REST
endpoints, error envelopes and `/update-socket` events, against the same
Postgres schema, with the same environment variables; `api-tests/` holds the
contract it was checked against.

## Run

```sh
# from the repo root, with the database from `make docker-db-up`
set -a; source .env; set +a
cd api-go && go run ./cmd/api
```

Extra variables on top of the Java ones: `PORT` (8080), `DB_MAX_CONNS` (10),
`DB_MIGRATE` (true), `JWT_ACCESS_TTL` (1h).

Staging runs as `beerpong-api-go-staging` in `~/docker/beerpong-api-go` on the
server; `Api Staging Deploy` builds and redeploys it on every push to
`staging`.

## Layout

- `cmd/api` – entrypoint, config, graceful shutdown.
- `internal/api` – handlers. Validation order, error codes and quirks follow
  the Java controllers so responses match; comments mark deliberate quirks.
- `internal/database` – `migrations/` (goose, embedded) and `queries/` (SQL),
  compiled by sqlc into `db/`. Run `sqlc generate` after editing queries.
- `internal/leaderboard` – stats (a port of the Java `LeaderboardService`)
  and the Elo (`elo.go`, tuned with beerpong-var through `/elo-simulation`).
- `internal/realtime` – the websocket hub.
- `internal/observability` – Sentry errors, request traces continued from the
  app, a span per SQL statement, and Sentry Logs via slog.
- `openapi` – the OpenAPI document the app's client types are generated from
  (see `OPENAPI_CODEGEN.md`). Update it with every endpoint or DTO change.

## Why these libraries

- **pgx + sqlc**: plain SQL, type-checked at generate time, no ORM. One query
  per need instead of Hibernate's lazy loading; bulk inserts use `COPY`.
- **goose**: SQL migrations embedded in the binary. The baseline is the
  Hibernate schema and is a no-op on the existing database; `00002` adds the
  foreign-key indexes Hibernate never created.
- **net/http** routing (Go 1.22+ patterns), **coder/websocket**,
  **caarlos0/env**, **golang-jwt**, **aws-sdk-go-v2**, **sentry-go**.

## Database order

The Java backend never sent `ORDER BY`, so clients got rows in physical order
(the first team of a match is "blue"). List queries order by `ctid` to keep
that exact order regardless of query plan. Rules have a `position` instead,
because a rewrite of the rule set reuses freed space and shuffled them.

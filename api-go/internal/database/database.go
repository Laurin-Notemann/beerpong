// Package database owns the connection pool and the schema migrations.
// Queries live in queries/*.sql and are compiled to Go by sqlc into db/.
package database

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"net/url"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/laurin-notemann/beerpong/api-go/internal/config"
)

//go:embed migrations/*.sql
var migrations embed.FS

// Connect opens the pool. tracer may be nil.
func Connect(ctx context.Context, cfg config.Postgres, tracer pgx.QueryTracer) (*pgxpool.Pool, error) {
	poolCfg, err := pgxpool.ParseConfig(connString(cfg))
	if err != nil {
		return nil, err
	}
	poolCfg.MaxConns = cfg.MaxConns
	poolCfg.ConnConfig.Tracer = tracer
	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return pool, nil
}

func connString(cfg config.Postgres) string {
	u := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(cfg.User, cfg.Password),
		Host:   fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Path:   "/" + cfg.Database,
	}
	q := u.Query()
	q.Set("sslmode", "disable")
	// All timestamps are handled in UTC, like the Java backend's JVM did.
	q.Set("timezone", "UTC")
	u.RawQuery = q.Encode()
	return u.String()
}

// Migrate brings the schema up to date. Safe to run against the database the
// Java backend created: the baseline only creates what is missing.
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	goose.SetBaseFS(migrations)
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	goose.SetLogger(goose.NopLogger())
	db := stdlib.OpenDBFromPool(pool)
	defer func(db *sql.DB) { _ = db.Close() }(db)
	return goose.UpContext(ctx, db, "migrations")
}

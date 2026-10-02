package harness

import (
	"context"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jackc/pgx/v5"
)

// Forge signs arbitrary claims with the backend's secret. Tests that need it
// skip when API_JWT_SECRET is not set.
func (h *H) Forge(claims jwt.MapClaims) string {
	h.Helper()
	if h.Env.JWTSecret == "" {
		h.Skip("API_JWT_SECRET not set")
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(h.Env.JWTSecret))
	if err != nil {
		h.Fatalf("sign token: %v", err)
	}
	return token
}

// AccessClaims mirrors what the backend puts into an access token.
func AccessClaims(userID string, expiresIn time.Duration) jwt.MapClaims {
	now := time.Now()
	return jwt.MapClaims{"sub": userID, "type": "access", "iat": now.Unix(), "exp": now.Add(expiresIn).Unix()}
}

// DB opens the backend's database for tests that shape data the API cannot
// produce. Skips when API_DATABASE_URL is not set.
func (h *H) DB() *pgx.Conn {
	h.Helper()
	if h.Env.DatabaseURL == "" {
		h.Skip("API_DATABASE_URL not set")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	conn, err := pgx.Connect(ctx, h.Env.DatabaseURL)
	if err != nil {
		h.Fatalf("connect database: %v", err)
	}
	h.Cleanup(func() { _ = conn.Close(context.Background()) })
	return conn
}

// Exec runs a statement against the test database.
func (h *H) Exec(db *pgx.Conn, sql string, args ...any) {
	h.Helper()
	if _, err := db.Exec(context.Background(), sql, args...); err != nil {
		h.Fatalf("exec %q: %v", sql, err)
	}
}

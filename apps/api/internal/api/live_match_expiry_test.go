package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/google/uuid"

	"github.com/laurin-notemann/beerpong/api-go/internal/config"
	"github.com/laurin-notemann/beerpong/api-go/internal/database"
	"github.com/laurin-notemann/beerpong/api-go/internal/database/db"
	"github.com/laurin-notemann/beerpong/api-go/internal/purchases"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
)

// The expiry runs on a ticker in the real API, so it is tested here against
// the database with an injected clock. It needs the POSTGRES_* variables of
// .env.example (CI has them) and is skipped without them.
func expiryTestServer(t *testing.T) (*Server, *httptest.Server) {
	t.Helper()
	host := os.Getenv("POSTGRES_HOST")
	if host == "" {
		t.Skip("POSTGRES_HOST not set")
	}
	port, _ := strconv.Atoi(os.Getenv("POSTGRES_PORT"))
	if port == 0 {
		port = 5432
	}
	ctx := context.Background()
	pool, err := database.Connect(ctx, config.Postgres{
		Host: host, Port: port, Database: os.Getenv("POSTGRES_DB_NAME"),
		User: os.Getenv("POSTGRES_USER"), Password: os.Getenv("POSTGRES_PASSWORD"), MaxConns: 4,
	}, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	if err := database.Migrate(ctx, pool); err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	hub := realtime.NewHub(log)
	srv := httptest.NewServer(hub)
	t.Cleanup(srv.Close)
	return NewServer(pool, nil, nil, purchases.Stores{}, hub, log), srv
}

type expiryFixture struct {
	s       *Server
	groupID string
}

// newExpiryFixture inserts the rows a live match needs. Everything is removed
// again, so the shared test database stays as it was.
func newExpiryFixture(t *testing.T, s *Server) expiryFixture {
	t.Helper()
	ctx := context.Background()
	userID, groupID, seasonID, memberID := uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString()
	for _, stmt := range []struct {
		sql  string
		args []any
	}{
		{"INSERT INTO users (id) VALUES ($1)", []any{userID}},
		{"INSERT INTO groups (id, name) VALUES ($1, 'expiry test')", []any{groupID}},
		{"INSERT INTO seasons (id, group_id, name) VALUES ($1, $2, 'expiry test')", []any{seasonID, groupID}},
		{"INSERT INTO group_members (id, active, group_id, user_id) VALUES ($1, true, $2, $3)", []any{memberID, groupID, userID}},
	} {
		if _, err := s.pool.Exec(ctx, stmt.sql, stmt.args...); err != nil {
			t.Fatal(err)
		}
	}
	t.Cleanup(func() {
		for _, sql := range []string{
			"DELETE FROM live_matches WHERE group_id = $1",
			"DELETE FROM group_members WHERE group_id = $1",
			"DELETE FROM seasons WHERE group_id = $1",
			"DELETE FROM groups WHERE id = $1",
		} {
			_, _ = s.pool.Exec(ctx, sql, groupID)
		}
		_, _ = s.pool.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
	})
	return expiryFixture{s: s, groupID: groupID}
}

func (f expiryFixture) insert(t *testing.T, status string, lastActivityAt time.Time, lastSeq int64) string {
	t.Helper()
	id := uuid.NewString()
	_, err := f.s.pool.Exec(context.Background(), `
		INSERT INTO live_matches (id, group_id, season_id, created_by, status, started_at, last_activity_at, last_seq)
		SELECT $1, g.id, s.id, m.id, $2, $3, $3, $4
		FROM groups g JOIN seasons s ON s.group_id = g.id JOIN group_members m ON m.group_id = g.id
		WHERE g.id = $5`, id, status, lastActivityAt, lastSeq, f.groupID)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func (f expiryFixture) get(t *testing.T, id string) db.LiveMatch {
	t.Helper()
	row, err := f.s.q.GetLiveMatch(context.Background(), id)
	if err != nil {
		t.Fatal(err)
	}
	return row.LiveMatch
}

// abandonExpired is AbandonExpiredLiveMatches restricted to this fixture's
// group: the shared test database may hold live matches of other tests or of a
// local copy of real data, and those must not be touched or counted.
func (f expiryFixture) abandonExpired(ctx context.Context, t *testing.T, now time.Time) (int, error) {
	t.Helper()
	cutoff := now.Add(-liveMatchExpiry)
	all, err := f.s.q.StaleLiveMatches(ctx, cutoff)
	if err != nil {
		t.Fatal(err)
	}
	var mine []db.StaleLiveMatchesRow
	for _, c := range all {
		if c.GroupID == f.groupID {
			mine = append(mine, c)
		}
	}
	return f.s.abandonStale(ctx, mine, cutoff)
}

const probeScope = "probe"

func waitSubscribed(t *testing.T, s *Server, conn *websocket.Conn, groupID string) {
	t.Helper()
	// a read that times out closes the connection, so it gets one long read
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	got := make(chan error, 1)
	go func() {
		_, _, err := conn.Read(ctx)
		got <- err
	}()
	ticker := time.NewTicker(20 * time.Millisecond)
	defer ticker.Stop()
	for {
		s.hub.Publish(groupID, realtime.LiveMatches, probeScope, nil)
		select {
		case err := <-got:
			if err != nil {
				t.Fatal("the websocket never got subscribed: ", err)
			}
			return
		case <-ticker.C:
		}
	}
}

// readEvent returns the next event that is not a probe left over from waitSubscribed.
func readEvent(t *testing.T, ctx context.Context, conn *websocket.Conn) []byte {
	t.Helper()
	for {
		_, data, err := conn.Read(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(data), `"scope":"`+probeScope+`"`) {
			return data
		}
	}
}

func TestAbandonExpiredLiveMatches(t *testing.T) {
	s, hubServer := expiryTestServer(t)
	f := newExpiryFixture(t, s)
	ctx := context.Background()

	// the group's phones listen
	conn, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(hubServer.URL, "http"), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.CloseNow()
	sub, _ := json.Marshal(map[string]any{"groupIds": []string{f.groupID}})
	if err := conn.Write(ctx, websocket.MessageText, sub); err != nil {
		t.Fatal(err)
	}
	// The hub has no "subscribed" signal, so probe events are published until one
	// arrives; from then on the subscription is known to be in place.
	waitSubscribed(t, s, conn, f.groupID)

	// the clock is injected through now; rows are placed relative to it
	now := time.Now().UTC().Truncate(time.Microsecond)
	s.now = func() time.Time { return now }
	idle := f.insert(t, liveInProgress, now.Add(-6*time.Hour-time.Minute), 7)
	exactly := f.insert(t, liveInProgress, now.Add(-6*time.Hour), 1)
	fresh := f.insert(t, liveInProgress, now.Add(-time.Hour), 1)
	finished := f.insert(t, liveFinished, now.Add(-24*time.Hour), 3)

	n, err := f.abandonExpired(ctx, t, now)
	if err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("abandoned %d live matches, want 1", n)
	}

	got := f.get(t, idle)
	if got.Status != liveAbandoned || got.EndedAt == nil || !got.EndedAt.Equal(now) || got.LastSeq != 7 {
		t.Errorf("idle live match: %+v", got)
	}
	for name, id := range map[string]string{"exactly six hours": exactly, "fresh": fresh} {
		if got := f.get(t, id); got.Status != liveInProgress || got.EndedAt != nil {
			t.Errorf("%s was ended: %+v", name, got)
		}
	}
	if got := f.get(t, finished); got.Status != liveFinished || got.EndedAt != nil {
		t.Errorf("finished live match was changed: %+v", got)
	}

	// the end is announced, without ops
	rctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	data := readEvent(t, rctx, conn)
	var ev struct {
		EventType string
		Scope     string
		Body      liveMatchDTO
	}
	if err := json.Unmarshal(data, &ev); err != nil {
		t.Fatal(err)
	}
	if ev.EventType != "LIVE_MATCHES" || ev.Scope != "liveMatchEnd" || ev.Body.ID != idle || ev.Body.Status != liveAbandoned || ev.Body.LastSeq != 7 || len(ev.Body.Ops) != 0 {
		t.Errorf("event: %s", data)
	}

	// a second round finds nothing and announces nothing
	if n, err := f.abandonExpired(ctx, t, now); err != nil || n != 0 {
		t.Errorf("second round: %d, %v", n, err)
	}
}

// A panic in a round must not end the expiry loop (or the process): the next
// round still runs.
func TestExpiryRoundRecoversFromPanic(t *testing.T) {
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := NewServer(nil, nil, nil, purchases.Stores{}, realtime.NewHub(log), log) // no pool: the scan panics
	s.expiryRound(context.Background())
	s.expiryRound(context.Background())
}

// An op appended between the scan and the decision keeps the live match alive
// and its lastSeq intact: the decision is made on the row under its lock.
func TestAbandonIfExpiredReadsTheRowAgain(t *testing.T) {
	s, _ := expiryTestServer(t)
	f := newExpiryFixture(t, s)
	ctx := context.Background()
	now := time.Now().UTC().Truncate(time.Microsecond)
	cutoff := now.Add(-liveMatchExpiry)
	id := f.insert(t, liveInProgress, now.Add(-7*time.Hour), 4)

	stale, err := s.q.StaleLiveMatches(ctx, cutoff)
	if err != nil {
		t.Fatal(err)
	}
	var candidate *db.StaleLiveMatchesRow
	for i := range stale {
		if stale[i].ID == id {
			candidate = &stale[i]
		}
	}
	if candidate == nil {
		t.Fatal("the idle live match is not a candidate")
	}

	// an op arrives after the scan
	if err := s.q.SetLiveMatchProgress(ctx, db.SetLiveMatchProgressParams{ID: id, LastSeq: 5, LastActivityAt: now}); err != nil {
		t.Fatal(err)
	}
	abandoned, err := s.abandonIfExpired(ctx, candidate.ID, candidate.GroupID, cutoff)
	if err != nil || abandoned {
		t.Fatalf("abandonIfExpired = %v, %v; want it to leave the live match alone", abandoned, err)
	}
	if got := f.get(t, id); got.Status != liveInProgress || got.LastSeq != 5 || !got.LastActivityAt.Equal(now) {
		t.Errorf("live match after the late op: %+v", got)
	}

	// one that ended after the scan stays as it ended
	if _, err := s.pool.Exec(ctx, "UPDATE live_matches SET status = $2, last_activity_at = $3 WHERE id = $1", id, liveFinished, now.Add(-7*time.Hour)); err != nil {
		t.Fatal(err)
	}
	if abandoned, err := s.abandonIfExpired(ctx, id, candidate.GroupID, cutoff); err != nil || abandoned {
		t.Fatalf("abandonIfExpired of a finished live match = %v, %v", abandoned, err)
	}
	if got := f.get(t, id); got.Status != liveFinished {
		t.Errorf("finished live match: %+v", got)
	}
}

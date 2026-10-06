package api

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/laurin-notemann/beerpong/api-go/internal/config"
	"github.com/laurin-notemann/beerpong/api-go/internal/push"
)

// apnsRequest is what the fake APNs got.
type apnsRequest struct {
	method, path string
	header       http.Header
	body         map[string]any
}

// fakeAPNs answers like APNs: channels get an id, device tokens in `gone`
// answer 410.
type fakeAPNs struct {
	mu       sync.Mutex
	requests []apnsRequest
	gone     map[string]bool
}

func (f *fakeAPNs) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	raw, _ := io.ReadAll(r.Body)
	_ = json.Unmarshal(raw, &body)
	f.mu.Lock()
	f.requests = append(f.requests, apnsRequest{r.Method, r.URL.Path, r.Header.Clone(), body})
	gone := f.gone[strings.TrimPrefix(r.URL.Path, "/3/device/")]
	f.mu.Unlock()
	switch {
	case gone:
		w.WriteHeader(http.StatusGone)
		_, _ = w.Write([]byte(`{"reason":"Unregistered"}`))
	case strings.HasSuffix(r.URL.Path, "/channels") && r.Method == http.MethodPost:
		w.Header().Set("apns-channel-id", "Y2hhbm5lbA==")
		w.WriteHeader(http.StatusCreated)
	}
}

// take returns the requests since the last call.
func (f *fakeAPNs) take() []apnsRequest {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := f.requests
	f.requests = nil
	return out
}

func testAPNs(t *testing.T, fake *fakeAPNs) *push.Client {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	der, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	p8 := pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: der})
	client, err := push.New(config.APNs{KeyID: "KEY", TeamID: "TEAM", Topic: "app.test", Key: base64.StdEncoding.EncodeToString(p8)})
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewUnstartedServer(fake)
	srv.EnableHTTP2 = true
	srv.StartTLS()
	t.Cleanup(srv.Close)
	return client.WithServer(srv.URL, srv.Client())
}

func contentProps(t *testing.T, req apnsRequest) map[string]any {
	t.Helper()
	state := req.body["aps"].(map[string]any)["content-state"].(map[string]any)
	if state["name"] != liveActivityName {
		t.Fatalf("content-state name = %v", state["name"])
	}
	var props map[string]any
	if err := json.Unmarshal([]byte(state["props"].(string)), &props); err != nil {
		t.Fatal(err)
	}
	return props
}

// A live match's activity starts on the group's phones with its first score,
// is updated on its channel at most every activityUpdateInterval, and ends
// with the final score; every change also refreshes the widgets. A token APNs
// no longer knows is forgotten.
func TestLiveScorePushes(t *testing.T) {
	s, _ := expiryTestServer(t)
	f := newExpiryFixture(t, s)
	fake := &fakeAPNs{gone: map[string]bool{}}
	s.SetAPNs(testAPNs(t, fake))
	ctx := context.Background()

	var userID string
	if err := s.pool.QueryRow(ctx, "SELECT user_id FROM group_members WHERE group_id = $1", f.groupID).Scan(&userID); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = s.pool.Exec(ctx, "DELETE FROM push_tokens WHERE user_id = $1", userID) })
	if _, err := s.pool.Exec(ctx, "INSERT INTO push_tokens VALUES ($1, 'aa11', 'bb22', now())", userID); err != nil {
		t.Fatal(err)
	}

	id := f.insert(t, liveInProgress, time.Now(), 3)
	setScore := func(blue, red int) {
		t.Helper()
		score, _ := json.Marshal(liveScoreDTO{BlueNames: "Anna & Ben", BlueScore: int32(blue), RedNames: "Eve", RedScore: int32(red)})
		if _, err := s.pool.Exec(ctx, "UPDATE live_matches SET display = $2, display_seq = last_seq WHERE id = $1", id, string(score)); err != nil {
			t.Fatal(err)
		}
	}
	byPath := func(reqs []apnsRequest) map[string]apnsRequest {
		out := map[string]apnsRequest{}
		for _, r := range reqs {
			out[r.method+" "+r.path] = r
		}
		return out
	}

	// no score yet: only the widgets hear of it
	if err := s.pushLiveScore(ctx, f.groupID, id, true); err != nil {
		t.Fatal(err)
	}
	if got := byPath(fake.take()); len(got) != 1 || got["POST /3/device/aa11"].path == "" {
		t.Fatalf("before a score: %v", got)
	}

	// the first score starts the activity
	setScore(2, 1)
	if err := s.pushLiveScore(ctx, f.groupID, id, true); err != nil {
		t.Fatal(err)
	}
	got := byPath(fake.take())
	if _, found := got["POST /1/apps/app.test/channels"]; !found {
		t.Fatalf("no channel created: %v", got)
	}
	start := got["POST /3/device/bb22"]
	if start.header.Get("apns-push-type") != "liveactivity" || start.header.Get("apns-topic") != "app.test.push-type.liveactivity" {
		t.Fatalf("start headers: %v", start.header)
	}
	aps := start.body["aps"].(map[string]any)
	if aps["event"] != "start" || aps["input-push-channel"] != "Y2hhbm5lbA==" || aps["attributes-type"] != liveActivityAttributes {
		t.Fatalf("start payload: %v", aps)
	}
	if props := contentProps(t, start); props["blueScore"] != 2.0 || props["redNames"] != "Eve" || props["finished"] != false {
		t.Fatalf("start props: %v", props)
	}
	widget := got["POST /3/device/aa11"]
	if widget.header.Get("apns-push-type") != "background" || widget.header.Get("apns-priority") != "5" {
		t.Fatalf("widget headers: %v", widget.header)
	}
	scores := widget.body["liveScores"].(map[string]any)
	if scores["groupId"] != f.groupID || len(scores["matches"].([]any)) != 1 {
		t.Fatalf("widget payload: %v", scores)
	}

	// later scores are broadcast on the channel
	setScore(3, 1)
	if err := s.pushLiveScore(ctx, f.groupID, id, true); err != nil {
		t.Fatal(err)
	}
	update := byPath(fake.take())["POST /4/broadcasts/apps/app.test"]
	if update.header.Get("apns-channel-id") != "Y2hhbm5lbA==" || update.body["aps"].(map[string]any)["event"] != "update" {
		t.Fatalf("update: %v %v", update.header, update.body)
	}

	// a score right after is held back: APNs throttles a channel with many
	// updates. The widgets still get it, and the end sends it.
	setScore(4, 1)
	if err := s.pushLiveScore(ctx, f.groupID, id, true); err != nil {
		t.Fatal(err)
	}
	if got := byPath(fake.take()); len(got) != 1 || got["POST /3/device/aa11"].path == "" {
		t.Fatalf("a held back update: %v", got)
	}

	// the end: a finished match keeps its final score for a while, and the
	// widget push to a phone that's gone forgets its token
	fake.gone["aa11"] = true
	if _, err := s.pool.Exec(ctx, "UPDATE live_matches SET status = $2 WHERE id = $1", id, liveFinished); err != nil {
		t.Fatal(err)
	}
	if err := s.pushLiveScore(ctx, f.groupID, id, true); err != nil {
		t.Fatal(err)
	}
	end := byPath(fake.take())["POST /4/broadcasts/apps/app.test"]
	endAps := end.body["aps"].(map[string]any)
	dismissal := time.Unix(int64(endAps["dismissal-date"].(float64)), 0)
	if endAps["event"] != "end" || time.Until(dismissal) < 10*time.Minute {
		t.Fatalf("end: %v", endAps)
	}
	if props := contentProps(t, end); props["finished"] != true || props["blueScore"] != 4.0 {
		t.Fatalf("end props: %v", props)
	}
	if lm := f.get(t, id); !lm.ActivityEnded {
		t.Fatal("the end isn't recorded")
	}
	var device *string
	if err := s.pool.QueryRow(ctx, "SELECT device_token FROM push_tokens WHERE user_id = $1", userID).Scan(&device); err != nil {
		t.Fatal(err)
	}
	if device != nil {
		t.Fatalf("the gone token is still stored: %v", *device)
	}

	// an ended activity isn't ended again
	if err := s.pushLiveScore(ctx, f.groupID, id, true); err != nil {
		t.Fatal(err)
	}
	if got := fake.take(); len(got) != 0 {
		t.Fatalf("pushed again after the end: %v", got)
	}
}

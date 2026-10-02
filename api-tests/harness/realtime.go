package harness

import (
	"context"
	"encoding/json"
	"sync"
	"time"

	"github.com/coder/websocket"
)

// Socket is a realtime client subscribed to a set of group ids.
type Socket struct {
	h    *H
	conn *websocket.Conn

	mu     sync.Mutex
	events []any
	closed error
	notify chan struct{}
}

// Listen connects to /update-socket and subscribes to the given ids.
func (h *H) Listen(groupIDs ...string) *Socket {
	h.Helper()
	s := h.Connect()
	s.Subscribe(groupIDs...)
	return s
}

// Connect opens the socket without subscribing.
func (h *H) Connect() *Socket {
	h.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	conn, _, err := websocket.Dial(ctx, h.Env.WSURL+"/update-socket", nil)
	if err != nil {
		h.Fatalf("connect realtime: %v", err)
	}
	conn.SetReadLimit(1 << 20)
	s := &Socket{h: h, conn: conn, notify: make(chan struct{}, 1)}
	go s.read()
	h.Cleanup(func() { _ = conn.Close(websocket.StatusNormalClosure, "") })
	return s
}

func (s *Socket) read() {
	for {
		_, data, err := s.conn.Read(context.Background())
		s.mu.Lock()
		if err != nil {
			s.closed = err
			s.mu.Unlock()
			s.signal()
			return
		}
		var v any
		if json.Unmarshal(data, &v) != nil {
			v = string(data)
		}
		s.events = append(s.events, v)
		s.mu.Unlock()
		s.signal()
	}
}

func (s *Socket) signal() {
	select {
	case s.notify <- struct{}{}:
	default:
	}
}

// Send writes a raw text frame.
func (s *Socket) Send(text string) {
	s.h.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := s.conn.Write(ctx, websocket.MessageText, []byte(text)); err != nil {
		s.h.Fatalf("realtime send: %v", err)
	}
}

// Subscribe sends a subscription message and gives the server a moment to
// register it (the protocol has no acknowledgement).
func (s *Socket) Subscribe(groupIDs ...string) {
	s.h.Helper()
	b, _ := json.Marshal(map[string]any{"groupIds": groupIDs})
	s.Send(string(b))
	time.Sleep(150 * time.Millisecond)
}

// Expect waits until n events arrived since the last call, records them in the
// transcript and returns them.
func (s *Socket) Expect(n int) []any {
	s.h.Helper()
	deadline := time.After(5 * time.Second)
	for {
		s.mu.Lock()
		if len(s.events) >= n {
			got := s.events[:n]
			s.events = s.events[n:]
			s.mu.Unlock()
			s.recordEvents(got)
			return got
		}
		s.mu.Unlock()
		select {
		case <-s.notify:
		case <-deadline:
			s.mu.Lock()
			have := len(s.events)
			s.mu.Unlock()
			s.h.Fatalf("expected %d realtime events, got %d", n, have)
		}
	}
}

// ExpectNone waits briefly and fails if any event arrived.
func (s *Socket) ExpectNone() {
	s.h.Helper()
	time.Sleep(400 * time.Millisecond)
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.events) > 0 {
		s.h.Fatalf("expected no realtime events, got %v", s.events)
	}
	s.h.record(Entry{Events: []any{}})
}

// Closed reports whether the server closed the connection within the wait.
func (s *Socket) Closed(wait time.Duration) bool {
	deadline := time.After(wait)
	for {
		s.mu.Lock()
		closed := s.closed != nil
		s.mu.Unlock()
		if closed {
			return true
		}
		select {
		case <-s.notify:
		case <-deadline:
			return false
		}
	}
}

func (s *Socket) recordEvents(events []any) {
	normalized := make([]any, len(events))
	for i, e := range events {
		normalized[i] = s.h.norm.Value(e, true)
	}
	s.h.record(Entry{Events: normalized})
}

// Event field accessors.
func EventScope(e any) string   { s, _ := Get(e, "scope").(string); return s }
func EventType(e any) string    { s, _ := Get(e, "eventType").(string); return s }
func EventGroupID(e any) string { s, _ := Get(e, "groupId").(string); return s }

// Package realtime serves /update-socket: clients send {"groupIds": [...]}
// and receive every event published for those groups. See
// apps/api/README-Socket-Updates.md for the protocol.
package realtime

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"regexp"
	"sync"
	"time"

	"github.com/coder/websocket"
)

const (
	maxSubscriptions = 100
	sendBuffer       = 64
	writeTimeout     = 10 * time.Second
	pingInterval     = 30 * time.Second
)

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// IsUUID reports whether s is a UUID in its dashed text form.
func IsUUID(s string) bool { return uuidPattern.MatchString(s) }

// Event types, as the app switches on them.
const (
	Matches     = "MATCHES"
	Players     = "PLAYERS"
	Seasons     = "SEASONS"
	Groups      = "GROUPS"
	Rules       = "RULES"
	RuleMoves   = "RULE_MOVES"
	Assets      = "ASSETS"
	Profiles    = "PROFILES"
	LiveMatches = "LIVE_MATCHES"
	Formations  = "FORMATIONS"
	Tournaments = "TOURNAMENTS"
	VisionHits  = "VISION_HITS"
)

type event struct {
	GroupID   string `json:"groupId"`
	EventType string `json:"eventType"`
	Scope     string `json:"scope"`
	Body      any    `json:"body"`
}

type client struct {
	send chan []byte
	// groups and closed are guarded by Hub.mu.
	groups map[string]struct{}
	closed bool
}

type Hub struct {
	log *slog.Logger

	mu      sync.Mutex
	byGroup map[string]map[*client]struct{}
}

func NewHub(log *slog.Logger) *Hub {
	return &Hub{log: log, byGroup: map[string]map[*client]struct{}{}}
}

// Publish sends an event to every client subscribed to groupID. It never
// blocks on a slow client: a client whose buffer is full is disconnected and
// catches up through its reconnect refetch.
func (h *Hub) Publish(groupID, eventType, scope string, body any) {
	msg, err := json.Marshal(event{GroupID: groupID, EventType: eventType, Scope: scope, Body: body})
	if err != nil {
		h.log.Error("realtime: marshal event", "scope", scope, "err", err)
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.byGroup[groupID] {
		select {
		case c.send <- msg:
		default:
			h.log.Warn("realtime: client too slow, dropping connection", "group", groupID)
			h.removeLocked(c)
		}
	}
}

// subscribe replaces the client's subscriptions with ids. (The Java backend
// kept old subscriptions around until the socket closed.)
func (h *Hub) subscribe(c *client, ids map[string]struct{}) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if c.closed {
		return
	}
	for id := range c.groups {
		h.unsubscribeLocked(c, id)
	}
	c.groups = ids
	for id := range ids {
		set := h.byGroup[id]
		if set == nil {
			set = map[*client]struct{}{}
			h.byGroup[id] = set
		}
		set[c] = struct{}{}
	}
}

func (h *Hub) unsubscribeLocked(c *client, id string) {
	set := h.byGroup[id]
	delete(set, c)
	if len(set) == 0 {
		delete(h.byGroup, id)
	}
}

// removeLocked unsubscribes the client and closes its send channel, which
// ends its writer and with it the connection.
func (h *Hub) removeLocked(c *client) {
	if c.closed {
		return
	}
	for id := range c.groups {
		h.unsubscribeLocked(c, id)
	}
	c.groups = nil
	c.closed = true
	close(c.send)
}

// ServeHTTP upgrades the request and runs the connection until it closes.
func (h *Hub) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		// The Java backend allowed every origin; native clients send none.
		InsecureSkipVerify: true,
	})
	if err != nil {
		return
	}
	conn.SetReadLimit(64 << 10)

	c := &client{send: make(chan []byte, sendBuffer), groups: map[string]struct{}{}}
	ctx, cancel := context.WithCancel(context.Background())
	go h.write(ctx, conn, c, cancel)
	h.read(ctx, conn, c)
	cancel()
	h.mu.Lock()
	h.removeLocked(c)
	h.mu.Unlock()
}

func (h *Hub) read(ctx context.Context, conn *websocket.Conn, c *client) {
	for {
		typ, data, err := conn.Read(ctx)
		if err != nil {
			return
		}
		if typ != websocket.MessageText {
			continue
		}
		var msg map[string]json.RawMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			// The Java backend closed the session on unparseable messages.
			_ = conn.Close(websocket.StatusInternalError, "invalid message")
			return
		}
		ids := groupIDs(msg)
		if len(ids) == 0 {
			continue
		}
		h.subscribe(c, ids)
	}
}

func (h *Hub) write(ctx context.Context, conn *websocket.Conn, c *client, cancel context.CancelFunc) {
	defer cancel()
	ping := time.NewTicker(pingInterval)
	defer ping.Stop()
	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				// removed by Publish because the client could not keep up
				_ = conn.Close(websocket.StatusTryAgainLater, "too slow")
				return
			}
			wctx, done := context.WithTimeout(ctx, writeTimeout)
			err := conn.Write(wctx, websocket.MessageText, msg)
			done()
			if err != nil {
				return
			}
		case <-ping.C:
			pctx, done := context.WithTimeout(ctx, writeTimeout)
			err := conn.Ping(pctx)
			done()
			if err != nil {
				return
			}
		case <-ctx.Done():
			return
		}
	}
}

// groupIDs extracts the valid group ids of a subscription message. Messages
// without a groupIds array are ignored.
func groupIDs(msg map[string]json.RawMessage) map[string]struct{} {
	raw, ok := msg["groupIds"]
	if !ok {
		return nil
	}
	var items []json.RawMessage
	if json.Unmarshal(raw, &items) != nil {
		return nil
	}
	ids := map[string]struct{}{}
	for _, item := range items {
		var id string
		if json.Unmarshal(item, &id) != nil || !uuidPattern.MatchString(id) {
			continue
		}
		ids[id] = struct{}{}
		if len(ids) == maxSubscriptions {
			break
		}
	}
	return ids
}

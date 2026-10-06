// Package push talks to the Apple Push Notification service: it starts Live
// Activities on phones, broadcasts their updates on a channel per live match,
// and sends the silent pushes that refresh the home screen widget.
package push

import (
	"bytes"
	"context"
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/laurin-notemann/beerpong/api-go/internal/config"
)

// ErrBadToken means APNs no longer accepts a device's token (the app was
// deleted, or the token belongs to the other environment). Forget the token.
var ErrBadToken = errors.New("apns: token is no longer valid")

// ErrTooManyRequests means APNs throttled the device token or channel (429).
// Send the newest state again later.
var ErrTooManyRequests = errors.New("429 TooManyRequests")

// Push types, as in the apns-push-type header.
const (
	LiveActivity = "liveactivity"
	Background   = "background"
)

// Client sends pushes for one app with a token-based (.p8) key.
type Client struct {
	cfg  config.APNs
	key  *ecdsa.PrivateKey
	http *http.Client

	mu       sync.Mutex
	jwt      string
	signedAt time.Time

	// set by WithServer; Apple's hosts otherwise
	server string
}

// WithServer sends every request to url through client instead of to Apple.
// For tests.
func (c *Client) WithServer(url string, client *http.Client) *Client {
	c.server, c.http = url, client
	return c
}

// New returns nil without a key: the API then sends no pushes.
func New(cfg config.APNs) (*Client, error) {
	if cfg.Key == "" || cfg.KeyID == "" {
		return nil, nil
	}
	raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(cfg.Key))
	if err != nil {
		raw = []byte(cfg.Key) // the PEM itself
	}
	block, _ := pem.Decode(raw)
	if block == nil {
		return nil, errors.New("APNS_KEY is not a .p8 key")
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("APNS_KEY: %w", err)
	}
	key, ok := parsed.(*ecdsa.PrivateKey)
	if !ok {
		return nil, errors.New("APNS_KEY is not an EC key")
	}
	// The default transport speaks HTTP/2, which APNs requires.
	return &Client{cfg: cfg, key: key, http: &http.Client{Timeout: 20 * time.Second}}, nil
}

// bearer is the provider token. APNs wants it renewed at most every 20 and at
// least every 60 minutes.
func (c *Client) bearer() (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.jwt != "" && time.Since(c.signedAt) < 40*time.Minute {
		return c.jwt, nil
	}
	t := jwt.NewWithClaims(jwt.SigningMethodES256, jwt.MapClaims{"iss": c.cfg.TeamID, "iat": time.Now().Unix()})
	t.Header["kid"] = c.cfg.KeyID
	signed, err := t.SignedString(c.key)
	if err != nil {
		return "", err
	}
	c.jwt, c.signedAt = signed, time.Now()
	return signed, nil
}

func (c *Client) pushHost() string {
	if c.server != "" {
		return c.server
	}
	if c.cfg.Production {
		return "https://api.push.apple.com"
	}
	return "https://api.sandbox.push.apple.com"
}

func (c *Client) channelHost() string {
	if c.server != "" {
		return c.server
	}
	if c.cfg.Production {
		return "https://api-manage-broadcast.push.apple.com:2196"
	}
	return "https://api-manage-broadcast.sandbox.push.apple.com:2195"
}

// Send pushes payload to one device token. Live Activity pushes (to a
// push-to-start token) and background pushes go to different topics.
func (c *Client) Send(ctx context.Context, token, pushType string, payload any) error {
	topic, priority := c.cfg.Topic, "10"
	if pushType == LiveActivity {
		topic += ".push-type.liveactivity"
	} else {
		priority = "5" // background pushes must not use 10
	}
	_, err := c.do(ctx, http.MethodPost, c.pushHost()+"/3/device/"+token, payload, map[string]string{
		"apns-push-type":  pushType,
		"apns-topic":      topic,
		"apns-priority":   priority,
		"apns-expiration": strconv.FormatInt(time.Now().Add(10*time.Minute).Unix(), 10),
	})
	return err
}

// CreateChannel opens a broadcast channel for one Live Activity event. It
// keeps the most recent message for phones that are offline, so they still
// get the end.
func (c *Client) CreateChannel(ctx context.Context) (string, error) {
	res, err := c.do(ctx, http.MethodPost, c.channelHost()+"/1/apps/"+c.cfg.Topic+"/channels",
		map[string]any{"message-storage-policy": 1, "push-type": "LiveActivity"}, nil)
	if err != nil {
		return "", err
	}
	id := res.Get("apns-channel-id")
	if id == "" {
		return "", errors.New("apns: created channel has no id")
	}
	return id, nil
}

// DeleteChannel frees a channel; an app can have at most 10,000.
func (c *Client) DeleteChannel(ctx context.Context, id string) error {
	_, err := c.do(ctx, http.MethodDelete, c.channelHost()+"/1/apps/"+c.cfg.Topic+"/channels", nil,
		map[string]string{"apns-channel-id": id})
	return err
}

// Broadcast sends a Live Activity update or end to every phone on the channel.
func (c *Client) Broadcast(ctx context.Context, channelID string, payload any) error {
	_, err := c.do(ctx, http.MethodPost, c.pushHost()+"/4/broadcasts/apps/"+c.cfg.Topic, payload, map[string]string{
		"apns-channel-id": channelID,
		"apns-push-type":  LiveActivity,
		"apns-priority":   "10",
		"apns-expiration": strconv.FormatInt(time.Now().Add(time.Hour).Unix(), 10),
	})
	return err
}

func (c *Client) do(ctx context.Context, method, url string, body any, headers map[string]string) (http.Header, error) {
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reader = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, url, reader)
	if err != nil {
		return nil, err
	}
	bearer, err := c.bearer()
	if err != nil {
		return nil, err
	}
	req.Header.Set("authorization", "bearer "+bearer)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode < 300 {
		return res.Header, nil
	}
	var reason struct {
		Reason string `json:"reason"`
	}
	_ = json.NewDecoder(io.LimitReader(res.Body, 4096)).Decode(&reason)
	if res.StatusCode == http.StatusGone || reason.Reason == "BadDeviceToken" || reason.Reason == "DeviceTokenNotForTopic" {
		return nil, ErrBadToken
	}
	if res.StatusCode == http.StatusTooManyRequests {
		return nil, fmt.Errorf("apns %s %s: %w", method, req.URL.Path, ErrTooManyRequests)
	}
	return nil, fmt.Errorf("apns %s %s: %d %s", method, req.URL.Path, res.StatusCode, reason.Reason)
}

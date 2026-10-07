package purchases

import (
	"context"
	"crypto/rsa"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const androidPublisherScope = "https://www.googleapis.com/auth/androidpublisher"

// Google asks the Play Developer API about purchases, as a service account
// with access to the app in the Play Console, and authenticates the
// Real-time Developer Notifications Pub/Sub pushes with a shared token.
type Google struct {
	packageName       string
	notificationToken string

	email    string
	tokenURI string
	key      *rsa.PrivateKey
	baseURL  string
	client   *http.Client

	mu      sync.Mutex
	access  string
	expires time.Time
}

// NewGoogle reads a service account key, as JSON or base64 of the JSON.
func NewGoogle(packageName, serviceAccount, notificationToken string) (*Google, error) {
	raw := []byte(strings.TrimSpace(serviceAccount))
	if len(raw) > 0 && raw[0] != '{' {
		decoded, err := base64.StdEncoding.DecodeString(string(raw))
		if err != nil {
			return nil, fmt.Errorf("google service account: neither JSON nor base64: %w", err)
		}
		raw = decoded
	}
	var sa struct {
		ClientEmail string `json:"client_email"`
		PrivateKey  string `json:"private_key"`
		TokenURI    string `json:"token_uri"`
	}
	if err := json.Unmarshal(raw, &sa); err != nil {
		return nil, fmt.Errorf("google service account: %w", err)
	}
	key, err := jwt.ParseRSAPrivateKeyFromPEM([]byte(sa.PrivateKey))
	if err != nil {
		return nil, fmt.Errorf("google service account key: %w", err)
	}
	if sa.ClientEmail == "" || sa.TokenURI == "" {
		return nil, errors.New("google service account: client_email or token_uri missing")
	}
	return &Google{
		packageName: packageName, notificationToken: notificationToken,
		email: sa.ClientEmail, tokenURI: sa.TokenURI, key: key,
		baseURL: "https://androidpublisher.googleapis.com",
		client:  &http.Client{Timeout: 15 * time.Second},
	}, nil
}

// GoogleProduct is a one-time product purchase (purchases.products.get).
type GoogleProduct struct {
	// 0 purchased, 1 canceled, 2 pending
	PurchaseState      int    `json:"purchaseState"`
	PurchaseTimeMillis string `json:"purchaseTimeMillis"`
	OrderID            string `json:"orderId"`
	// 0 for license testers, missing for real purchases
	PurchaseType *int `json:"purchaseType"`
}

func (p GoogleProduct) PurchasedAt() time.Time {
	ms, _ := strconv.ParseInt(p.PurchaseTimeMillis, 10, 64)
	return time.UnixMilli(ms).UTC()
}

// Environment is "test" for license testers and "production" otherwise.
func (p GoogleProduct) Environment() string {
	if p.PurchaseType != nil && *p.PurchaseType == 0 {
		return "test"
	}
	return "production"
}

// Product looks up a purchase token of productID. A token Google doesn't
// know (or one of another app) is ErrInvalid; a pending purchase too, since
// it isn't paid yet.
func (g *Google) Product(ctx context.Context, productID, token string) (GoogleProduct, error) {
	var p GoogleProduct
	access, err := g.accessToken(ctx)
	if err != nil {
		return p, err
	}
	u := fmt.Sprintf("%s/androidpublisher/v3/applications/%s/purchases/products/%s/tokens/%s",
		g.baseURL, url.PathEscape(g.packageName), url.PathEscape(productID), url.PathEscape(token))
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return p, err
	}
	req.Header.Set("Authorization", "Bearer "+access)
	res, err := g.client.Do(req)
	if err != nil {
		return p, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	switch {
	case res.StatusCode == http.StatusBadRequest || res.StatusCode == http.StatusNotFound || res.StatusCode == http.StatusGone:
		return p, fmt.Errorf("%w: google play answered %d", ErrInvalid, res.StatusCode)
	case res.StatusCode != http.StatusOK:
		// 401/403: the service account lost access to the app
		return p, fmt.Errorf("google play answered %d: %s", res.StatusCode, body)
	}
	if err := json.Unmarshal(body, &p); err != nil {
		return p, fmt.Errorf("google play purchase: %w", err)
	}
	if p.PurchaseState == 2 {
		return p, fmt.Errorf("%w: pending", ErrInvalid)
	}
	return p, nil
}

// accessToken is an OAuth token for the service account, reused until
// shortly before it expires.
func (g *Google) accessToken(ctx context.Context) (string, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if g.access != "" && time.Now().Before(g.expires) {
		return g.access, nil
	}
	now := time.Now()
	assertion, err := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"iss": g.email, "scope": androidPublisherScope, "aud": g.tokenURI,
		"iat": now.Unix(), "exp": now.Add(time.Hour).Unix(),
	}).SignedString(g.key)
	if err != nil {
		return "", err
	}
	form := url.Values{"grant_type": {"urn:ietf:params:oauth:grant-type:jwt-bearer"}, "assertion": {assertion}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.tokenURI, strings.NewReader(form.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := g.client.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	var t struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode != http.StatusOK || json.Unmarshal(body, &t) != nil || t.AccessToken == "" {
		return "", fmt.Errorf("google oauth answered %d: %s", res.StatusCode, body)
	}
	g.access = t.AccessToken
	g.expires = now.Add(time.Duration(t.ExpiresIn)*time.Second - time.Minute)
	return g.access, nil
}

// Authorized checks the token of a Pub/Sub push (?token= in the push URL).
func (g *Google) Authorized(token string) bool {
	return g.notificationToken != "" && subtle.ConstantTimeCompare([]byte(token), []byte(g.notificationToken)) == 1
}

// GoogleNotification is a Real-time Developer Notification. Voided is set
// when a one-time purchase was refunded or charged back.
type GoogleNotification struct {
	PackageName string
	Voided      *GoogleVoided
	EventTime   time.Time
}

type GoogleVoided struct {
	PurchaseToken string `json:"purchaseToken"`
	// 1 subscription, 2 one-time product
	ProductType int `json:"productType"`
}

// ParseNotification decodes a Pub/Sub push body.
func ParseNotification(body []byte) (GoogleNotification, error) {
	var n GoogleNotification
	var push struct {
		Message struct {
			Data string `json:"data"`
		} `json:"message"`
	}
	if err := json.Unmarshal(body, &push); err != nil {
		return n, fmt.Errorf("%w: %v", ErrInvalid, err)
	}
	data, err := base64.StdEncoding.DecodeString(push.Message.Data)
	if err != nil {
		return n, fmt.Errorf("%w: %v", ErrInvalid, err)
	}
	var d struct {
		PackageName     string        `json:"packageName"`
		EventTimeMillis string        `json:"eventTimeMillis"`
		VoidedPurchase  *GoogleVoided `json:"voidedPurchaseNotification"`
	}
	if err := json.Unmarshal(data, &d); err != nil {
		return n, fmt.Errorf("%w: %v", ErrInvalid, err)
	}
	ms, _ := strconv.ParseInt(d.EventTimeMillis, 10, 64)
	return GoogleNotification{PackageName: d.PackageName, Voided: d.VoidedPurchase, EventTime: time.UnixMilli(ms).UTC()}, nil
}

// PackageName is the app the purchases are for.
func (g *Google) PackageName() string { return g.packageName }

package purchases

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// fakePlay is the OAuth token endpoint and purchases.products.get, answering
// per purchase token.
func fakePlay(t *testing.T, key *rsa.PrivateKey, purchases map[string]string) (*httptest.Server, *int) {
	t.Helper()
	tokenCalls := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/token" {
			tokenCalls++
			_ = r.ParseForm()
			claims := jwt.MapClaims{}
			if _, err := jwt.ParseWithClaims(r.Form.Get("assertion"), claims, func(*jwt.Token) (any, error) { return &key.PublicKey, nil }); err != nil {
				t.Errorf("assertion: %v", err)
			}
			if claims["scope"] != androidPublisherScope || claims["iss"] != "versus@example.iam.gserviceaccount.com" {
				t.Errorf("claims: %v", claims)
			}
			_, _ = w.Write([]byte(`{"access_token":"access-1","expires_in":3600}`))
			return
		}
		if r.Header.Get("Authorization") != "Bearer access-1" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		prefix := "/androidpublisher/v3/applications/com.linusbolls.mobileapp/purchases/products/premium/tokens/"
		body, found := purchases[strings.TrimPrefix(r.URL.Path, prefix)]
		if !strings.HasPrefix(r.URL.Path, prefix) || !found {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv, &tokenCalls
}

func newTestGoogle(t *testing.T, purchases map[string]string) (*Google, *int) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	srv, tokenCalls := fakePlay(t, key, purchases)
	keyPEM := pem.EncodeToMemory(&pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(key)})
	sa, _ := json.Marshal(map[string]string{
		"client_email": "versus@example.iam.gserviceaccount.com", "private_key": string(keyPEM), "token_uri": srv.URL + "/token",
	})
	// the server's env may hold the key as base64
	g, err := NewGoogle("com.linusbolls.mobileapp", base64.StdEncoding.EncodeToString(sa), "rtdn-secret")
	if err != nil {
		t.Fatal(err)
	}
	g.baseURL = srv.URL
	return g, tokenCalls
}

func TestGoogleProduct(t *testing.T) {
	g, tokenCalls := newTestGoogle(t, map[string]string{
		"bought":   `{"purchaseState":0,"purchaseTimeMillis":"1759600000000","orderId":"GPA.1"}`,
		"tester":   `{"purchaseState":0,"purchaseTimeMillis":"1759600000000","purchaseType":0}`,
		"refunded": `{"purchaseState":1,"purchaseTimeMillis":"1759600000000"}`,
		"pending":  `{"purchaseState":2,"purchaseTimeMillis":"1759600000000"}`,
	})
	ctx := context.Background()

	p, err := g.Product(ctx, Premium, "bought")
	if err != nil || p.PurchaseState != 0 || p.Environment() != "production" || p.PurchasedAt().UnixMilli() != 1759600000000 {
		t.Fatalf("bought: %+v %v", p, err)
	}
	if p, err := g.Product(ctx, Premium, "tester"); err != nil || p.Environment() != "test" {
		t.Fatalf("license tester: %+v %v", p, err)
	}
	if p, err := g.Product(ctx, Premium, "refunded"); err != nil || p.PurchaseState != 1 {
		t.Fatalf("refunded is reported, the caller rejects it: %+v %v", p, err)
	}
	for _, token := range []string{"pending", "unknown"} {
		if _, err := g.Product(ctx, Premium, token); !errors.Is(err, ErrInvalid) {
			t.Fatalf("%s: want ErrInvalid, got %v", token, err)
		}
	}
	if *tokenCalls != 1 {
		t.Fatalf("the access token is reused, got %d token requests", *tokenCalls)
	}
}

func TestGoogleLostAccessIsNotAnInvalidPurchase(t *testing.T) {
	g, _ := newTestGoogle(t, nil)
	g.access, g.expires = "revoked", time.Now().Add(time.Hour)
	if _, err := g.Product(context.Background(), Premium, "bought"); err == nil || errors.Is(err, ErrInvalid) {
		t.Fatalf("a 401 is a configuration error, got %v", err)
	}
}

func TestParseNotification(t *testing.T) {
	push := func(data string) []byte {
		b, _ := json.Marshal(map[string]any{
			"message":      map[string]any{"data": base64.StdEncoding.EncodeToString([]byte(data)), "messageId": "1"},
			"subscription": "projects/versus/subscriptions/play",
		})
		return b
	}
	n, err := ParseNotification(push(`{"version":"1.0","packageName":"com.linusbolls.mobileapp","eventTimeMillis":"1759600000000",
		"voidedPurchaseNotification":{"purchaseToken":"bought","orderId":"GPA.1","productType":2,"refundType":1}}`))
	if err != nil || n.Voided == nil || n.Voided.PurchaseToken != "bought" || n.Voided.ProductType != 2 || n.EventTime.UnixMilli() != 1759600000000 {
		t.Fatalf("voided: %+v %v", n, err)
	}
	n, err = ParseNotification(push(`{"version":"1.0","packageName":"com.linusbolls.mobileapp","testNotification":{"version":"1.0"}}`))
	if err != nil || n.Voided != nil {
		t.Fatalf("test notification: %+v %v", n, err)
	}
	if _, err := ParseNotification([]byte(`{"message":{"data":"not base64!"}}`)); !errors.Is(err, ErrInvalid) {
		t.Fatalf("garbage: %v", err)
	}
	g, _ := newTestGoogle(t, nil)
	if !g.Authorized("rtdn-secret") || g.Authorized("") || g.Authorized("rtdn-secreT") {
		t.Fatal("push token check")
	}
}

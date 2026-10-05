package harness

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"math/big"
	"os"
	"sync"
	"time"
)

// AppleBundleID is the bundle the API under test accepts purchases for.
const AppleBundleID = "com.linusbolls.mobileapp"

// Apple signs JWS the way the App Store does: ES256 with an x5c chain of
// leaf, intermediate and root, carrying Apple's marker extensions. The API
// under test trusts testdata/apple/root.pem instead of Apple's root
// (APPLE_ROOT_CA_FILE); its key is a test key and signs nothing real.
type Apple struct {
	key *ecdsa.PrivateKey
	x5c []string
}

var (
	trustedApple     *Apple
	trustedAppleErr  error
	trustedAppleOnce sync.Once
)

// Apple is the signer the API trusts.
func (h *H) Apple() *Apple {
	h.Helper()
	trustedAppleOnce.Do(func() {
		var root *x509.Certificate
		var key any
		root, key, trustedAppleErr = loadRoot("testdata/apple/root.pem", "testdata/apple/root-key.pem")
		if trustedAppleErr == nil {
			trustedApple, trustedAppleErr = newApple(root, key.(*ecdsa.PrivateKey))
		}
	})
	if trustedAppleErr != nil {
		h.Fatalf("apple test signer: %v", trustedAppleErr)
	}
	return trustedApple
}

// ForgedApple signs with a root of its own that the API doesn't trust.
func (h *H) ForgedApple() *Apple {
	h.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		h.Fatalf("forged root key: %v", err)
	}
	root, err := issue(&x509.Certificate{
		Subject: pkix.Name{CommonName: "Forged root"}, IsCA: true, BasicConstraintsValid: true,
		KeyUsage: x509.KeyUsageCertSign,
	}, nil, &key.PublicKey, key)
	if err != nil {
		h.Fatalf("forged root: %v", err)
	}
	a, err := newApple(root, key)
	if err != nil {
		h.Fatalf("forged signer: %v", err)
	}
	return a
}

// Transaction is a signed StoreKit 2 transaction of Versus Premium; fields
// overrides or adds payload fields.
func (a *Apple) Transaction(originalTransactionID string, fields map[string]any) string {
	now := time.Now().UnixMilli()
	payload := map[string]any{
		"transactionId": originalTransactionID, "originalTransactionId": originalTransactionID,
		"bundleId": AppleBundleID, "productId": "premium", "type": "Non-Consumable",
		"purchaseDate": now, "originalPurchaseDate": now, "signedDate": now,
		"environment": "Sandbox", "inAppOwnershipType": "PURCHASED",
	}
	for k, v := range fields {
		payload[k] = v
	}
	return a.sign(payload)
}

// Notification is a signed App Store Server Notification V2 body.
func (a *Apple) Notification(notificationType, signedTransaction string) map[string]any {
	return map[string]any{"signedPayload": a.sign(map[string]any{
		"notificationType": notificationType, "notificationUUID": "8b1a7c3e-0c3f-4a51-9d1e-3c2b5f9e7a10",
		"version": "2.0", "signedDate": time.Now().UnixMilli(),
		"data": map[string]any{
			"bundleId": AppleBundleID, "environment": "Sandbox", "signedTransactionInfo": signedTransaction,
		},
	})}
}

func (a *Apple) sign(payload map[string]any) string {
	header, _ := json.Marshal(map[string]any{"alg": "ES256", "x5c": a.x5c})
	body, _ := json.Marshal(payload)
	input := base64.RawURLEncoding.EncodeToString(header) + "." + base64.RawURLEncoding.EncodeToString(body)
	digest := sha256.Sum256([]byte(input))
	r, s, err := ecdsa.Sign(rand.Reader, a.key, digest[:])
	if err != nil {
		panic(err)
	}
	sig := make([]byte, 64)
	r.FillBytes(sig[:32])
	s.FillBytes(sig[32:])
	return input + "." + base64.RawURLEncoding.EncodeToString(sig)
}

// newApple issues an intermediate and a leaf under root, like Apple's
// "Apple Worldwide Developer Relations" and "Prod ECC Mac App Store" ones.
func newApple(root *x509.Certificate, rootKey *ecdsa.PrivateKey) (*Apple, error) {
	interKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}
	inter, err := issue(&x509.Certificate{
		Subject: pkix.Name{CommonName: "Test WWDR"}, IsCA: true, BasicConstraintsValid: true,
		KeyUsage:        x509.KeyUsageCertSign,
		ExtraExtensions: []pkix.Extension{marker(1, 2, 840, 113635, 100, 6, 2, 1)},
	}, root, &interKey.PublicKey, rootKey)
	if err != nil {
		return nil, err
	}
	leafKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, err
	}
	leaf, err := issue(&x509.Certificate{
		Subject:         pkix.Name{CommonName: "Test App Store signing"},
		KeyUsage:        x509.KeyUsageDigitalSignature,
		ExtraExtensions: []pkix.Extension{marker(1, 2, 840, 113635, 100, 6, 11, 1)},
	}, inter, &leafKey.PublicKey, interKey)
	if err != nil {
		return nil, err
	}
	x5c := []string{}
	for _, c := range []*x509.Certificate{leaf, inter, root} {
		x5c = append(x5c, base64.StdEncoding.EncodeToString(c.Raw))
	}
	return &Apple{key: leafKey, x5c: x5c}, nil
}

// issue signs template with parentKey; a nil parent self-signs.
func issue(template, parent *x509.Certificate, pub any, parentKey *ecdsa.PrivateKey) (*x509.Certificate, error) {
	serial, err := rand.Int(rand.Reader, big.NewInt(1<<62))
	if err != nil {
		return nil, err
	}
	template.SerialNumber = serial
	template.NotBefore = time.Now().Add(-time.Hour)
	template.NotAfter = time.Now().Add(24 * time.Hour)
	if parent == nil {
		parent = template
	}
	der, err := x509.CreateCertificate(rand.Reader, template, parent, pub, parentKey)
	if err != nil {
		return nil, err
	}
	return x509.ParseCertificate(der)
}

func marker(oid ...int) pkix.Extension {
	return pkix.Extension{Id: asn1.ObjectIdentifier(oid), Value: []byte{0x05, 0x00}}
}

func loadRoot(certFile, keyFile string) (*x509.Certificate, any, error) {
	certPEM, err := os.ReadFile(certFile)
	if err != nil {
		return nil, nil, err
	}
	keyPEM, err := os.ReadFile(keyFile)
	if err != nil {
		return nil, nil, err
	}
	certBlock, _ := pem.Decode(certPEM)
	keyBlock, _ := pem.Decode(keyPEM)
	if certBlock == nil || keyBlock == nil {
		return nil, nil, os.ErrInvalid
	}
	cert, err := x509.ParseCertificate(certBlock.Bytes)
	if err != nil {
		return nil, nil, err
	}
	key, err := x509.ParsePKCS8PrivateKey(keyBlock.Bytes)
	return cert, key, err
}

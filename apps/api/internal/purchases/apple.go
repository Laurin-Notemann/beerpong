package purchases

import (
	"bytes"
	"crypto/ecdsa"
	"crypto/sha256"
	"crypto/x509"
	_ "embed"
	"encoding/asn1"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"
)

//go:embed AppleRootCA-G3.pem
var appleRootCA []byte

// Apple's marker extensions on the certificates that sign App Store data
// (leaf) and on the intermediate that issues them.
var (
	oidAppleLeaf         = asn1.ObjectIdentifier{1, 2, 840, 113635, 100, 6, 11, 1}
	oidAppleIntermediate = asn1.ObjectIdentifier{1, 2, 840, 113635, 100, 6, 2, 1}
)

// Apple checks the JWS that StoreKit 2 hands the app and that App Store
// Server Notifications V2 post: ES256, signed by a certificate chain up to
// Apple Root CA - G3. It needs no key or network access.
type Apple struct {
	bundleID string
	roots    *x509.CertPool
}

// NewApple trusts Apple's root, or rootPEM instead when it is set (the
// contract suite signs with its own).
func NewApple(bundleID string, rootPEM []byte) (*Apple, error) {
	if len(rootPEM) == 0 {
		rootPEM = appleRootCA
	}
	roots := x509.NewCertPool()
	if !roots.AppendCertsFromPEM(rootPEM) {
		return nil, errors.New("apple root certificate: no PEM certificate")
	}
	return &Apple{bundleID: bundleID, roots: roots}, nil
}

// AppleTransaction is the part of a signed transaction Versus uses. Dates
// are milliseconds since the epoch.
type AppleTransaction struct {
	OriginalTransactionID string `json:"originalTransactionId"`
	BundleID              string `json:"bundleId"`
	ProductID             string `json:"productId"`
	PurchaseDate          int64  `json:"purchaseDate"`
	ExpiresDate           *int64 `json:"expiresDate"`
	RevocationDate        *int64 `json:"revocationDate"`
	// "Sandbox" (TestFlight, App Review) or "Production"
	Environment string `json:"environment"`
}

// Transaction verifies a signed transaction from StoreKit.
func (a *Apple) Transaction(jws string) (AppleTransaction, error) {
	var t AppleTransaction
	if err := a.verify(jws, &t); err != nil {
		return t, err
	}
	if t.BundleID != a.bundleID {
		return t, fmt.Errorf("%w: bundle %q", ErrInvalid, t.BundleID)
	}
	if t.Environment != "Sandbox" && t.Environment != "Production" {
		return t, fmt.Errorf("%w: environment %q", ErrInvalid, t.Environment)
	}
	if t.OriginalTransactionID == "" {
		return t, fmt.Errorf("%w: no originalTransactionId", ErrInvalid)
	}
	return t, nil
}

// AppleNotification is an App Store Server Notification V2 with its
// transaction, if it has one.
type AppleNotification struct {
	Type        string
	Subtype     string
	Transaction *AppleTransaction
}

// Notification verifies the signedPayload of a notification and the
// transaction inside it.
func (a *Apple) Notification(signedPayload string) (AppleNotification, error) {
	var p struct {
		NotificationType string `json:"notificationType"`
		Subtype          string `json:"subtype"`
		Data             struct {
			BundleID              string `json:"bundleId"`
			SignedTransactionInfo string `json:"signedTransactionInfo"`
		} `json:"data"`
	}
	if err := a.verify(signedPayload, &p); err != nil {
		return AppleNotification{}, err
	}
	if p.Data.BundleID != a.bundleID {
		return AppleNotification{}, fmt.Errorf("%w: bundle %q", ErrInvalid, p.Data.BundleID)
	}
	n := AppleNotification{Type: p.NotificationType, Subtype: p.Subtype}
	if p.Data.SignedTransactionInfo != "" {
		t, err := a.Transaction(p.Data.SignedTransactionInfo)
		if err != nil {
			return n, err
		}
		n.Transaction = &t
	}
	return n, nil
}

// verify checks the signature and chain of a JWS and decodes its payload
// into v.
func (a *Apple) verify(jws string, v any) error {
	parts := strings.Split(jws, ".")
	if len(parts) != 3 {
		return fmt.Errorf("%w: not a JWS", ErrInvalid)
	}
	var header struct {
		Alg string   `json:"alg"`
		X5C []string `json:"x5c"`
	}
	if err := decodeSegment(parts[0], &header); err != nil {
		return err
	}
	var signed struct {
		SignedDate int64 `json:"signedDate"`
	}
	if err := decodeSegment(parts[1], &signed); err != nil {
		return err
	}
	if header.Alg != "ES256" || len(header.X5C) != 3 {
		return fmt.Errorf("%w: alg %q with %d certificates", ErrInvalid, header.Alg, len(header.X5C))
	}

	certs := make([]*x509.Certificate, 2)
	for i := range certs {
		der, err := base64.StdEncoding.DecodeString(header.X5C[i])
		if err != nil {
			return fmt.Errorf("%w: certificate %d: %v", ErrInvalid, i, err)
		}
		if certs[i], err = x509.ParseCertificate(der); err != nil {
			return fmt.Errorf("%w: certificate %d: %v", ErrInvalid, i, err)
		}
	}
	leaf, intermediate := certs[0], certs[1]
	if !hasExtension(leaf, oidAppleLeaf) || !hasExtension(intermediate, oidAppleIntermediate) {
		return fmt.Errorf("%w: not an App Store certificate", ErrInvalid)
	}
	intermediates := x509.NewCertPool()
	intermediates.AddCert(intermediate)
	// Checked at signing time, like Apple's own library does offline: a
	// purchase signed a while ago stays valid after its certificate expires.
	if _, err := leaf.Verify(x509.VerifyOptions{
		Roots:         a.roots,
		Intermediates: intermediates,
		CurrentTime:   time.UnixMilli(signed.SignedDate),
		KeyUsages:     []x509.ExtKeyUsage{x509.ExtKeyUsageAny},
	}); err != nil {
		return fmt.Errorf("%w: chain: %v", ErrInvalid, err)
	}

	key, isECDSA := leaf.PublicKey.(*ecdsa.PublicKey)
	sig, err := base64.RawURLEncoding.DecodeString(parts[2])
	if !isECDSA || err != nil || len(sig) != 64 {
		return fmt.Errorf("%w: signature", ErrInvalid)
	}
	digest := sha256.Sum256([]byte(parts[0] + "." + parts[1]))
	r, s := new(big.Int).SetBytes(sig[:32]), new(big.Int).SetBytes(sig[32:])
	if !ecdsa.Verify(key, digest[:], r, s) {
		return fmt.Errorf("%w: signature", ErrInvalid)
	}
	return decodeSegment(parts[1], v)
}

func decodeSegment(segment string, v any) error {
	raw, err := base64.RawURLEncoding.DecodeString(segment)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrInvalid, err)
	}
	if err := json.NewDecoder(bytes.NewReader(raw)).Decode(v); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalid, err)
	}
	return nil
}

func hasExtension(c *x509.Certificate, oid asn1.ObjectIdentifier) bool {
	for _, e := range c.Extensions {
		if e.Id.Equal(oid) {
			return true
		}
	}
	return false
}

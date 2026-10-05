// Package auth issues and validates the JWTs the app uses: a refresh token
// per device (no expiry) and short-lived access tokens. The format matches
// what the Java backend (jjwt) produced, so tokens stay valid across the switch.
package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	TypeAccess  = "access"
	TypeRefresh = "refresh"
)

// errMissingType is returned for a validly signed token without a "type"
// claim. The Java backend failed with a server error in that case.
var errMissingType = errors.New("token has no type claim")

type Tokens struct {
	key       []byte
	accessTTL time.Duration
	now       func() time.Time
}

func NewTokens(secret string, accessTTL time.Duration) *Tokens {
	return &Tokens{key: []byte(secret), accessTTL: accessTTL, now: time.Now}
}

func (t *Tokens) Refresh(userID string) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  userID,
		"type": TypeRefresh,
	}).SignedString(t.key)
}

func (t *Tokens) Access(userID string) (string, error) {
	now := t.now()
	return jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  userID,
		"type": TypeAccess,
		"iat":  now.Unix(),
		"exp":  now.Add(t.accessTTL).Unix(),
	}).SignedString(t.key)
}

// Subject validates the token and its type and returns the user id. ok is
// false for anything a client could send wrong (bad signature, expired, wrong
// type). err is set only for tokens the Java backend crashed on.
func (t *Tokens) Subject(token, wantType string) (subject string, ok bool, err error) {
	parsed, parseErr := jwt.Parse(token, func(*jwt.Token) (any, error) { return t.key, nil },
		jwt.WithValidMethods([]string{"HS256", "HS384", "HS512"}))
	if parseErr != nil {
		return "", false, nil
	}
	claims, _ := parsed.Claims.(jwt.MapClaims)
	rawType, present := claims["type"]
	if !present || rawType == nil {
		return "", false, errMissingType
	}
	typ, isString := rawType.(string)
	if !isString || typ != wantType {
		return "", false, nil
	}
	sub, _ := claims["sub"].(string)
	if sub == "" {
		return "", false, errors.New("token has no subject")
	}
	return sub, true, nil
}

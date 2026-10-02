package apitests

import (
	"math"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	. "github.com/laurin-notemann/beerpong/api-tests/harness"
)

func TestSignupAndRefresh(t *testing.T) {
	h := New(t)
	for _, installation := range []string{"IOS", "ANDROID"} {
		signup := h.OK(h.Do(Req{Method: "POST", Path: "/auth/signup", Body: map[string]any{"installationType": installation, "deviceId": "device-" + installation}}))
		h.Equal(signup.Str("type"), "REFRESH", "signup token type")
		refreshClaims := JWTClaims(signup.Str("token"))
		h.Equal(refreshClaims["type"], "refresh", "refresh token type claim")
		h.True(refreshClaims["exp"] == nil, "refresh tokens do not expire, got exp=%v", refreshClaims["exp"])
		h.True(refreshClaims["sub"] != "", "refresh token has a subject")

		access := h.OK(h.Do(Req{Method: "POST", Path: "/auth/refresh", Body: map[string]any{"refreshToken": signup.Str("token")}}))
		h.Equal(access.Str("type"), "ACCESS", "refresh token type")
		claims := JWTClaims(access.Str("token"))
		h.Equal(claims["type"], "access", "access token type claim")
		h.Equal(claims["sub"], refreshClaims["sub"], "access token subject")
		lifetime := claims["exp"].(float64) - claims["iat"].(float64)
		h.True(math.Abs(lifetime-3600) <= 1, "access token lifetime %vs, want 3600s", lifetime)
	}
}

func TestSignupValidation(t *testing.T) {
	h := New(t)
	for _, body := range []map[string]any{
		{"installationType": "IOS"},
		{"installationType": "IOS", "deviceId": ""},
		{"installationType": "IOS", "deviceId": "   "},
		{"deviceId": "device"},
		{"installationType": nil, "deviceId": "device"},
		{},
	} {
		h.Fail(h.Do(Req{Method: "POST", Path: "/auth/signup", Body: body}), 400, "authRegisterInvalidDto")
	}
	h.SpringError(h.Do(Req{Method: "POST", Path: "/auth/signup", Body: map[string]any{"installationType": "WINDOWS", "deviceId": "x"}}), 400, "Bad Request", "/auth/signup")
	h.SpringError(h.Do(Req{Method: "POST", Path: "/auth/signup", Body: map[string]any{"installationType": "ios", "deviceId": "x"}}), 400, "Bad Request", "/auth/signup")
}

func TestRefreshValidation(t *testing.T) {
	h := New(t)
	user := h.NewUser()
	h.Fail(h.Do(Req{Method: "POST", Path: "/auth/refresh", Body: map[string]any{}}), 400, "authRefreshInvalidDto")
	h.Fail(h.Do(Req{Method: "POST", Path: "/auth/refresh", Body: map[string]any{"refreshToken": "  "}}), 400, "authRefreshInvalidDto")
	h.Fail(h.Do(Req{Method: "POST", Path: "/auth/refresh", Body: map[string]any{"refreshToken": "garbage"}}), 400, "authRefreshInvalidToken")
	h.Fail(h.Do(Req{Method: "POST", Path: "/auth/refresh", Body: map[string]any{"refreshToken": user.Access}}), 400, "authRefreshInvalidToken")
	tampered := user.Refresh[:len(user.Refresh)-2] + "xx"
	h.Fail(h.Do(Req{Method: "POST", Path: "/auth/refresh", Body: map[string]any{"refreshToken": tampered}}), 400, "authRefreshInvalidToken")
}

func TestRefreshWithForgedTokens(t *testing.T) {
	h := New(t)
	user := h.NewUser()
	unknown := h.Forge(jwt.MapClaims{"sub": "00000000-0000-0000-0000-000000000000", "type": "refresh"})
	h.Fail(h.Do(Req{Method: "POST", Path: "/auth/refresh", Body: map[string]any{"refreshToken": unknown}}), 400, "authRefreshInvalidToken")

	expired := h.Forge(jwt.MapClaims{"sub": user.ID, "type": "refresh", "exp": time.Now().Add(-time.Minute).Unix()})
	h.Fail(h.Do(Req{Method: "POST", Path: "/auth/refresh", Body: map[string]any{"refreshToken": expired}}), 400, "authRefreshInvalidToken")

	// A token without a type claim is a server error in the Java backend.
	untyped := h.Forge(jwt.MapClaims{"sub": user.ID})
	h.SpringError(h.Do(Req{Method: "POST", Path: "/auth/refresh", Body: map[string]any{"refreshToken": untyped}}), 500, "Internal Server Error", "/auth/refresh")
}

func TestAuthFilter(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "auth filter", "a", "b")
	outsider := h.NewUser()

	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path("")}), "Missing or invalid Authorization header!")
	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: "Basic abc"}), "Missing or invalid Authorization header!")
	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: "bearer " + owner.Access}), "Missing or invalid Authorization header!")
	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: "Bearer garbage"}), "Invalid access token or invalid user-id!")
	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: "Bearer " + owner.Refresh}), "Invalid access token or invalid user-id!")
	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: outsider.Bearer()}), "No access to this group!")
	h.Unauthorized(h.Do(Req{Method: "GET", Path: "/groups/does-not-exist", Auth: owner.Bearer()}), "No access to this group!")
	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path("/seasons"), Auth: outsider.Bearer()}), "No access to this group!")
	h.Unauthorized(h.Do(Req{Method: "GET", Path: "/groups/user/", Auth: owner.Bearer()}), "No access to this group!")

	// Group-scoped 404s only happen after the membership check passed.
	h.SpringError(h.Do(Req{Method: "GET", Path: g.Path("/nope"), Auth: owner.Bearer()}), 404, "Not Found", g.Path("/nope"))
	h.SpringError(h.Do(Req{Method: "GET", Path: g.Path("/"), Auth: owner.Bearer()}), 404, "Not Found", g.Path("/"))
	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path("/nope"), Auth: outsider.Bearer()}), "No access to this group!")

	// Endpoints that only need a valid user.
	h.OK(h.Do(Req{Method: "GET", Path: "/groups/user", Auth: outsider.Bearer()}))
	h.OK(h.Do(Req{Method: "GET", Path: "/groups?inviteCode=" + g.InviteCode, Auth: outsider.Bearer()}))
	h.Unauthorized(h.Do(Req{Method: "GET", Path: "/groups/user"}), "Missing or invalid Authorization header!")
	h.Unauthorized(h.Do(Req{Method: "GET", Path: "/groups?inviteCode=" + g.InviteCode}), "Missing or invalid Authorization header!")
	h.Unauthorized(h.Do(Req{Method: "POST", Path: "/groups", Body: map[string]any{}}), "Missing or invalid Authorization header!")
	h.Unauthorized(h.Do(Req{Method: "POST", Path: g.Path("/join")}), "Missing or invalid Authorization header!")

	// Paths outside /groups are public.
	h.OK(h.Do(Req{Method: "GET", Path: "/group-presets", Auth: "Bearer garbage", Ordered: true}))
}

func TestAuthFilterWithForgedTokens(t *testing.T) {
	h := New(t)
	owner := h.NewUser()
	g := h.NewGroup(owner, "forged", "a")

	expired := h.Forge(AccessClaims(owner.ID, -time.Minute))
	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: "Bearer " + expired}), "Invalid access token or invalid user-id!")

	unknown := h.Forge(AccessClaims("00000000-0000-0000-0000-000000000000", time.Hour))
	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: "Bearer " + unknown}), "Invalid access token or invalid user-id!")

	noExpiry := h.Forge(jwt.MapClaims{"sub": owner.ID, "type": "access"})
	h.OK(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: "Bearer " + noExpiry}))

	refreshTyped := h.Forge(jwt.MapClaims{"sub": owner.ID, "type": "refresh", "exp": time.Now().Add(time.Hour).Unix()})
	h.Unauthorized(h.Do(Req{Method: "GET", Path: g.Path(""), Auth: "Bearer " + refreshTyped}), "Invalid access token or invalid user-id!")
}

// Command shadowdiff walks every read endpoint of the groups a user belongs
// to on two backends that share one database and reports responses that
// differ. It only sends GET requests, so it is safe against production data.
//
//	shadowdiff -a http://reference:8080 -b http://candidate:8080 -token <access token>
//	JWT_SECRET=... shadowdiff -a ... -b ... -user <user id>
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	baseA   = flag.String("a", "", "reference backend")
	baseB   = flag.String("b", "", "candidate backend")
	token   = flag.String("token", "", "access token")
	secret  = flag.String("secret", "", "JWT secret to mint an access token for -user")
	user    = flag.String("user", "", "user id for -secret")
	verbose = flag.Bool("v", false, "print every compared path")
)

type stats struct {
	compared, differing int
	timeA, timeB        time.Duration
}

var st stats

func main() {
	flag.Parse()
	if *secret == "" {
		*secret = os.Getenv("JWT_SECRET")
	}
	if *token == "" && *secret != "" {
		now := time.Now()
		t, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": *user, "type": "access", "iat": now.Unix(), "exp": now.Add(time.Hour).Unix()}).SignedString([]byte(*secret))
		if err != nil {
			fail(err)
		}
		*token = t
	}
	if *baseA == "" || *baseB == "" || *token == "" {
		flag.Usage()
		os.Exit(2)
	}

	compare("/healthcheck")
	compare("/group-presets")
	groups := compare("/groups/user")
	for _, g := range list(groups) {
		crawlGroup(g)
	}
	fmt.Printf("\ncompared %d responses, %d differ\nreference total %v, candidate total %v\n", st.compared, st.differing, st.timeA.Round(time.Millisecond), st.timeB.Round(time.Millisecond))
	if st.differing > 0 {
		os.Exit(1)
	}
}

func crawlGroup(g any) {
	id := str(g, "id")
	gp := "/groups/" + id
	compare(gp)
	if code := str(g, "inviteCode"); code != "" {
		compare("/groups?inviteCode=" + code)
	}
	if asset := str(g, "assetIdWallpaper"); asset != "" {
		compare("/assets/" + asset)
	}
	for _, p := range list(compare(gp + "/profiles")) {
		compare(gp + "/profiles/" + str(p, "id"))
		if asset := str(p, "assetIdAvatar"); asset != "" {
			compare("/assets/" + asset)
		}
	}
	compare(gp + "/leaderboard?scope=all-time")
	compare(gp + "/leaderboard?scope=today")
	for _, s := range list(compare(gp + "/seasons")) {
		sp := gp + "/seasons/" + str(s, "id")
		compare(sp)
		compare(gp + "/leaderboard?scope=season&seasonId=" + str(s, "id"))
		compare(sp + "/players")
		compare(sp + "/players?showInactive=true")
		compare(sp + "/players/extended")
		compare(sp + "/players/extended?showInactive=true")
		compare(sp + "/rules")
		compare(sp + "/rule-moves")
		compare(sp + "/matches/overview")
		for _, m := range list(compare(sp + "/matches/extended")) {
			mp := sp + "/matches/" + str(m, "id")
			compare(mp)
			compare(mp + "/extended")
			compare(mp + "/overview")
			for _, t := range listAt(m, "teams") {
				if asset := str(t, "photoAssetId"); asset != "" {
					compare("/assets/" + asset)
				}
			}
		}
		compare(sp + "/matches")
	}
}

// compare fetches path from both backends and returns the reference body.
func compare(path string) any {
	statusA, bodyA, durA := get(*baseA, path)
	statusB, bodyB, durB := get(*baseB, path)
	st.compared++
	st.timeA += durA
	st.timeB += durB
	var a, b any
	_ = json.Unmarshal(bodyA, &a)
	_ = json.Unmarshal(bodyB, &b)
	if statusA != statusB || !equal(a, b) {
		st.differing++
		fmt.Printf("DIFF %s\n  reference %d: %s\n  candidate %d: %s\n", path, statusA, clip(bodyA), statusB, clip(bodyB))
		if where := firstDifference("", a, b); where != "" {
			fmt.Printf("  first difference at %s\n", where)
		}
	} else if *verbose {
		fmt.Printf("ok   %s (%v / %v)\n", path, durA.Round(time.Millisecond), durB.Round(time.Millisecond))
	}
	return a
}

func get(base, path string) (int, []byte, time.Duration) {
	req, _ := http.NewRequest("GET", strings.TrimRight(base, "/")+path, nil)
	req.Header.Set("Authorization", "Bearer "+*token)
	start := time.Now()
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		fail(err)
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	return res.StatusCode, body, time.Since(start)
}

// equal compares JSON values exactly, except for floating point noise and
// Spring's error timestamps.
func equal(a, b any) bool { return firstDifference("", a, b) == "" }

func firstDifference(at string, a, b any) string {
	switch x := a.(type) {
	case map[string]any:
		y, ok := b.(map[string]any)
		if !ok || len(x) != len(y) {
			return at + " (object shape)"
		}
		keys := make([]string, 0, len(x))
		for k := range x {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		for _, k := range keys {
			if k == "timestamp" && at == "" {
				continue
			}
			if d := firstDifference(at+"."+k, x[k], y[k]); d != "" {
				return d
			}
		}
		return ""
	case []any:
		y, ok := b.([]any)
		if !ok || len(x) != len(y) {
			return at + " (array length)"
		}
		for i := range x {
			if d := firstDifference(fmt.Sprintf("%s[%d]", at, i), x[i], y[i]); d != "" {
				return d
			}
		}
		return ""
	case float64:
		y, ok := b.(float64)
		if !ok || math.Abs(x-y) > 1e-9*math.Max(1, math.Abs(x)) {
			return at
		}
		return ""
	default:
		if fmt.Sprint(a) != fmt.Sprint(b) {
			return at
		}
		return ""
	}
}

func list(v any) []any { return listAt(v, "data") }

func listAt(v any, key string) []any {
	m, _ := v.(map[string]any)
	l, _ := m[key].([]any)
	return l
}

func str(v any, key string) string {
	m, _ := v.(map[string]any)
	s, _ := m[key].(string)
	return s
}

func clip(b []byte) string {
	b = bytes.TrimSpace(b)
	if len(b) > 300 {
		return string(b[:300]) + "…"
	}
	return string(b)
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, err)
	os.Exit(2)
}

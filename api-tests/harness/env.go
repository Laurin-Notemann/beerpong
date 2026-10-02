// Package harness drives a Versus backend (Java or Go) over HTTP and the
// realtime websocket, and records a normalized transcript of every exchange so
// two implementations can be compared response by response.
package harness

import (
	"net/url"
	"os"
	"strings"
)

// Env configures which backend the suite talks to.
//
//	API_BASE_URL      required, e.g. http://localhost:8080
//	API_WS_URL        optional, defaults to API_BASE_URL with ws(s)://
//	API_JWT_SECRET    optional, enables tests that forge tokens
//	API_DATABASE_URL  optional, enables tests that need to shape data the API can't (legacy rows, old matches)
//	API_S3_UPLOAD     optional, "1" uploads a real object through a presigned URL
//	GOLDEN            "compare" (default), "record" or "off"
type Env struct {
	BaseURL     string
	WSURL       string
	JWTSecret   string
	DatabaseURL string
	S3Upload    bool
	Golden      string
}

func LoadEnv() Env {
	base := strings.TrimRight(os.Getenv("API_BASE_URL"), "/")
	ws := strings.TrimRight(os.Getenv("API_WS_URL"), "/")
	if ws == "" && base != "" {
		u, err := url.Parse(base)
		if err == nil {
			if u.Scheme == "https" {
				u.Scheme = "wss"
			} else {
				u.Scheme = "ws"
			}
			ws = u.String()
		}
	}
	golden := os.Getenv("GOLDEN")
	if golden == "" {
		golden = "compare"
	}
	return Env{
		BaseURL:     base,
		WSURL:       ws,
		JWTSecret:   os.Getenv("API_JWT_SECRET"),
		DatabaseURL: os.Getenv("API_DATABASE_URL"),
		S3Upload:    os.Getenv("API_S3_UPLOAD") == "1",
		Golden:      golden,
	}
}

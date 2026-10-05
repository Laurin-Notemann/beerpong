package observability

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/getsentry/sentry-go"
)

func TestSyntheticRequestsAreNotTraced(t *testing.T) {
	client, err := sentry.NewClient(sentry.ClientOptions{EnableTracing: true, TracesSampler: sampleTrace})
	if err != nil {
		t.Fatal(err)
	}
	hub := sentry.NewHub(client, sentry.NewScope())

	for userAgent, want := range map[string]sentry.Sampled{
		"Go-http-client/1.1":                    sentry.SampledFalse,
		"Versus/104 CFNetwork/3860 Darwin/25.0": sentry.SampledTrue,
		"okhttp/4.12.0":                         sentry.SampledTrue,
		"":                                      sentry.SampledTrue,
	} {
		var got sentry.Sampled
		handler := MarkSynthetic(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
			tx := sentry.StartTransaction(sentry.SetHubOnContext(r.Context(), hub), "GET /healthcheck")
			got = tx.Sampled
			tx.Finish()
		}))
		req := httptest.NewRequest(http.MethodGet, "/healthcheck", nil)
		req.Header.Set("User-Agent", userAgent)
		handler.ServeHTTP(httptest.NewRecorder(), req)

		if got != want {
			t.Errorf("user agent %q: sampled %v, want %v", userAgent, got, want)
		}
	}
}

package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/getsentry/sentry-go"
)

func TestInternalErrorReportsOnlyRealFailures(t *testing.T) {
	log := slog.New(slog.NewTextHandler(io.Discard, nil))

	for name, tc := range map[string]struct {
		err        error
		clientGone bool
		reported   bool
	}{
		"client disconnected":             {fmt.Errorf("query: %w", context.Canceled), true, false},
		"cancelled while client is there": {fmt.Errorf("query: %w", context.Canceled), false, true},
		"database failure":                {errors.New("connection refused"), false, true},
		"database failure, client gone":   {errors.New("connection refused"), true, true},
	} {
		t.Run(name, func(t *testing.T) {
			var reported int
			client, err := sentry.NewClient(sentry.ClientOptions{
				BeforeSend: func(e *sentry.Event, _ *sentry.EventHint) *sentry.Event {
					reported++
					return nil
				},
			})
			if err != nil {
				t.Fatal(err)
			}
			ctx, cancel := context.WithCancel(sentry.SetHubOnContext(context.Background(), sentry.NewHub(client, sentry.NewScope())))
			defer cancel()
			if tc.clientGone {
				cancel()
			}
			req := httptest.NewRequest(http.MethodGet, "/assets/x", nil).WithContext(ctx)
			rec := httptest.NewRecorder()

			internal(tc.err).write(rec, req, log)

			if (reported > 0) != tc.reported {
				t.Errorf("reported %d events, want reported=%v", reported, tc.reported)
			}
			if rec.Code != http.StatusInternalServerError {
				t.Errorf("status %d, want 500", rec.Code)
			}
		})
	}
}

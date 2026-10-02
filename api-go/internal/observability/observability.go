// Package observability wires Sentry: errors, request traces (continued from
// the app's sentry-trace/baggage headers), a span per SQL query, and logs.
package observability

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
	sentryslog "github.com/getsentry/sentry-go/slog"
)

type Options struct {
	DSN         string
	Environment string
	Release     string
}

// Init configures Sentry (a no-op without DSN) and returns the process logger,
// which writes to stdout and, at info and above, to Sentry Logs.
func Init(opts Options) (*slog.Logger, func(), error) {
	stdout := slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})
	if opts.DSN == "" {
		logger := slog.New(stdout)
		return logger, func() {}, nil
	}
	err := sentry.Init(sentry.ClientOptions{
		Dsn:              opts.DSN,
		Environment:      opts.Environment,
		Release:          opts.Release,
		EnableTracing:    true,
		TracesSampleRate: 1.0, // sample every request while traffic is low
		SendDefaultPII:   true,
		Tags:             map[string]string{"runtime": "go"},
	})
	if err != nil {
		return nil, nil, err
	}
	sentryHandler := sentryslog.Option{
		LogLevel: []slog.Level{slog.LevelInfo, slog.LevelWarn, slog.LevelError, sentryslog.LevelFatal},
	}.NewSentryHandler(context.Background())
	logger := slog.New(fanout{stdout, sentryHandler})
	return logger, func() { sentry.Flush(5 * time.Second) }, nil
}

// CaptureError reports err as a Sentry issue on the request's hub.
func CaptureError(ctx context.Context, err error) {
	if err == nil {
		return
	}
	hub := sentry.GetHubFromContext(ctx)
	if hub == nil {
		hub = sentry.CurrentHub()
	}
	hub.CaptureException(err)
}

// fanout sends every record to all handlers.
type fanout []slog.Handler

func (f fanout) Enabled(ctx context.Context, level slog.Level) bool {
	for _, h := range f {
		if h.Enabled(ctx, level) {
			return true
		}
	}
	return false
}

func (f fanout) Handle(ctx context.Context, r slog.Record) error {
	var errs []error
	for _, h := range f {
		if h.Enabled(ctx, r.Level) {
			errs = append(errs, h.Handle(ctx, r.Clone()))
		}
	}
	return errors.Join(errs...)
}

func (f fanout) WithAttrs(attrs []slog.Attr) slog.Handler {
	out := make(fanout, len(f))
	for i, h := range f {
		out[i] = h.WithAttrs(attrs)
	}
	return out
}

func (f fanout) WithGroup(name string) slog.Handler {
	out := make(fanout, len(f))
	for i, h := range f {
		out[i] = h.WithGroup(name)
	}
	return out
}

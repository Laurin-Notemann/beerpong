package api

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/laurin-notemann/beerpong/api-go/internal/observability"
)

// response is what a handler returns; writing it is the router's job.
type response interface {
	write(w http.ResponseWriter, r *http.Request, log *slog.Logger)
}

// envelope is the ResponseEnvelope every endpoint answers with.
type envelope struct {
	Status   string     `json:"status"`
	HTTPCode int        `json:"httpCode"`
	Data     any        `json:"data,omitempty"`
	Error    *errDetail `json:"error,omitempty"`
}

type errDetail struct {
	Code        string `json:"code"`
	Description string `json:"description"`
}

type okResponse struct{ data any }

// ok wraps data in a 200 envelope.
func ok(data any) response { return okResponse{data} }

func (o okResponse) write(w http.ResponseWriter, _ *http.Request, _ *slog.Logger) {
	writeJSON(w, http.StatusOK, envelope{Status: "OK", HTTPCode: http.StatusOK, Data: o.data})
}

// fail answers with an error envelope.
func fail(code errorCode) response { return code }

func (e errorCode) write(w http.ResponseWriter, _ *http.Request, _ *slog.Logger) {
	writeJSON(w, e.status, envelope{Status: "ERROR", HTTPCode: e.status, Error: &errDetail{Code: e.code, Description: e.description}})
}

// springError is Spring Boot's default error body, which the Java backend
// returned for routing and parsing failures and for exceptions.
type springError int

func (s springError) write(w http.ResponseWriter, r *http.Request, _ *slog.Logger) {
	writeSpringError(w, r, int(s))
}

func writeSpringError(w http.ResponseWriter, r *http.Request, status int) {
	writeJSON(w, status, map[string]any{
		"timestamp": time.Now().UTC().Format("2006-01-02T15:04:05.000-07:00"),
		"status":    status,
		"error":     springReasons[status],
		"path":      r.URL.EscapedPath(),
	})
}

// internalError is an unexpected failure: reported to Sentry and answered
// like an unhandled exception in Spring.
type internalError struct{ err error }

func internal(err error) response { return internalError{err} }

func internalf(format string, args ...any) response {
	return internalError{fmt.Errorf(format, args...)}
}

func (e internalError) write(w http.ResponseWriter, r *http.Request, log *slog.Logger) {
	// The client went away (closed the screen, lost signal) and the query was
	// cancelled with its request. Nothing failed on our side.
	if errors.Is(e.err, context.Canceled) && r.Context().Err() != nil {
		log.InfoContext(r.Context(), "client disconnected", "method", r.Method, "path", r.URL.Path)
		writeSpringError(w, r, http.StatusInternalServerError)
		return
	}
	log.ErrorContext(r.Context(), "request failed", "method", r.Method, "path", r.URL.Path, "err", e.err)
	observability.CaptureError(r.Context(), e.err)
	writeSpringError(w, r, http.StatusInternalServerError)
}

// plainUnauthorized is the text body the auth filter answers with.
type plainUnauthorized string

func (p plainUnauthorized) write(w http.ResponseWriter, _ *http.Request, _ *slog.Logger) {
	// Spring wrote these without a content type; keep it that way.
	w.Header()["Content-Type"] = nil
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(p))
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(v); err != nil {
		http.Error(w, "encoding failed", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(bytes.TrimRight(buf.Bytes(), "\n"))
}

// Command api serves the Versus REST API and the realtime socket.
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/laurin-notemann/beerpong/api-go/internal/api"
	"github.com/laurin-notemann/beerpong/api-go/internal/auth"
	"github.com/laurin-notemann/beerpong/api-go/internal/config"
	"github.com/laurin-notemann/beerpong/api-go/internal/database"
	"github.com/laurin-notemann/beerpong/api-go/internal/observability"
	"github.com/laurin-notemann/beerpong/api-go/internal/push"
	"github.com/laurin-notemann/beerpong/api-go/internal/realtime"
	"github.com/laurin-notemann/beerpong/api-go/internal/storage"
)

func main() {
	if err := run(); err != nil {
		slog.Error("api stopped", "err", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	log, flush, err := observability.Init(observability.Options{
		DSN:         cfg.SentryDSN,
		Environment: cfg.SentryEnvironment,
		Release:     cfg.SentryRelease,
	})
	if err != nil {
		return err
	}
	defer flush()
	slog.SetDefault(log)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Connect(ctx, cfg.Postgres, observability.QueryTracer{})
	if err != nil {
		return err
	}
	defer pool.Close()
	if cfg.Migrate {
		if err := database.Migrate(ctx, pool); err != nil {
			return err
		}
	}

	hub := realtime.NewHub(log)
	server := api.NewServer(pool, auth.NewTokens(cfg.JWTSecret, cfg.AccessTokenTTL), storage.New(cfg.AWS), hub, log)
	apns, err := push.New(cfg.APNs)
	if err != nil {
		return err
	}
	if apns == nil {
		log.Warn("no APNs key: live scores aren't pushed to Live Activities and widgets")
	}
	server.SetAPNs(apns)
	httpServer := &http.Server{
		Addr:              ":" + strconv.Itoa(cfg.Port),
		Handler:           server.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		MaxHeaderBytes:    64 << 10,
	}

	// Runs until the API stops. The pool closes only after the last round is done.
	expiryCtx, stopExpiry := context.WithCancel(ctx)
	expiryDone := make(chan struct{})
	go func() {
		defer close(expiryDone)
		server.RunLiveMatchExpiry(expiryCtx)
	}()
	defer func() {
		stopExpiry()
		<-expiryDone
	}()

	pushCtx, stopPushes := context.WithCancel(ctx)
	defer stopPushes()
	go server.RunLiveScorePushes(pushCtx)

	errs := make(chan error, 1)
	go func() { errs <- httpServer.ListenAndServe() }()
	log.Info("api started", "port", cfg.Port, "environment", cfg.SentryEnvironment, "release", cfg.SentryRelease)

	select {
	case err := <-errs:
		return err
	case <-ctx.Done():
	}
	log.Info("api shutting down")
	shutdown, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdown); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

package observability

import (
	"context"
	"strings"

	"github.com/getsentry/sentry-go"
	"github.com/jackc/pgx/v5"
)

// QueryTracer makes every SQL statement a child span of the request's
// transaction, so slow queries show up in the trace that started in the app.
type QueryTracer struct{}

type spanKey struct{}

func (QueryTracer) TraceQueryStart(ctx context.Context, _ *pgx.Conn, data pgx.TraceQueryStartData) context.Context {
	return startSpan(ctx, data.SQL)
}

func (QueryTracer) TraceQueryEnd(ctx context.Context, _ *pgx.Conn, data pgx.TraceQueryEndData) {
	finishSpan(ctx, data.Err)
}

func (QueryTracer) TraceCopyFromStart(ctx context.Context, _ *pgx.Conn, data pgx.TraceCopyFromStartData) context.Context {
	return startSpan(ctx, "COPY "+data.TableName.Sanitize()+" FROM STDIN")
}

func (QueryTracer) TraceCopyFromEnd(ctx context.Context, _ *pgx.Conn, data pgx.TraceCopyFromEndData) {
	finishSpan(ctx, data.Err)
}

func startSpan(ctx context.Context, sql string) context.Context {
	// Only trace inside a request; startup queries have no parent transaction.
	if sentry.TransactionFromContext(ctx) == nil {
		return ctx
	}
	name, statement := splitQuery(sql)
	// Sentry's query insights group spans by their SQL description.
	span := sentry.StartSpan(ctx, "db.sql.query", sentry.WithDescription(statement))
	span.SetData("db.system", "postgresql")
	if name != "" {
		span.SetData("db.query.name", name)
	}
	return context.WithValue(span.Context(), spanKey{}, span)
}

func finishSpan(ctx context.Context, err error) {
	span, ok := ctx.Value(spanKey{}).(*sentry.Span)
	if !ok {
		return
	}
	if err != nil && err != pgx.ErrNoRows {
		span.Status = sentry.SpanStatusInternalError
	} else {
		span.Status = sentry.SpanStatusOK
	}
	span.Finish()
}

// splitQuery separates sqlc's "-- name: X :kind" header from the statement
// and collapses whitespace.
func splitQuery(sql string) (name, statement string) {
	if rest, ok := strings.CutPrefix(sql, "-- name: "); ok {
		header, body, _ := strings.Cut(rest, "\n")
		name, _, _ = strings.Cut(header, " ")
		sql = body
	}
	var lines []string
	for _, line := range strings.Split(sql, "\n") {
		if t := strings.TrimSpace(line); t != "" && !strings.HasPrefix(t, "--") {
			lines = append(lines, t)
		}
	}
	return name, strings.Join(lines, " ")
}

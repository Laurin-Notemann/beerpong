FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /api ./cmd/api

# distroless/static has CA certificates (for S3 and Sentry) and runs as nonroot.
FROM gcr.io/distroless/static-debian12:nonroot
# ties Sentry events to the commit; the deploy passes api-go@<sha>
ARG SENTRY_RELEASE
ENV SENTRY_RELEASE=${SENTRY_RELEASE}
COPY --from=build /api /api
EXPOSE 8080
ENTRYPOINT ["/api"]

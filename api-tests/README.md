# api-tests

Black-box contract tests for the Versus API. They only talk HTTP and the
websocket, so they run against any build of it.

```sh
cd api-tests
API_BASE_URL=http://localhost:8080 go test ./...
```

| Variable           | Purpose                                                            |
| ------------------ | ------------------------------------------------------------------ |
| `API_BASE_URL`     | backend under test (required)                                      |
| `API_JWT_SECRET`   | enables tests that forge tokens (expired, unknown user, no type)   |
| `API_DATABASE_URL` | enables tests that need rows the API can't create (legacy, old)    |
| `API_S3_UPLOAD=1`  | uploads one tiny object through a presigned URL and deletes it     |
| `GOLDEN`           | `compare` (default), `record`, or `off`                            |

## Golden transcripts

Every request and realtime event of a test is normalized (ids numbered by
first appearance, timestamps, tokens and signatures masked) and compared with
`testdata/golden/<Test>.json`. Numbers that follow the Elo weights (`eloKeys`
in `harness/harness.go`) aren't compared, so tuning the Elo needs no re-record. The goldens were recorded against the Java
backend, so a passing Go run means "same responses as Java", field by field.
The Go API deliberately differs in two places, recorded against Go: rules
keep their written order (`TestRuleOrderIsTheWrittenOrder`), and upload URLs
don't sign the content type, so JPEGs upload too (`signedHeaders=host`,
`TestUploadThroughPresignedURL`). The live match goldens (`TestLiveMatch*`)
were recorded against Go: the feature never shipped on Java, so they guard the
wire shape but prove no Java equivalence. Re-record only on purpose:

```sh
GOLDEN=record API_BASE_URL=... go test ./...
```

## shadowdiff

`cmd/shadowdiff` crawls every read endpoint of a user's groups on two backends
sharing one database and reports any difference. GET only, so it is safe to
point at production data:

```sh
go run ./cmd/shadowdiff -a http://reference:8080 -b http://candidate:8080 -secret "$JWT_SECRET" -user <user id>
```

---
name: api-local
description: Run apps/api's unit tests, the API and the api-tests contract suite locally, and record goldens. Use for any change in apps/api/ or api-tests/ before pushing. This machine has no Go and port 5432 is taken.
---

# api-local

Run everything from the repo root. Go runs in Docker as your uid (as root it leaves
root-owned goldens and gofmt output). The stack lives on its own network `bp-local`
without host ports. Shell variables don't survive between tool calls, so start every
command that uses `$GO` with this line:

```sh
GO="docker run --rm -u $(id -u):$(id -g) -e HOME=/tmp -e GOCACHE=/cache/build -e GOMODCACHE=/cache/mod -e GOFLAGS=-buildvcs=false -v beerpong-gocache:/cache -v $PWD:/src"
```

Once per machine (keep the volume, it is the module and build cache):
`docker volume create beerpong-gocache && docker run --rm -v beerpong-gocache:/cache golang:1.26 chown -R $(id -u):$(id -g) /cache`

## Unit tests

```sh
$GO -w /src/apps/api golang:1.26 sh -c 'gofmt -l .; go vet ./... && go test -race ./...'
```

`gofmt -l` lists unformatted files; fix them with `$GO -w /src/apps/api golang:1.26 gofmt -w .`.

## Stack

```sh
docker network create bp-local
docker run -d --rm --name bp-local-db --network bp-local -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=user -e POSTGRES_DB=beerpong postgres:15
until docker exec bp-local-db pg_isready -h 127.0.0.1 -U admin -d beerpong; do sleep 1; done
$GO -d --name bp-local-api --network bp-local -w /src/apps/api -e POSTGRES_HOST=bp-local-db -e POSTGRES_DB_NAME=beerpong -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=user -e JWT_SECRET=local-contract-suite-secret-0123456789abcdefghijklmnopqrstuvwxyz -e BACKEND_SENTRY_DSN= -e AWS_REGION=eu-central-1 -e AWS_BUCKET_NAME=local -e AWS_ENDPOINT=s3.invalid -e AWS_ACCESS_KEY=local -e AWS_SECRET_KEY=local golang:1.26 go run ./cmd/api
for i in $(seq 90); do docker exec bp-local-api curl -sf localhost:8080/healthcheck && break; sleep 2; done; docker logs --tail 5 bp-local-api
```

After changing apps/api, restart the API: `docker rm -f bp-local-api`, then the `$GO -d` and `for` lines again.

## Contract suite

```sh
$GO --network bp-local -w /src/api-tests -e API_BASE_URL=http://bp-local-api:8080 -e API_JWT_SECRET=local-contract-suite-secret-0123456789abcdefghijklmnopqrstuvwxyz -e API_DATABASE_URL=postgres://admin:user@bp-local-db:5432/beerpong golang:1.26 go test -count=1 ./...
```

These need real S3 and fail only locally: TestAssetMetadata, TestGroupWallpaper,
TestMatchPhotos, TestUpdateMatch, TestDeleteMatch, TestProfileAvatar. Anything else failing is yours.

Goldens: record only the tests you changed, by adding `-e GOLDEN=record` and `-run '^(TestA|TestB)$'`
to the command above. Then `git diff api-tests/testdata/golden` must touch only what you meant
(an Elo change touches only `"elo"` lines). For the six S3 tests, edit their golden JSON by hand
and let CI check them.

## Before pushing

A new route goes into `apps/api/openapi/openapi.json`, edited as text in place (never
re-serialize or prettier it); `TestSpecMatchesRoutes` checks it. Regenerate the app's types
with `scripts/gen-api` (from the repo root, after `npm install`), or let the Generate OpenApi
action push `chore: update openapi types` and pull before pushing again.

## Cleanup

`docker rm -fv bp-local-api bp-local-db; docker network rm bp-local` (without `-v` the database volume stays behind).

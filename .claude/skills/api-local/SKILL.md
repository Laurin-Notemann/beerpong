---
name: api-local
description: Run the API locally in Docker, as port 5432 is taken on this machine, and vet apps/api before pushing. Never runs tests.
---

# api-local

Run everything from the repo root. Go 1.26 is in `~/.local/go/bin`; if `go` isn't found,
start the command with `export PATH=$HOME/.local/go/bin:$PATH;`.

**NEVER run tests**: not `go test`, not the contract suite in `api-tests/`.

## Vet

```sh
cd apps/api && gofmt -l . && go vet ./... && go build ./...
```

`gofmt -l` lists unformatted files; fix them with `gofmt -w .`.

## Stack

Port 5432 is taken, so the database and the API run in Docker on their own network `bp-local`,
without host ports. Go runs there as your uid (as root it leaves root-owned files). Shell variables don't survive between tool calls, so start every command that uses
`$GO` with this line:

```sh
GO="docker run --rm -u $(id -u):$(id -g) -e HOME=/tmp -e GOCACHE=/cache/build -e GOMODCACHE=/cache/mod -e GOFLAGS=-buildvcs=false -v beerpong-gocache:/cache -v $PWD:/src"
```

Once per machine (keep the volume, it is the module and build cache):
`docker volume create beerpong-gocache && docker run --rm -v beerpong-gocache:/cache golang:1.26 chown -R $(id -u):$(id -g) /cache`

```sh
docker network create bp-local
docker run -d --rm --name bp-local-db --network bp-local -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=user -e POSTGRES_DB=beerpong postgres:15
until docker exec bp-local-db pg_isready -h 127.0.0.1 -U admin -d beerpong; do sleep 1; done
$GO -d --name bp-local-api --network bp-local -w /src/apps/api -e POSTGRES_HOST=bp-local-db -e POSTGRES_DB_NAME=beerpong -e POSTGRES_USER=admin -e POSTGRES_PASSWORD=user -e JWT_SECRET=local-contract-suite-secret-0123456789abcdefghijklmnopqrstuvwxyz -e BACKEND_SENTRY_DSN= -e AWS_REGION=eu-central-1 -e AWS_BUCKET_NAME=local -e AWS_ENDPOINT=s3.invalid -e AWS_ACCESS_KEY=local -e AWS_SECRET_KEY=local golang:1.26 go run ./cmd/api
for i in $(seq 90); do docker exec bp-local-api curl -sf localhost:8080/healthcheck && break; sleep 2; done; docker logs --tail 5 bp-local-api
```

After changing apps/api, restart the API: `docker rm -f bp-local-api`, then the `$GO -d` and `for` lines again.

## Before pushing

A new route goes into `apps/api/openapi/openapi.json`, edited as text in place (never
re-serialize or format it). Regenerate the app's types
with `scripts/gen-api` (from the repo root, after `pnpm install`), or let the Generate OpenApi
action push `chore: update openapi types` and pull before pushing again.

## Cleanup

`docker rm -fv bp-local-api bp-local-db; docker network rm bp-local` (without `-v` the database volume stays behind).

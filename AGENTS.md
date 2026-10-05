# Versus

Versus (repo name `beerpong`) is a mobile app for tracking beer pong leagues with friends: groups, seasons, matches, rules, leaderboards and Elo. A Go API with a Postgres database serves an Expo / React Native app for iOS and Android.

## What makes Versus special?

A group of friends uses Versus at the table, mid-game, often on bad Wi-Fi. It's important we keep the things that make that work. Here's a brief list of the things we can never compromise on.

### 1. Fast at the table

Entering a match has to be quicker than arguing about the score. Screens render from the persisted React Query cache first and refetch in the background. Never block a match entry on a network round trip that the user doesn't need to see.

### 2. Realtime, but offline tolerant

Every group member sees new matches, players and seasons live via the `/update-socket` websocket (see `apps/api/README-Socket-Updates.md`). The app must keep working when the socket drops and must catch up on reconnect (`useRefetchEverythingOnWifiReconnect`).

### 3. Ship without the stores

Most fixes reach users as OTA updates, not store releases. Native changes (new native modules, config plugins, permissions) change the runtime fingerprint and force a new store build. Keep that in mind before adding a native dependency.

### 4. Observable

Errors, logs and traces from the app and the server go to Sentry (org `versus-zr`, projects `mobile` and `server`; the web app's, TV and server, to `web`). The app's traces propagate into the API, so one trace spans both. If something can fail silently, make sure it shows up there.

## A note from Laurin

Keep it simple. This is a small team side project, so the best change is usually the smallest one that makes the behavior obvious. Don't add machinery because it looks architecturally impressive. Fight scope creep, but finish what was asked: minimal means no extra machinery, not half a feature. If the feature needs the API to work, or a bug you found is a one-liner in code you're touching, do it and say so. When a change you shipped turns out wrong, fix it toward what the developer describes; a blind revert ships a second regression.

The rest of this document is meant to help you navigate the codebase and make changes effectively. Think of these instructions less as "hard rules", more as "good defaults". The developer's preferences should be able to override anything here.

## A small glossary

We need to be on the same page with terminology. When communicating, use this language:

- **we, us, and maintainers** mean Laurin, Linus, Thies and the people building Versus.
- **user** means a person playing beer pong with the app.
- **group** means a set of players who compete together. Joined with a group code.
- **season** means a time-boxed competition inside a group. Leaderboards are scoped to a season (or all time).
- **match** means one game between two teams, with per-player moves (points, finishes) that follow the group's **rules**.
- **profile / player** means a person inside a group; a user account can have profiles in many groups.
- **channel** means an EAS Update channel. `production` is the iOS TestFlight/App Store build, `preview` is the internal Android APK.
- **runtime** means the native fingerprint of a build. OTA updates only reach builds with the same runtime.

## The three ways to hurt yourself

1. **Touching the live server by hand.** `ssh privaten` hosts the staging API (`~/docker/beerpong-api-go`) and its Postgres (`~/docker/beerpong-api`). The database there is real user data. Never run destructive SQL, `docker compose down -v`, or volume prunes against it. Read logs freely; change things through the deploy workflow. If `ssh privaten` doesn't connect, ask. Never reach the server through CI secrets or a temporary workflow.
2. **Breaking the runtime by accident.** Adding or upgrading a native package, editing `app.json` plugins, `apps/mobile/package.json` scripts, or permissions changes the fingerprint. So does hoisting the app's packages: the root `package-lock.json` keeps them under `apps/mobile/node_modules`, so never `npm dedupe` or regenerate the lockfile from scratch. The staging workflow then builds and submits new native builds instead of publishing an update. Do it on purpose, not as a side effect.
3. **Hand-editing generated API types.** `apps/mobile/api/generated/openapi.json` and `apps/mobile/openapi/openapi.d.ts` are generated from `apps/api/openapi/openapi.json`. Change the Go handler, update that document and regenerate (see `OPENAPI_CODEGEN.md`); never patch the generated files to make the app compile. Edit `openapi.json` as text in place; re-serializing it or running Prettier on it reformats the whole file.

## Hit every surface

The most common defect in this repo is a change that works on the path you tested and is missing everywhere else. Before calling work done, walk this list and say which entries applied:

- **Both ends of the wire.** A DTO change in `apps/api/` needs `apps/api/openapi/openapi.json` updated, regenerated types and every consuming hook in `apps/mobile/api/calls` and `apps/mobile/api/propHooks` updated.
- **Realtime.** If a mutation changes data other group members see, the server must emit the socket event and the app must apply it (`apps/mobile/api/realtime`). Anything the group shares (formations, photos, rules) lives in the API; phone-only stores are for drafts and preferences.
- **Cache.** React Query is persisted to disk. A changed response shape must not crash on an old cached value.
- **Platforms.** iOS and Android. Permissions and native behavior differ.
- **Reverse states.** If you added a way in, add the way out. Create needs delete, join needs leave.
- **Docs.** Check whether the change makes existing guidance inaccurate. Apply the [documentation rules](#documentation) before adding anything.

## Dev servers

- On this machine Go is in `~/.local/go/bin` and port 5432 is taken: run the API with the `api-local` skill instead of the next two lines.
- Database: `cp .env.example .env`, then `make docker-db-up`. The API reads `POSTGRES_HOST/PORT/DB_NAME/USER/PASSWORD`, `JWT_SECRET`, `BACKEND_SENTRY_DSN` and the `AWS_*` S3 settings from the environment.
- API: `set -a; source .env; set +a; cd apps/api && go run ./cmd/api` (Go 1.26; runs the migrations on start), or `make docker-backend-up` to run it in Docker.
- App: `npm install` at the root, then `cd apps/mobile && npm start`. Use a development build (`eas build --profile development`); Expo Go doesn't have the native modules. EAS environment `development` points the app at `http://localhost:8080`.
- npm is the package manager (npm workspaces, one root `package-lock.json`). Don't add a second lockfile.
- Stop what you started. This machine runs other projects' servers too.

## Test data

An empty database is a bad test. For realistic data, dump the staging database read-only (`pg_dump` through `ssh privaten`, container `beerpong-db-staging`) into your local docker database. Data flows one way: into your local copy, never back to the server.

## Verifying

- **NEVER run tests.** Not `go test`, not the contract suite in `api-tests/`, not vitest (`npm run ci:test`, `npm test`), not `turbo run test`.
- Lint, typecheck and format the scope you touched before every push: CI fails on Prettier.
  - API: `cd apps/api && gofmt -l . && go vet ./... && go build ./...`.
  - App: `cd apps/mobile && npm run lint` (eslint + `tsc --noEmit`), `npm run ci:format`.
  - Web (the simulator and the TV): `cd apps/web && npm run format:check && npm run typecheck && npm run build`.
- Don't verify with simulators, devices or browsers unless the developer asks.

## Testing the Elo

The Elo lives in `apps/api/internal/leaderboard/elo.go`; its comment explains the model, and `DefaultElo` holds the weights. Ratings aren't stored per game: every leaderboard recomputes them from the season's matches (all time: every season's, in order), so changing a weight changes every rating at once. Check a change three ways:

- `elo_test.go` holds the behavior tests (don't run them; see [Verifying](#verifying)).
- beerpong-var (`https://var.beerpong.laurinnotemann.dev/<invite code>`) is the Elo simulator: every season of a group with sliders for the weights, each game's breakdown, made-up test games anywhere in a season (never stored), the games running right now counted as if they ended now (reduced with the app's live match code, like the TV), and a prediction score (how often the ratings before a game pick its winner), updated live. The API computes all of it in `GET /elo-simulation` with `leaderboard.Compute` itself (`Input.Elo`, `Input.Trace`), so there's no second copy of the Elo to keep in sync; the page in `apps/web/` only shows it. The weights and test games are in the URL, so a link shows the same thing to someone else. Try values there; then change `DefaultElo`.
- Contract goldens (`api-tests/testdata/golden`) don't compare the numbers that follow the weights (`eloKeys` in `api-tests/harness`), so a weight change needs no re-record. The Elo's behavior is covered by `elo_test.go` and the assertions in the contract tests.

## Shipping

- **API:** push to `staging` → `Api Staging Deploy` vets the API, builds the `api-go` image and redeploys `beerpong-api-go-staging` on the server over SSH. Migrations (`apps/api/internal/database/migrations`, goose) run when it starts. There is no production API deploy; `main` doesn't deploy anything.
- **App:** push to `staging` → `Mobile App Staging` (`.github/workflows/mobile-app-eas.yml`) ships iOS from GitHub's runners, not EAS cloud builds. Android only ships when you start the workflow by hand with `platform: android`. It fingerprints the app. If a build with that fingerprint is registered on EAS, it publishes an OTA update on the build's channel. A new runtime gets a native build on the runner (`eas build --local`), registered on EAS with `eas upload`: iOS goes to TestFlight, Android to an internal preview APK. Start it by hand with `native_build` to force a build. Build numbers are managed remotely by EAS. A build you make on your laptop is only found by later pushes after `eas upload --fingerprint <hash>`.
- **Web (simulator and TV):** push to `staging` → `Web Staging Deploy` builds `apps/web/Dockerfile`, writes the `web` service in `~/docker/versus-web` and its Traefik route (`~/traefik/dynamic/beerpong-var.yml`) on the server and redeploys it at https://var.beerpong.laurinnotemann.dev (the TV at `/tv`). `~/traefik/dynamic/versus-tv-staging.yml` redirects the TV's old address, `/tv` on the API's hostname, there.
- The app checks for updates on foreground and applies a downloaded update when it goes to the background (`apps/mobile/hooks/useOtaUpdates.ts`).

## Pull requests

- Never make a PR unless the developer explicitly asks you to do so.
- Conventional commit titles, plain language: `fix(mobile): leaderboard no longer shows stale season`.
- Body: the problem in a sentence or two, then how you fixed it. End with the model and harness that did the work.
- UI changes need before/after images. Motion or timing needs a short video.
- One concern per PR. If the description says "also", split it.
- The `Generate OpenApi` action may push a `chore: update openapi types` commit after a change to `apps/api/openapi/openapi.json`. Pull before pushing again.

## Documentation

Most code changes do not need a documentation change. Agents can read the code.

- Keep a local explanation in a nearby code comment. Use a markdown doc only when the reasoning crosses the API/app boundary or needs context the code can't carry.
- Don't document every feature, enumerate fields, narrate control flow, or append PR summaries.
- When a documented decision changes, rewrite or remove the affected text. Don't append another account of the new behavior.

## Plans and work artifacts

- Don't commit implementation plans, research notes, or agent scratch files. Keep temporary material outside the repo.
- A merged PR is the implementation record.

## How it works

The app talks to the API over REST through a typed `openapi-client-axios` client generated from the backend's OpenAPI spec. Responses are wrapped in a `ResponseEnvelope`. Handlers in `apps/api/internal/api` run plain SQL through sqlc-generated queries and build the DTOs themselves. After a write, the server publishes a socket event for the group, and connected apps update their React Query cache. Assets (avatars, match photos) are uploaded to S3-compatible storage via presigned URLs. Auth uses JWTs (`apps/api/internal/auth`).

## Where code lives

- `apps/api/` - the API (Go, pgx + sqlc, goose migrations). `internal/api` (handlers), `internal/database` (migrations, SQL queries, generated code), `internal/leaderboard` (stats and Elo), `internal/realtime` (websocket), `openapi/` (the API document). See `apps/api/README.md`.
- `apps/mobile/` - Expo / React Native app with expo-router. `app/` holds only routes: the root layout (providers, group drawer, error boundaries), `app/(main)/` (the stack with every screen) and `app/(main)/(tabs)/` (native tabs, one stack per tab). Non-route modules live in `lib/`, `components/`, `api/` (client, hooks, realtime), `zustand/` (local state), `utils/` (logging, Sentry), `hooks/`.
- `.github/workflows/` - API CI/CD, mobile CI, web CI/CD, OpenAPI generation, and the workflow that builds and updates the app.
- `apps/web/` - one TanStack Start web app: the Elo simulator on the API's `/elo-simulation` (see [Testing the Elo](#testing-the-elo)), and under `/tv` Versus TV, which puts live matches and the leaderboard on a TV, controlled from phones. Both reduce live matches with `apps/mobile/lib/liveMatch` code, so keep what `apps/web/src/tv/lib/liveMatch.ts` and `apps/web/src/simulator/liveMatch.ts` import free of React Native. The TV must run in Chromium 63 (Samsung Tizen 5) behind Traefik; see `apps/web/README.md`.
- `api-tests/` - black-box contract tests (HTTP and websocket, compared with recorded golden transcripts) and `shadowdiff`.
- `docker/` - local compose files for the database and backend.

## Taste

- Complexity belongs at the boundaries (API mapping, client hooks). Screens stay dumb.
- Inferred types over annotations. `any` is the enemy. Imports use the `@/` alias; eslint forbids relative imports.
- Never import `@react-navigation/*` in the app. Expo Router bundles its own React Navigation; use `expo-router/react-navigation`, the `Drawer`/`Stack`/`NativeTabs` layouts and `Stack.Toolbar`. A second copy builds and type-checks fine but crashes at launch ("Couldn't register the navigator").
- `NativeTabs.Trigger` reads only its direct `Icon` children; Android icons use `VectorIcon` (`expo-symbols` isn't installed). With React Compiler on, read store state through selectors, not `actions.getX()`.
- Native UI over JS imitations: header buttons are `Stack.Toolbar` items, menus are native (`Stack.Toolbar.Menu` / `@expo/ui` `MenuView`), confirmations are `Alert.alert`.
- Comments describe how a thing is used, and move when the code moves.
- No `console.*` in app code outside `utils/logging.ts`. Use a `ScopedLogger`; its output also reaches Sentry Logs.
- If a rule here fights the task in front of you, say so loudly and get a human sign-off before breaking it.

## Additional tips

- Security is important, but shouldn't be over-indexed on for dev-only tooling.

# Versus

Versus (repo name `beerpong`) is a mobile app for tracking beer pong leagues with friends: groups, seasons, matches, rules, leaderboards and Elo. A Go API with a Postgres database serves an Expo / React Native app for iOS and Android.

## What makes Versus special?

A group of friends uses Versus at the table, mid-game, often on bad Wi-Fi. It's important we keep the things that make that work. Here's a brief list of the things we can never compromise on.

### 1. Fast at the table

Entering a match has to be quicker than arguing about the score. Screens render from the persisted React Query cache first and refetch in the background. Never block a match entry on a network round trip that the user doesn't need to see.

### 2. Realtime, but offline tolerant

Every group member sees new matches, players and seasons live via the `/update-socket` websocket (see `api/README-Socket-Updates.md`, still accurate for the Go API). The app must keep working when the socket drops and must catch up on reconnect (`useRefetchEverythingOnWifiReconnect`).

### 3. Ship without the stores

Most fixes reach users as OTA updates, not store releases. Native changes (new native modules, config plugins, permissions) change the runtime fingerprint and force a new store build. Keep that in mind before adding a native dependency.

### 4. Observable

Errors, logs and traces from the app and the server go to Sentry (org `versus-zr`, projects `mobile` and `server`). The app's traces propagate into the API, so one trace spans both. If something can fail silently, make sure it shows up there.

## A note from Laurin

Keep it simple. This is a small team side project, so the best change is usually the smallest one that makes the behavior obvious. Don't add machinery because it looks architecturally impressive. Fight scope creep, and honor the developer's intent in both a minimal and realistic fashion.

The rest of this document is meant to help you navigate the codebase and make changes effectively. Think of these instructions less as "hard rules", more as "good defaults". The developer's preferences should be able to override anything here.

## A small glossary

We need to be on the same page with terminology. When communicating, use this language:

- **you** means the agent reading this file and changing Versus.
- **we, us, and maintainers** mean Laurin, Linus, Thies and the people building Versus.
- **user** means a person playing beer pong with the app.
- **group** means a set of players who compete together. Joined with a group code.
- **season** means a time-boxed competition inside a group. Leaderboards are scoped to a season (or all time).
- **match** means one game between two teams, with per-player moves (points, finishes) that follow the group's **rules**.
- **profile / player** means a person inside a group; a user account can have profiles in many groups.
- **channel** means an EAS Update channel. `production` is the iOS TestFlight/App Store build, `preview` is the internal Android APK.
- **runtime** means the native fingerprint of a build. OTA updates only reach builds with the same runtime.

## The three ways to hurt yourself

1. **Touching the live server by hand.** `ssh privaten` hosts the staging API (`~/docker/beerpong-api-go`) and its Postgres (`~/docker/beerpong-api`). The database there is real user data. Never run destructive SQL, `docker compose down -v`, or volume prunes against it. Read logs freely; change things through the deploy workflow.
2. **Breaking the runtime by accident.** Adding or upgrading a native package, editing `app.json` plugins, or changing permissions changes the fingerprint. The staging workflow then builds and submits new native builds instead of publishing an update. Do it on purpose, not as a side effect.
3. **Hand-editing generated API types.** `mobile-app/api/generated/openapi.json` and `mobile-app/openapi/openapi.d.ts` are generated from `api-go/openapi/openapi.json`. Change the Go handler, update that document and regenerate (see `OPENAPI_CODEGEN.md`); never patch the generated files to make the app compile.

## Hit every surface

The most common defect in this repo is a change that works on the path you tested and is missing everywhere else. Before calling work done, walk this list and say which entries applied:

- **Both ends of the wire.** A DTO change in `api-go/` needs `api-go/openapi/openapi.json` updated, regenerated types and every consuming hook in `mobile-app/api/calls` and `mobile-app/api/propHooks` updated.
- **Realtime.** If a mutation changes data other group members see, the server must emit the socket event and the app must apply it (`mobile-app/api/realtime`).
- **Cache.** React Query is persisted to disk. A changed response shape must not crash on an old cached value.
- **Platforms.** iOS and Android. Permissions and native behavior differ.
- **Reverse states.** If you added a way in, add the way out. Create needs delete, join needs leave.
- **Docs.** Check whether the change makes existing guidance inaccurate. Apply the [documentation rules](#documentation) before adding anything.

## Dev servers

- Database: `cp .env.example .env`, then `make docker-db-up`. The API reads `POSTGRES_HOST/PORT/DB_NAME/USER/PASSWORD`, `JWT_SECRET`, `BACKEND_SENTRY_DSN` and the `AWS_*` S3 settings from the environment.
- API: `set -a; source .env; set +a; cd api-go && go run ./cmd/api` (Go 1.26; runs the migrations on start), or `make docker-backend-up` to run it in Docker.
- App: `cd mobile-app && npm install && npm start`. Use a development build (`eas build --profile development`); Expo Go doesn't have the native modules. EAS environment `development` points the app at `http://localhost:8080`.
- npm is the package manager for the app (`package-lock.json`). Don't add a second lockfile.
- Stop what you started. This machine runs other projects' servers too.

## Test data

An empty database is a bad test. For realistic data, dump the staging database read-only (`pg_dump` through `ssh privaten`, container `beerpong-db-staging`) into your local docker database. Data flows one way: into your local copy, never back to the server.

## Verifying

- Smallest proof that the change works. Run the tests and checks for the scope you touched:
  - API: `cd api-go && go test ./...`, then the contract suite against the running API: `cd api-tests && API_BASE_URL=http://localhost:8080 go test ./...` (see `api-tests/README.md`).
  - App: `cd mobile-app && npm run lint` (eslint + `tsc --noEmit`), `npm run ci:test` (vitest), `npm run ci:format`.
  - TV: `cd tv && npm run typecheck && npm test && npm run build`.
- Test meaningful logic or observable behavior (Elo, leaderboard scoring, match validation). Don't add tests that mirror the implementation.
- Backend behavior changes ship with a contract test in `api-tests/` (observable behavior) or a unit test next to the Go code (Elo, leaderboard math).
- Don't verify with simulators, devices or browsers unless the developer asks.

## Testing the Elo

The Elo lives in `api-go/internal/leaderboard/elo.go`; its comment explains the model and each constant. Ratings aren't stored per game: every leaderboard recomputes them from the season's matches, so changing a constant changes every rating at once. Check a change three ways:

- `cd api-go && go test ./internal/leaderboard` runs the behavior tests in `elo_test.go`.
- `tools/elo-sim/make-page.sh <group id>` builds `tools/elo-sim/out/elo-sim.html`: every season of a group replayed through `elo.go` (compiled to WebAssembly), sliders for the constants, each game's breakdown, and a prediction score (how often the ratings before a game pick its winner). It exports the games read only from staging (`select id, name from groups` finds the id); `GAMES_CSV=<file>` uses an export you already have, in the columns of `export.sql`. The build fails if the replay disagrees with `leaderboard.Compute`. Open the page, or hand it to another chat, to try values; then change the constants in `elo.go`.
- Contract goldens with `elo` values (`api-tests/testdata/golden`) change with the Elo. Re-record only the tests that fail on `elo` (`GOLDEN=record ... go test -run '<those tests>' ./...`) and check that the diff touches nothing but `"elo"` lines.

The page holds real player names and games, and the repo is public: never commit `tools/elo-sim/out/`.

## Shipping

- **API:** push to `staging` → `Api Staging Deploy` runs the Go tests and contract suite, builds the `api-go` image and redeploys `beerpong-api-go-staging` on the server over SSH. Migrations (`api-go/internal/database/migrations`, goose) run when it starts. There is no production API deploy; `main` doesn't deploy anything.
- **App:** push to `staging` → `Mobile App Staging` (`.github/workflows/mobile-app-eas.yml`) ships iOS from GitHub's runners, not EAS cloud builds. Android only ships when you start the workflow by hand with `platform: android`. It fingerprints the app. If a build with that fingerprint is registered on EAS, it publishes an OTA update on the build's channel. A new runtime gets a native build on the runner (`eas build --local`), registered on EAS with `eas upload`: iOS goes to TestFlight, Android to an internal preview APK. Start it by hand with `native_build` to force a build. Build numbers are managed remotely by EAS. A build you make on your laptop is only found by later pushes after `eas upload --fingerprint <hash>`.
- **TV:** push to `staging` → `TV Staging Deploy` builds `tv/Dockerfile` and redeploys the `tv` service in `~/docker/versus-tv` on the server.
- The app checks for updates on foreground and applies a downloaded update when it goes to the background (`mobile-app/hooks/useOtaUpdates.ts`).

## Pull requests

- Never make a PR unless the developer explicitly asks you to do so.
- Conventional commit titles, plain language: `fix(mobile): leaderboard no longer shows stale season`.
- Body: the problem in a sentence or two, then how you fixed it. End with the model and harness that did the work.
- UI changes need before/after images. Motion or timing needs a short video.
- One concern per PR. If the description says "also", split it.
- The `Generate OpenApi` action may push a `chore: update openapi types` commit after a change to `api-go/openapi/openapi.json`. Pull before pushing again.

## Documentation

Most code changes do not need a documentation change. Agents can read the code.

- Keep a local explanation in a nearby code comment. Use a markdown doc only when the reasoning crosses the API/app boundary or needs context the code can't carry.
- Don't document every feature, enumerate fields, narrate control flow, or append PR summaries.
- When a documented decision changes, rewrite or remove the affected text. Don't append another account of the new behavior.

## Plans and work artifacts

- Don't commit implementation plans, research notes, or agent scratch files. Keep temporary material outside the repo.
- A merged PR is the implementation record.

## How it works

The app talks to the API over REST through a typed `openapi-client-axios` client generated from the backend's OpenAPI spec. Responses are wrapped in a `ResponseEnvelope`. Handlers in `api-go/internal/api` run plain SQL through sqlc-generated queries and build the DTOs themselves. After a write, the server publishes a socket event for the group, and connected apps update their React Query cache. Assets (avatars, match photos) are uploaded to S3-compatible storage via presigned URLs. Auth uses JWTs (`api-go/internal/auth`).

## Where code lives

- `api-go/` - the API (Go, pgx + sqlc, goose migrations). `internal/api` (handlers), `internal/database` (migrations, SQL queries, generated code), `internal/leaderboard` (stats and Elo), `internal/realtime` (websocket), `openapi/` (the API document). See `api-go/README.md`.
- `api/` - the retired Spring Boot API it replaced. Not deployed or running anywhere; kept for reference until it's removed.
- `mobile-app/` - Expo / React Native app with expo-router. `app/` holds only routes: the root layout (providers, group drawer, error boundaries), `app/(main)/` (the stack with every screen) and `app/(main)/(tabs)/` (native tabs, one stack per tab). Non-route modules live in `lib/`, `components/`, `api/` (client, hooks, realtime), `zustand/` (local state), `utils/` (logging, Sentry), `hooks/`.
- `.github/workflows/` - API CI/CD, mobile CI, OpenAPI generation, and the workflow that builds and updates the app.
- `tv/` - Versus TV: a TanStack Start web app that puts live matches and the leaderboard on a TV, controlled from phones. It reduces live matches with `mobile-app/lib/liveMatch` code, so keep what `tv/src/lib/liveMatch.ts` imports free of React Native. See `tv/README.md`.
- `api-tests/` - black-box contract tests (HTTP and websocket, compared with recorded golden transcripts) and `shadowdiff`.
- `tools/elo-sim/` - the Elo simulator (see [Testing the Elo](#testing-the-elo)).
- `docker/` - local compose files for the database and backend.

## Taste

- Complexity belongs at the boundaries (API mapping, client hooks). Screens stay dumb.
- Inferred types over annotations. `any` is the enemy. Imports use the `@/` alias; eslint forbids relative imports.
- Never import `@react-navigation/*` in the app. Expo Router bundles its own React Navigation; use `expo-router/react-navigation`, the `Drawer`/`Stack`/`NativeTabs` layouts and `Stack.Toolbar`. A second copy builds and type-checks fine but crashes at launch ("Couldn't register the navigator").
- Native UI over JS imitations: header buttons are `Stack.Toolbar` items, menus are native (`Stack.Toolbar.Menu` / `@expo/ui` `MenuView`), confirmations are `Alert.alert`.
- Comments describe how a thing is used, and move when the code moves.
- No `console.*` in app code outside `utils/logging.ts`. Use a `ScopedLogger`; its output also reaches Sentry Logs.
- If a rule here fights the task in front of you, say so loudly and get a human sign-off before breaking it.

## Additional tips

- Don't verify with browsers, simulators or computer use unless the developer explicitly agrees or requests it.
- Security is important, but shouldn't be over-indexed on for dev-only tooling.

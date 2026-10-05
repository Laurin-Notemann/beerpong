# Versus TV

A web page for a TV (a laptop on HDMI, in practice): the group's leaderboard next to a live match, controlled from phones. TanStack Start, served by its own Node server under `/tv` (staging: https://beerpong.lb.staging.laurinnotemann.dev/tv).

- `/tv/` is the TV. Until a group is on it, it shows a QR code. Scanning it opens the remote on a phone.
- `/tv/remote/<id>?k=<key>` is the remote. Enter the group code once; then choose what the TV shows (auto: the leaderboard next to one live match; only the leaderboard; up to three live matches), the leaderboard's season or scope, which live match comes first, and put one live match on the whole screen. Anyone who scans the code can control the TV.
- While matches are live, the leaderboard counts them as if they ended now (the API's `POST /groups/{id}/leaderboard/projection`): players move up and down and show the points and Elo the match gives them so far.

## How it works

- The TV registers with the server under a random id. The QR code carries that id and a control key; the TV also keeps a secret that never leaves it. A phone's changes go to the server (`src/server/functions.ts`), which sends them to the TV and the other phones as server-sent events (`src/routes/api/displays.$id.events.ts`).
- The server keeps the TVs in memory. Each TV stores its settings and API login in localStorage and registers again when its event stream drops, so a restart or redeploy only costs a reconnect.
- To read the group, the server signs up its own API user per TV and joins the group with the code, like a phone does (a member without a profile, invisible in the group). Removing the group from the TV leaves it again. All API calls go through the server; browsers only open the API's `/update-socket` to hear about changes and refetch.
- TVs run old browsers, so the page works back to Chromium 69 (TVs from about 2018): the build compiles down for them, flattens Tailwind's cascade layers, adds margins where flexbox `gap` is missing (`flexGapFallback.ts`) and loads `core-js` first where built-ins are missing (`scripts/build-polyfills.mjs`). If a browser still can't run it, the error and its user agent show at the bottom of the screen.
- Live matches are reduced with the app's code from `mobile-app/` (`src/lib/liveMatch.ts`), so the TV always shows the same score as the phones. Keep the modules it imports free of React Native imports.

## Run it

```sh
npm install
VERSUS_API_URL=http://localhost:8080 npm run dev      # http://localhost:3100/tv/
VERSUS_API_URL=http://localhost:8080 npm run seed     # a made-up group with 2 live matches (LIVE=1..3); prints its code
VERSUS_API_URL=http://localhost:8080 npm run seed -- play   # keeps hitting cups in those live matches
npm run typecheck && npm test && npm run build
```

`VERSUS_API_URL` is how the server reaches the API. `VERSUS_API_PUBLIC_URL` is how browsers reach its websocket, when that differs (for example an internal Docker hostname for the server, the public HTTPS URL for browsers). `PORT` defaults to 3000.

## Staging

Pushing to `staging` runs `TV Staging Deploy` (`.github/workflows/tv-staging-cd.yml`): checks, an image from `tv/Dockerfile` (built from the repo root, since it includes the shared `mobile-app/` code), then on the server the compose service `tv` in `~/docker/versus-tv` and the Traefik route `~/traefik/dynamic/versus-tv-staging.yml` (the API's hostname, path `/tv`). The workflow writes both files, so change them there, not on the server.

Run one instance only: the TVs live in that process's memory.

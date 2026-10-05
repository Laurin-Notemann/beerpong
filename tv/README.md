# Versus TV

A web page for a TV (a laptop on HDMI, in practice): the group's live matches next to the leaderboard, controlled from phones. TanStack Start, served by its own Node server.

- `/` is the TV. Until a group is on it, it shows a QR code. Scanning it opens the remote on a phone.
- `/remote/<id>?k=<key>` is the remote. Enter the group code once; then choose what the TV shows (auto, leaderboard, live), the leaderboard's season or scope, and pin up to three live matches. Anyone who scans the code can control the TV.

## How it works

- The TV registers with the server under a random id. The QR code carries that id and a control key; the TV also keeps a secret that never leaves it. A phone's changes go to the server (`src/server/functions.ts`), which sends them to the TV and the other phones as server-sent events (`src/routes/api/displays.$id.events.ts`).
- The server keeps the TVs in memory. Each TV stores its settings and API login in localStorage and registers again when its event stream drops, so a restart or redeploy only costs a reconnect.
- To read the group, the server signs up its own API user per TV and joins the group with the code, like a phone does (a member without a profile, invisible in the group). Removing the group from the TV leaves it again. All API calls go through the server; browsers only open the API's `/update-socket` to hear about changes and refetch.
- Live matches are reduced with the app's code from `mobile-app/` (`src/lib/liveMatch.ts`), so the TV always shows the same score as the phones. Keep the modules it imports free of React Native imports.

## Run it

```sh
npm install
VERSUS_API_URL=http://localhost:8080 npm run dev      # http://localhost:3100
VERSUS_API_URL=http://localhost:8080 npm run seed     # a made-up group with live matches; prints its code
VERSUS_API_URL=http://localhost:8080 npm run seed -- play   # keeps hitting cups in those live matches
npm run typecheck && npm test && npm run build
```

`VERSUS_API_URL` is how the server reaches the API. `VERSUS_API_PUBLIC_URL` is how browsers reach its websocket, when that differs (for example an internal Docker hostname for the server, the public HTTPS URL for browsers). `PORT` defaults to 3000.

## Staging

Pushing to `staging` runs `TV Staging Deploy` (`.github/workflows/tv-staging-cd.yml`): checks, an image from `tv/Dockerfile` (built from the repo root, since it includes the shared `mobile-app/` code), and a redeploy of the compose service `tv` in `~/docker/versus-tv` on the server.

The server needs that directory once, set up like `~/docker/beerpong-api-go` (same reverse proxy network, a hostname of its own):

```yaml
services:
    tv:
        image: replaced-by-the-deploy
        restart: unless-stopped
        environment:
            VERSUS_API_URL: https://beerpong.lb.staging.laurinnotemann.dev
            PORT: 3000
```

Run one instance only: the TVs live in that process's memory.

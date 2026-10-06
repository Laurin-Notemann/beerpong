# Versus web

One TanStack Start app with its own Node server, on https://var.beerpong.laurinnotemann.dev (staging):

- `/` and `/<invite code>`: beerpong-var, the Elo simulator (see "Testing the Elo" in AGENTS.md). The season, the weights and the test games are in the URL.
- `/tv/`: Versus TV, for a TV (a laptop on HDMI, in practice): the group's leaderboard next to a live match, controlled from the app (Settings → TV Remote). Until a group is on it, it shows a 6-character code; the app's Add TV takes it. Then the app chooses what the TV shows (auto: the leaderboard next to one live match; only the leaderboard; up to three live matches), the leaderboard's season or scope, which live match comes first, puts one live match on the whole screen, and reloads the TV's page to pick up a deploy. Anyone in the group can control its TVs.
- `/tv/camera`: a camera for the TV, a laptop or a phone's browser at the table. It shows its own code, the app's Add Camera (TV Remote → Cameras) takes it, and the remote's Camera Auto view puts its video on a TV with the live match's score over it. It shows the leaderboard while idle and returns to the saved camera when the next match starts. The remote can flip the complete scoreboard sides to match the table. Players show points earned in that match (own moves and team bonuses), their place and movement on the selected leaderboard including live games, and their live Elo change. Score clips still play over it.
- While matches are live, the TV's leaderboard counts them as if they ended now (the API's `POST /groups/{id}/leaderboard/projection`): players move up and down and show the points and Elo the match gives them so far.

The two share only the document (`src/routes/__root.tsx`). Each brings its own head, stylesheet and scripts in its layout route: `src/routes/_simulator.tsx` (plain `src/simulator/styles.css`) and `src/routes/tv.tsx` (Tailwind, with its preflight, and the scripts for old TV browsers). Keep it that way, or Tailwind's reset changes how the simulator looks.

## How the TV works

- The TV registers with the server under a random id and a secret that never leaves it, and gets the code it shows (`src/tv/server/functions.ts`). The app talks to the routes `src/routes/tv/api/groups.*` with the phone's API token; the server asks the API whether the user is in the group (`src/tv/server/appRemote.ts`). Changes reach the TV as server-sent events (`src/routes/tv/api/displays.$id.events.ts`). The app lists a TV while that stream is open, so a background tab counts too, and names it from the stream's user agent ("Samsung TV", "Chrome on Mac"). TVs aren't on the API's socket, so the app polls while its remote is open. It reaches this server at `EXPO_PUBLIC_TV_URL` (default: staging). The config is `apps/mobile/lib/tvDisplay.ts`, shared by both.
- The server keeps the TVs in memory. Each TV stores its settings and API login in localStorage and registers again when its event stream drops, so a restart only costs a reconnect. On a redeploy, the event stream reloads TV and camera pages whose build differs from the server, preserving their pairing and settings.
- To read the group, the server signs up its own API user per TV and joins the group, like a phone does (a member without a profile, invisible in the group). Removing the group from the TV leaves it again. All API calls go through the server; browsers only open the API's `/update-socket` to hear about changes and refetch.
- TVs run old browsers, so the TV's pages work back to Chromium 63 (Samsung's Tizen 5 browser, 2019 TVs): the build compiles the client down for them (the simulator's too), flattens Tailwind's cascade layers, adds margins where flexbox `gap` is missing (`flexGapFallback.ts`) and loads `core-js` first where built-ins are missing (`scripts/polyfills.mjs`). Inline scripts the TV's pages get must parse there too (router scroll restoration writes one, so it's off under `/tv`). If a browser still can't run it, the error and its user agent show at the bottom of the screen. Errors the running TV hits go to the Sentry project `web` (`src/tv/sentry.ts`, loaded by the TV's layout route only; the staging build bakes in the DSN), and so do the server's (`src/serverSentry.ts`, loaded by the middleware in `src/start.ts`).
- A camera registers like a TV (`kind: 'camera'`) and keeps its own profile-less API membership and session. While any match is live, it shows REC and saves silent, standalone 30-second MP4/H.264 files (WebM fallback), around 720p at 4 Mbps. Uploads stream through this server to the bucket, independent of the TV feed; up to six files / 90 MiB retry in memory before the oldest is dropped with a Sentry warning. Keep the page open: queued files are lost on reload. Removing the camera leaves the group and stops recording. Its TV video goes to each TV over WebRTC, peer to peer, so on the same Wi-Fi the TV feed stays in the room (recordings go to the bucket): the TV asks for it, the camera offers, the TV answers, both through this server's events (`src/tv/lib/cameraFeed.ts`). There's only a public STUN server, no TURN: networks that prevent a direct connection may get no video. The TV keeps showing Auto with a reason in its header (no camera online, no video from the camera, or a failed connection); try the same Wi-Fi without client isolation.
- Server functions check the caller's origin by host (`src/start.ts`): Traefik ends TLS in front of the server, and TV browsers (before Chromium 76) don't send `Sec-Fetch-Site`, so the default check would answer them 403.
- Live matches are reduced with the app's code from `apps/mobile/` through the `@/` alias (`aliases.ts`; `src/tv/lib/liveMatch.ts` for the TV, `src/simulator/liveMatch.ts` for the simulator's games running right now), so both always show the same score as the phones. Keep the modules they import free of React Native imports. `~/` is this app's `src/`.

## Run it

```sh
npm install                                           # in the repo root
VERSUS_API_URL=http://localhost:8080 npm run dev      # http://localhost:3100/ and /tv/
VERSUS_API_URL=http://localhost:8080 npm run seed     # a made-up group with 2 live matches (LIVE=1..3); prints its code
VERSUS_API_URL=http://localhost:8080 npm run seed -- play   # keeps hitting cups in those live matches
npm run typecheck && npm test && npm run build
```

`VERSUS_API_URL` is how the server reaches the API (default `http://localhost:8080`). `VERSUS_API_PUBLIC_URL` is how browsers reach its websocket, when that differs (on staging an internal Docker hostname for the server, the public HTTPS URL for browsers). `PORT` defaults to 3000. The simulator only reads, so `VERSUS_API_URL=https://beerpong.lb.staging.laurinnotemann.dev npm run dev` shows staging's groups; don't open the TV against it, it signs up users there.

## Staging

Pushing to `staging` runs `Web Staging Deploy` (`.github/workflows/web-staging-cd.yml`): checks, an image from `apps/web/Dockerfile` (built from the repo root, since it includes the shared `apps/mobile/` code and the root lockfile), then on the server the compose service `web` in `~/docker/versus-web` and the Traefik route `~/traefik/dynamic/beerpong-var.yml`. The old TV route `~/traefik/dynamic/versus-tv-staging.yml` permanently redirects `/tv` on the API's hostname here. The workflow writes all three files, so change them there, not on the server.

Run one instance only: the TVs live in that process's memory.

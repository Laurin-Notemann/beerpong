# Built from the repo root (`docker build -f apps/web/Dockerfile .`): dependencies come from the
# root pnpm lockfile, and the TV and the simulator reduce live matches with the app's own code
# (src/tv/lib/liveMatch.ts, src/simulator/liveMatch.ts), so those parts of apps/mobile/ come along.
FROM node:24-alpine AS build
WORKDIR /src
# pnpm in the version package.json's packageManager names
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# every workspace's manifest, so the lockfile can be checked; only the web app's packages install
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter web
COPY apps/mobile/lib apps/mobile/lib
COPY apps/mobile/api/utils apps/mobile/api/utils
COPY apps/mobile/components/CupGrid apps/mobile/components/CupGrid
COPY apps/mobile/utils apps/mobile/utils
COPY apps/mobile/openapi apps/mobile/openapi
COPY apps/web/ apps/web/
COPY ml/cups/release.json ml/cups/
WORKDIR /src/apps/web
# baked into the TV's client for Sentry (src/tv/sentry.ts); empty means no reporting
ARG VITE_SENTRY_DSN
ARG VITE_GIT_COMMIT
RUN node scripts/cup-model.mjs && pnpm run build

FROM node:24-alpine
# converts score clips into MP4s the TV can play (src/tv/server/clips.ts)
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY --from=build /src/apps/web/.output .output
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
USER node
CMD ["node", ".output/server/index.mjs"]

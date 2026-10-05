# Built from the repo root (`docker build -f apps/tv/Dockerfile .`): dependencies come from the
# root lockfile, and the TV reduces live matches with the app's own code (src/lib/liveMatch.ts),
# so those parts of apps/mobile/ come along.
FROM node:24-alpine AS build
WORKDIR /src
COPY package.json package-lock.json .npmrc ./
COPY apps/tv/package.json apps/tv/
RUN npm ci -w apps/tv --no-audit --no-fund
COPY apps/mobile/lib apps/mobile/lib
COPY apps/mobile/api/utils apps/mobile/api/utils
COPY apps/mobile/components/CupGrid apps/mobile/components/CupGrid
COPY apps/mobile/utils apps/mobile/utils
COPY apps/mobile/openapi apps/mobile/openapi
COPY apps/tv/ apps/tv/
WORKDIR /src/apps/tv
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=build /src/apps/tv/.output .output
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
USER node
CMD ["node", ".output/server/index.mjs"]

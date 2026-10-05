# Built from the repo root (`docker build -f tv/Dockerfile .`): the TV reduces live matches with
# the app's own code (tv/src/lib/liveMatch.ts), so those parts of mobile-app/ come along.
FROM node:24-alpine AS build
WORKDIR /src
COPY mobile-app/lib mobile-app/lib
COPY mobile-app/api/utils mobile-app/api/utils
COPY mobile-app/components/CupGrid mobile-app/components/CupGrid
COPY mobile-app/utils mobile-app/utils
COPY mobile-app/openapi mobile-app/openapi
WORKDIR /src/tv
COPY tv/package.json tv/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tv/ ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY --from=build /src/tv/.output .output
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
USER node
CMD ["node", ".output/server/index.mjs"]

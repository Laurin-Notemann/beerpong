# Built from the repo root (`docker build -f beerpong-var/Dockerfile .`): running live matches are
# reduced with the app's own code (src/liveMatch.ts), so those parts of mobile-app/ come along.
FROM node:24-slim AS build
WORKDIR /src
COPY mobile-app/lib mobile-app/lib
COPY mobile-app/api/utils mobile-app/api/utils
COPY mobile-app/components/CupGrid mobile-app/components/CupGrid
COPY mobile-app/utils mobile-app/utils
COPY mobile-app/openapi mobile-app/openapi
WORKDIR /src/beerpong-var
COPY beerpong-var/package.json beerpong-var/package-lock.json ./
RUN npm ci
COPY beerpong-var/ ./
RUN npm run lint && npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /src/beerpong-var/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

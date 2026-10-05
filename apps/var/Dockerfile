# Built from the repo root (`docker build -f apps/var/Dockerfile .`), where the lockfile is.
FROM node:24-slim AS build
WORKDIR /src
COPY package.json package-lock.json .npmrc ./
COPY apps/var/package.json apps/var/
RUN npm ci -w apps/var
COPY apps/var/ apps/var/
WORKDIR /src/apps/var
RUN npm run lint && npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /src/apps/var/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

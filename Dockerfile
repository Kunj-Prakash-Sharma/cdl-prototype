# One image, two entrypoints:
#   web:     node /app/server.js                 (default)
#   worker:  node /worker/dist/worker.js
#   migrate: cd /worker && node dist/migrate.js   (run before deploying a new version)

FROM node:22-slim AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Env is validated at import by server code, so the build needs a (fake) .env. It is not copied to the runtime image.
RUN cp .env.example .env \
 && npm run build \
 && npm run build:worker \
 && mkdir -p drizzle
# Worker/migrate runtime deps, pinned to the exact versions in package-lock.json.
RUN mkdir /worker-deps && node -e ' \
  const deps = ["pg", "pg-boss", "zod", "drizzle-orm"]; \
  const pkg = { name: "worker", private: true, dependencies: Object.fromEntries( \
    deps.map((d) => [d, require("./node_modules/" + d + "/package.json").version])) }; \
  require("fs").writeFileSync("/worker-deps/package.json", JSON.stringify(pkg));' \
 && cd /worker-deps && npm install --omit=dev --no-audit --no-fund

FROM node:22-slim AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
# Web: Next standalone output (static assets are not included in it, so copy them).
COPY --from=build --chown=node:node /src/.next/standalone ./
COPY --from=build --chown=node:node /src/.next/static ./.next/static
# Worker + migrations, with their own node_modules so the web app's traced modules are untouched.
COPY --from=build --chown=node:node /worker-deps /worker
COPY --from=build --chown=node:node /src/dist /worker/dist
COPY --from=build --chown=node:node /src/drizzle /worker/drizzle
USER node
EXPOSE 3000
CMD ["node", "server.js"]

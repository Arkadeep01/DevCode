# syntax=docker/dockerfile:1

# DevCode production image (self-hosted / single-host path).
#
# The primary deployment target for this repository is Vercel — see
# DEPLOYMENT.md. This image covers the other case: running the API and the
# web client on one host, on one origin, with no platform-specific wiring.
#
#   docker build -t devcode .
#   docker run -p 4000:4000 -v devcode-data:/app/server/data \
#     -e JWT_SECRET=... -e COACH_PROVIDER=mock devcode
#
# The build is multi-stage: build tools and dev dependencies never reach the
# runtime image, and no secret is ever passed as a build argument.

ARG NODE_VERSION=22

# --- base -------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NODE_ENV=production
WORKDIR /app

# --- web client -------------------------------------------------------------
FROM base AS web-deps
COPY package.json package-lock.json ./
RUN npm ci

FROM web-deps AS web-build
COPY index.html vite.config.ts tsconfig.json vitest.config.ts ./
COPY public ./public
COPY scripts ./scripts
COPY src ./src
RUN npm run build

# --- API --------------------------------------------------------------------
FROM base AS api-deps
# The libSQL client ships a native binding; the toolchain is only needed when
# no prebuilt binary matches the target platform.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

FROM api-deps AS api-build
COPY server ./server
RUN cd server && npm run build

# Runtime dependencies only — no compiler, no drizzle-kit, no test tooling.
FROM base AS api-prod-deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev && npm cache clean --force

# --- runtime ----------------------------------------------------------------
FROM base AS runtime

RUN groupadd --system --gid 1001 devcode \
    && useradd --system --uid 1001 --gid devcode --create-home devcode

COPY --from=api-prod-deps /app/server/node_modules ./server/node_modules
COPY --from=api-build /app/server/dist ./server/dist
COPY --from=api-build /app/server/drizzle ./server/drizzle
COPY --from=api-build /app/server/package.json ./server/package.json
COPY --from=web-build /app/dist ./dist

# The seed script mirrors the frontend bank into the questions table, so the
# bank has to be present in the runtime image as well.
COPY src/data/questionBank ./src/data/questionBank

# The database lives on a mounted volume in production (or points at a
# remote libSQL server through DATABASE_URL).
RUN mkdir -p /app/server/data /app/server/backups \
    && chown -R devcode:devcode /app/server/data /app/server/backups \
    && chown -R devcode:devcode /app/dist

USER devcode

ENV PORT=4000 \
    NODE_ENV=production \
    STATIC_DIR=../dist \
    DATABASE_URL=./data/devcode.sqlite \
    ALLOW_LOCAL_DATABASE=true

EXPOSE 4000

# Readiness: the API answers 200 only when the database answers too.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/dist/local-server.js"]

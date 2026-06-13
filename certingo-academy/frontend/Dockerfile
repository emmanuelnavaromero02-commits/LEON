# ---------------------------------------------------------------------------
# Certingo Academy frontend image (Next.js 15, standalone output).
#
# Multi-stage:
#   deps    -> installs node_modules from the lockfile (npm ci).
#   builder -> compiles the Next.js production build (.next/standalone).
#   runner  -> minimal runtime serving the standalone server, non-root.
# ---------------------------------------------------------------------------

# --------------------------------- deps ------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Install exactly the locked dependencies.
COPY package.json package-lock.json ./
RUN npm ci

# -------------------------------- builder ----------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* values are inlined at build time, so the API URL must be a
# build argument. Defaults to the local backend for dev builds.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Disable Next.js telemetry during the image build.
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# --------------------------------- runner ----------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root runtime user.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# The standalone build bundles a minimal server + its node_modules. We also
# need the public assets and the static chunks, which live outside standalone.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# server.js is emitted by Next.js standalone output and respects PORT/HOSTNAME.
CMD ["node", "server.js"]

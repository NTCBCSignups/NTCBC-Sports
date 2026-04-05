FROM node:22-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build (skipped for dev)
FROM base AS builder
ARG BUILD_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN if [ "$BUILD_ENV" = "development" ]; then echo "Skipping build for dev"; else npm run build; fi

# Stage 3: Final image
FROM base AS runner
ARG BUILD_ENV=production
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app ./

RUN if [ "$BUILD_ENV" = "production" ]; then \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/prod && \
    cp -a .next/standalone/. /app/prod/ && \
    cp -a .next/static /app/prod/.next/static && \
    cp -a public /app/prod/public && \
    rm -rf /app/node_modules /app/.next /app/app /app/components /app/hooks /app/lib /app/scripts && \
    mv /app/prod/* /app/ && rm -rf /app/prod; \
    fi

ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000
EXPOSE 3000

RUN printf '#!/bin/sh\nif [ "$BUILD_ENV" = "development" ]; then\n  exec npm run dev\nelse\n  exec node server.js\nfi\n' > /entrypoint.sh && chmod +x /entrypoint.sh

ENV BUILD_ENV=${BUILD_ENV}
ENTRYPOINT ["/entrypoint.sh"]

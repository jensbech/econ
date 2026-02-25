# Build stage
FROM node:22.13-alpine3.21 AS builder
WORKDIR /app

# Copy lockfile and package.json first for layer caching
COPY package-lock.json package.json ./

# Install all dependencies (including devDeps needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js application (standalone output)
# DATABASE_URL must be set to satisfy the module-load check in db/index.ts,
# but no actual connection is made during build.
ARG DATABASE_URL=postgresql://localhost:5432/dummy
ENV DATABASE_URL=${DATABASE_URL}
RUN npm run build

# Runtime stage
FROM node:22.13-alpine3.21
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy DB migrations and migration runner
COPY --from=builder /app/db/migrations ./db/migrations
COPY --from=builder /app/scripts ./scripts

# Copy entrypoint
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

ENTRYPOINT ["dumb-init", "--", "docker-entrypoint.sh"]
CMD ["node", "server.js"]

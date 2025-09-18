# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY knexfile.ts ./
COPY migrations/ ./migrations/

# Install ALL dependencies (including devDependencies for TypeScript)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build application and compile knexfile
RUN npm run build && \
    npx tsc knexfile.ts && \
    cp knexfile.js dist/knexfile.js && \
    cp knexfile.js dist/shared/knexfile.js && \
    cp knexfile.js dist/bot/knexfile.js

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aegis -u 1001

WORKDIR /app

# Copy package files and tsconfig.json FIRST (before changing ownership)
COPY package*.json ./
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application and bootstrap script from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/knexfile.js ./knexfile.js
COPY --from=builder /app/migrations ./migrations
COPY start.js ./
COPY migrate-and-start.js ./

# Create logs directory and change ownership of all files
RUN mkdir -p logs && \
    chown -R aegis:nodejs /app

# Switch to non-root user
USER aegis

# Health check (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD pgrep -f "node" || exit 1

# Start application with migrations
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "migrate-and-start.js"]
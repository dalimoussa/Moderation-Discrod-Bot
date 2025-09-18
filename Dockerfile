# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for TypeScript)
RUN npm ci && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S aegis -u 1001

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy tsconfig.json for tsconfig-paths runtime resolution
COPY --from=builder --chown=aegis:nodejs /app/tsconfig.json ./

# Copy built application from builder stage
COPY --from=builder --chown=aegis:nodejs /app/dist ./dist

# Create logs directory
RUN mkdir -p logs && chown aegis:nodejs logs

# Switch to non-root user
USER aegis

# Expose port
EXPOSE 3000

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "-r", "tsconfig-paths/register", "dist/index.js"]
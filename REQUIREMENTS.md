# Aegis Discord Bot - Requirements and Setup

## System Requirements

### Prerequisites
- Node.js 20+ (LTS recommended)
- npm 10+ or yarn 1.22+
- Docker 24+ with Docker Compose
- Git 2.40+
- PostgreSQL 15+ (can be run via Docker)
- Redis 7+ (can be run via Docker)

### Development Tools (Optional but Recommended)
- VS Code with TypeScript extension
- Discord Developer Portal account
- PostgreSQL client (pgAdmin, DBeaver, or similar)
- Redis client (RedisInsight or similar)

## Package Dependencies

### Runtime Dependencies
- discord.js@^14.14.1          # Discord API wrapper
- @discordjs/rest@^2.2.0       # Discord REST API client
- express@^4.18.2              # Web framework for dashboard API
- cors@^2.8.5                  # Cross-origin resource sharing
- helmet@^7.1.0                # Security middleware
- compression@^1.7.4           # Response compression
- knex@^3.1.0                  # SQL query builder
- pg@^8.11.3                   # PostgreSQL client
- redis@^4.6.11                # Redis client
- jsonwebtoken@^9.0.2          # JWT token handling
- bcrypt@^5.1.1                # Password hashing
- joi@^17.11.0                 # Input validation
- winston@^3.11.0              # Logging framework
- winston-daily-rotate-file@^4.7.1  # Log rotation
- node-cron@^3.0.3             # Task scheduling
- prom-client@^15.1.0          # Prometheus metrics
- dotenv@^16.3.1               # Environment variables
- uuid@^9.0.1                  # UUID generation
- crypto-js@^4.2.0             # Encryption utilities
- bullmq@^4.15.0               # Job queue (Redis-based)

### Development Dependencies
- @types/node@^20.10.4         # Node.js type definitions
- @types/express@^4.17.21      # Express type definitions
- @types/cors@^2.8.17          # CORS type definitions
- @types/compression@^1.7.5    # Compression type definitions
- @types/pg@^8.10.9            # PostgreSQL type definitions
- @types/jsonwebtoken@^9.0.5   # JWT type definitions
- @types/bcrypt@^5.0.2         # Bcrypt type definitions
- @types/uuid@^9.0.7           # UUID type definitions
- @types/crypto-js@^4.2.1      # Crypto-js type definitions
- @types/node-cron@^3.0.11     # Node-cron type definitions
- @types/jest@^29.5.8          # Jest type definitions
- typescript@^5.3.2            # TypeScript compiler
- tsx@^4.6.0                   # TypeScript execution engine
- jest@^29.7.0                 # Testing framework
- ts-jest@^29.1.1              # Jest TypeScript support
- supertest@^6.3.3             # HTTP testing
- @typescript-eslint/eslint-plugin@^6.13.1  # TypeScript ESLint rules
- @typescript-eslint/parser@^6.13.1         # TypeScript ESLint parser
- eslint@^8.54.0               # JavaScript/TypeScript linter
- eslint-config-prettier@^9.0.0             # Prettier ESLint config
- eslint-plugin-security@^1.7.1             # Security ESLint rules
- prettier@^3.1.0              # Code formatter
- husky@^8.0.3                 # Git hooks
- lint-staged@^15.2.0          # Staged files linting

## Discord Bot Setup Requirements

### Discord Developer Portal
1. Create a new application at https://discord.com/developers/applications
2. Create a bot user under the "Bot" section
3. Get the bot token (keep this secret!)
4. Get the client ID from "General Information"
5. Get the client secret from "OAuth2"

### Required Bot Permissions
- View Channels
- Send Messages
- Embed Links
- Read Message History
- Use Slash Commands
- Manage Messages
- Moderate Members
- Ban Members
- Manage Roles

### OAuth2 Scopes
- bot
- applications.commands
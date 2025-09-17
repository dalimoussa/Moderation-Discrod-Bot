# 🛠️ Aegis Discord Bot - Setup Guide

## 📋 Prerequisites

### System Requirements
- **Node.js** 20+ with npm 10+
- **PostgreSQL** 13+ (local or cloud)
- **Redis** 6+ (optional but recommended)
- **Discord Bot Token** with required permissions

### Discord Bot Setup

1. **Create Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Click "New Application" and give it a name
   - Go to "Bot" section and click "Add Bot"
   - Copy the bot token (keep this secure!)

2. **Configure Bot Permissions**
   Required permissions:
   - `Send Messages`
   - `Use Slash Commands`
   - `Manage Messages`
   - `Ban Members`
   - `Kick Members`
   - `Manage Roles`
   - `Manage Channels`
   - `View Audit Log`
   - `Read Message History`

3. **Bot Invite URL**
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=1099511627775&scope=bot%20applications.commands
   ```

## ⚡ Quick Installation

### Option 1: Manual Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/aegis-discord-bot.git
   cd aegis-discord-bot
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```env
   # Discord Configuration
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here
   
   # Database Configuration
   DATABASE_URL=postgresql://username:password@localhost:5432/aegis_bot
   
   # Redis Configuration (optional)
   REDIS_URL=redis://localhost:6379
   
   # Environment
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Create database
   createdb aegis_bot
   
   # Run migrations
   npm run db:migrate
   ```

5. **Start the Bot**
   ```bash
   # Development mode (with hot reload)
   npm run dev
   
   # Production mode
   npm run build && npm start
   ```

### Option 2: Docker Setup

1. **Clone and Configure**
   ```bash
   git clone https://github.com/yourusername/aegis-discord-bot.git
   cd aegis-discord-bot
   cp .env.example .env
   # Edit .env with your values
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **View Logs**
   ```bash
   docker-compose logs -f bot
   ```

## 🔧 Configuration Details

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your values
```

**Required Environment Variables:**
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_GUILD_ID=your_test_guild_id_here
BOT_OWNER_ID=your_discord_user_id_here
```

### Step 5: Start Development Services

```bash
# Start PostgreSQL and Redis with Docker
docker-compose up -d postgres redis

# Wait for services to be ready (about 30 seconds)
docker-compose logs postgres redis

# Run database migrations
npm run db:migrate

# Optional: Seed database with test data
npm run db:seed
```

### Step 6: Start the Bot

```bash
# Method 1: Start bot in development mode
npm run bot:dev

# Method 2: Start full application (bot + API)
npm run dev

# Method 3: Start with Docker (full stack)
docker-compose up
```

### Step 7: Test the Bot

1. **Invite Bot to Your Server**
   - Use this URL (replace CLIENT_ID): 
   ```
   https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=1099511627775&scope=bot%20applications.commands
   ```

2. **Test Commands**
   - `/ping` - Check bot latency
   - `/warn @user reason` - Test moderation command

### Step 8: Development Tools (Optional)

```bash
# Start database management UI
docker-compose --profile tools up pgadmin redis-commander

# Start monitoring stack
docker-compose --profile monitoring up prometheus grafana

# Access URLs:
# - pgAdmin: http://localhost:5050 (admin@aegis.local / admin)
# - Redis Commander: http://localhost:8081
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001 (admin / admin)
```

## Common Commands

```bash
# Development
npm run dev              # Start bot in development mode
npm run bot:dev          # Start only bot (no API)
npm run api:dev          # Start only API (no bot)

# Database
npm run db:migrate       # Run migrations
npm run db:rollback      # Rollback last migration
npm run db:seed          # Seed database
npm run db:reset         # Reset database

# Code Quality
npm run lint             # Check code style
npm run lint:fix         # Fix code style issues
npm run type-check       # Check TypeScript types
npm test                 # Run tests
npm run test:coverage    # Run tests with coverage

# Production
npm run build            # Build for production
npm start               # Start production build
```

## Troubleshooting

### Bot Won't Start
- Check Discord token is correct
- Verify bot has proper permissions
- Check database connection
- Review logs: `docker-compose logs bot`

### Database Issues
- Ensure PostgreSQL is running: `docker-compose ps postgres`
- Check connection string in .env
- Reset database: `npm run db:reset`

### Permission Errors
- Verify bot permissions in Discord server
- Check role hierarchy (bot role should be high enough)
- Review Discord audit log for permission denials

### Docker Issues
- Restart Docker Desktop
- Clean containers: `docker-compose down && docker-compose up -d`
- Check disk space and memory usage

## Next Steps

1. **Customize Configuration**
   - Modify guild settings
   - Configure automod rules
   - Set up logging channels

2. **Add Features**
   - Create custom commands
   - Configure dashboard
   - Set up webhooks

3. **Deploy to Production**
   - Follow deployment guide in docs/devops.md
   - Set up monitoring and alerts
   - Configure backup procedures
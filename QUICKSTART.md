# ⚡ Quick Start - 5 Minutes to Running Bot

Get Aegis Discord Bot running in under 5 minutes!

## 🚀 Prerequisites Check

- [ ] Node.js 20+ installed (`node --version`)
- [ ] PostgreSQL running locally
- [ ] Discord Bot Token ready

## 🏃‍♂️ Super Quick Setup

### 1. Clone & Install (1 min)
```bash
git clone https://github.com/yourusername/aegis-discord-bot.git
cd aegis-discord-bot
npm install
```

### 2. Configure Environment (2 min)
```bash
cp .env.example .env
```

Edit `.env` - **Only these 3 lines needed**:
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here  
DATABASE_URL=postgresql://localhost/aegis_bot
```

### 3. Database Setup (1 min)
```bash
createdb aegis_bot
npm run db:migrate
```

### 4. Start Bot (30 seconds)
```bash
npm run dev
```

### 5. Test in Discord (30 seconds)
- Invite bot to your server using OAuth2 URL from Discord Developer Portal
- Try `/about` command
- ✅ **Done!**

---

## 🐳 Even Faster with Docker

### One Command Setup
```bash
git clone https://github.com/yourusername/aegis-discord-bot.git
cd aegis-discord-bot
cp .env.example .env
# Edit .env with your bot token
docker-compose up -d
```

**That's it!** Bot is running with database included.
```bash
# Start PostgreSQL and Redis with Docker Compose
docker-compose up -d

# The databases will be available at:
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

#### Option B: Local Installation
- Install PostgreSQL and Redis locally
- Create a database named `aegis_dev`
- Update the DATABASE_URL in `.env` accordingly

### 4. 🔄 Run Database Migrations
```bash
npm run migrate
```

### 5. 🎯 Invite Bot to Your Server

1. Go to Discord Developer Portal → Your App → OAuth2 → URL Generator
2. Select scopes: `bot`, `applications.commands`
3. Select bot permissions: `Administrator` (or customize as needed)
4. Copy the generated URL and open it to invite your bot

### 6. 🚀 Start the Bot

```bash
# Development mode with hot reload
npm run dev

# Or production mode
npm start
```

## 📝 Available Commands

Once running, your bot will have these slash commands:

- `/ping` - Check if the bot is responding
- `/warn @user reason` - Issue a warning to a user (requires Moderate Members permission)

## 🔍 What's Next?

1. **Check the logs** - The bot will show detailed startup information
2. **Test commands** - Try `/ping` first to verify everything works
3. **Add more commands** - Check `src/bot/commands/` to add new functionality
4. **Monitor** - Logs are stored in the `logs/` directory

## 🛠️ Development

- **Hot reload**: `npm run dev` (uses tsx for TypeScript execution)
- **Build**: `npm run build`
- **Type check**: `npm run type-check`
- **Lint**: `npm run lint`
- **Test**: `npm test`

## 📁 Project Structure

```
src/
├── bot/           # Discord bot core
├── database/      # Database migrations and models
├── shared/        # Shared utilities and services
└── index.ts       # Application entry point
```

## ⚠️ Troubleshooting

### Bot won't start?
- Check your Discord token in `.env`
- Make sure PostgreSQL and Redis are running
- Run `npm run migrate` to set up the database

### Commands not showing?
- Make sure bot has `applications.commands` scope
- Check bot permissions in your server
- Restart the bot after making changes

### Database errors?
- Verify DATABASE_URL in `.env`
- Make sure PostgreSQL is running on port 5432
- Check if the database `aegis_dev` exists

## 📖 Documentation

- Full documentation: `docs/`
- API specification: `docs/api-specification.json`
- Architecture overview: `docs/architecture.md`
- Security details: `docs/security.md`

---

**Need help?** Check the logs in the `logs/` directory or review the documentation in the `docs/` folder.
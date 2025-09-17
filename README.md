# 🛡️ Aegis Discord Bot

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**A professional, enterprise-grade Discord bot built with TypeScript**

[Features](#-features) • [Quick Start](#-quick-start) • [Commands](#-commands) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🔨 **Moderation System**
- **Advanced Warning System** - Progressive discipline with configurable thresholds
- **Smart Automod** - Automated content filtering, spam detection, and anti-raid protection
- **Comprehensive Moderation** - Ban, kick, clear, slowmode with full audit logging
- **Case Management** - Persistent storage with search and appeals system

### 🎫 **Ticketing System**
- **Multi-Category Support** - Different ticket types with custom workflows
- **Staff Assignment** - Automatic or manual ticket routing
- **Transcript Generation** - Complete conversation archival
- **Priority Management** - Urgent, high, normal, low with SLA tracking

### 👥 **Community Features**
- **Leveling System** - XP tracking with customizable rewards
- **Welcome Messages** - Automated member onboarding with role assignment
- **Server Management** - Comprehensive server information and statistics

### 🛠️ **Developer Tools**
- **Health Monitoring** - Real-time system diagnostics
- **Performance Metrics** - Bot statistics and performance tracking
- **Comprehensive Logging** - Structured JSON logs with rotation
- **Database Integration** - PostgreSQL with Redis caching

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and npm 10+
- PostgreSQL 13+
- Redis 6+
- Discord Bot Token

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/aegis-discord-bot.git
   cd aegis-discord-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Start the bot**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build && npm start
   ```

### Docker Setup
```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f bot
```

---

## 📋 Commands

### 🔨 Moderation (5 commands)
| Command | Description | Permissions |
|---------|-------------|-------------|
| `/ban` | Ban a member from the server | Ban Members |
| `/kick` | Kick a member from the server | Kick Members |
| `/clear` | Bulk delete messages (2-100) | Manage Messages |
| `/warn` | Issue warning to a user | Moderate Members |
| `/slowmode` | Set channel slowmode (0-21600s) | Manage Channels |
| `/automod` | Configure automated moderation | Manage Guild |

### 🎫 Utility & Management (9 commands)
| Command | Description | Usage |
|---------|-------------|-------|
| `/about` | Bot version & system information | General |
| `/health` | System health diagnostics | Admin |
| `/invite` | Generate bot invite link | General |
| `/serverinfo` | Display server statistics | General |
| `/userinfo` | Show user profile information | General |
| `/stats` | Bot performance metrics | General |
| `/welcome` | Configure welcome messages | Manage Guild |
| `/ticket` | Ticket system management | Manage Guild |
| `/level` | User leveling and XP information | General |

---

## 🏗️ Architecture

### Tech Stack
- **Runtime**: Node.js 20+ with TypeScript
- **Discord**: Discord.js v14 with slash commands
- **Database**: PostgreSQL with Knex.js migrations
- **Caching**: Redis for session management
- **Logging**: Winston with structured JSON logs
- **Deployment**: Docker with multi-stage builds

### Project Structure
```
aegis-discord-bot/
├── src/
│   ├── bot/
│   │   ├── commands/          # Slash commands
│   │   ├── events/            # Discord events
│   │   ├── handlers/          # Command & event handlers
│   │   └── interfaces/        # TypeScript interfaces
│   ├── database/
│   │   └── migrations/        # Database schema
│   └── shared/
│       ├── services/          # Core services
│       └── utils/             # Utility functions
├── docs/                      # Documentation
├── scripts/                   # Utility scripts
└── docker-compose.yml         # Docker configuration
```

---

## 📖 Documentation

### Essential Guides
- [📚 **Setup Guide**](SETUP.md) - Complete installation and configuration
- [⚡ **Quick Start**](QUICKSTART.md) - Get running in 5 minutes
- [📋 **Requirements**](REQUIREMENTS.md) - System requirements and dependencies

### Advanced Documentation
- [🏗️ **Architecture**](docs/architecture.md) - System design and patterns
- [🔐 **Security**](docs/security.md) - Security best practices
- [📊 **Data Models**](docs/data-models.md) - Database schema
- [🚀 **DevOps**](docs/devops.md) - Deployment and monitoring
- [🗺️ **Roadmap**](docs/roadmap.md) - Future features and timeline

---

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start in development mode
npm run build        # Build for production
npm start            # Start built application
npm test             # Run test suite
npm run lint         # Run ESLint
npm run db:migrate   # Run database migrations
npm run db:reset     # Reset database
```

### Key Features for Developers
- **Hot Reload** - Instant TypeScript compilation
- **Error Handling** - Comprehensive error tracking
- **Type Safety** - Full TypeScript coverage
- **Database** - Knex.js with migrations
- **Logging** - Structured Winston logging
- **Testing** - Jest test framework

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Discord Server**: [Join our support server](https://discord.gg/your-server)
- **Issues**: [GitHub Issues](https://github.com/yourusername/aegis-discord-bot/issues)
- **Documentation**: [Full Documentation](docs/)

---

<div align="center">

**Built with ❤️ for the Discord community**

⭐ Star this repository if you find it helpful!

</div>
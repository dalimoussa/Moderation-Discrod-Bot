# Aegis Discord Bot - Data Models

## Database Schema Design

### Core Entities

#### Guilds Table
```sql
CREATE TABLE guilds (
  guild_id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  owner_id BIGINT NOT NULL,
  settings JSONB DEFAULT '{}',
  features_enabled TEXT[] DEFAULT ARRAY[]::TEXT[],
  locale VARCHAR(10) DEFAULT 'en-US',
  timezone VARCHAR(50) DEFAULT 'UTC',
  premium_tier INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL
);

-- Indexes
CREATE INDEX idx_guilds_owner ON guilds(owner_id);
CREATE INDEX idx_guilds_created ON guilds(created_at);
CREATE INDEX idx_guilds_features ON guilds USING GIN(features_enabled);
CREATE INDEX idx_guilds_settings ON guilds USING GIN(settings);
```

#### Users Table
```sql
CREATE TABLE users (
  user_id BIGINT PRIMARY KEY,
  username VARCHAR(32) NOT NULL,
  discriminator VARCHAR(4),
  global_name VARCHAR(32),
  avatar_hash VARCHAR(32),
  flags JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_username ON users(LOWER(username));
CREATE INDEX idx_users_last_seen ON users(last_seen);
CREATE INDEX idx_users_flags ON users USING GIN(flags);
```

#### Guild Members Table
```sql
CREATE TABLE guild_members (
  guild_id BIGINT REFERENCES guilds(guild_id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(user_id) ON DELETE CASCADE,
  nickname VARCHAR(32),
  roles BIGINT[] DEFAULT ARRAY[]::BIGINT[],
  joined_at TIMESTAMP NOT NULL,
  premium_since TIMESTAMP,
  permissions JSONB DEFAULT '{}',
  flags JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (guild_id, user_id)
);

-- Indexes
CREATE INDEX idx_guild_members_joined ON guild_members(guild_id, joined_at);
CREATE INDEX idx_guild_members_roles ON guild_members USING GIN(roles);
CREATE INDEX idx_guild_members_permissions ON guild_members USING GIN(permissions);
```

### Moderation System

#### Moderation Cases Table
```sql
CREATE TABLE moderation_cases (
  case_id SERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('warn', 'mute', 'kick', 'ban', 'unban', 'unmute')),
  target_user BIGINT NOT NULL,
  target_username VARCHAR(32) NOT NULL,
  moderator_user BIGINT NOT NULL,
  moderator_username VARCHAR(32) NOT NULL,
  reason TEXT NOT NULL,
  duration_seconds INTEGER, -- For timed actions
  expires_at TIMESTAMP, -- Computed expiration
  evidence JSONB DEFAULT '{}', -- Screenshots, message links, etc.
  metadata JSONB DEFAULT '{}', -- Additional context
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'appealed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mod_cases_guild ON moderation_cases(guild_id, created_at DESC);
CREATE INDEX idx_mod_cases_target ON moderation_cases(target_user, guild_id);
CREATE INDEX idx_mod_cases_moderator ON moderation_cases(moderator_user, guild_id);
CREATE INDEX idx_mod_cases_action ON moderation_cases(action_type, guild_id);
CREATE INDEX idx_mod_cases_status ON moderation_cases(status, expires_at) WHERE status = 'active';
CREATE INDEX idx_mod_cases_expires ON moderation_cases(expires_at) WHERE expires_at IS NOT NULL;
```

#### Case Appeals Table
```sql
CREATE TABLE case_appeals (
  appeal_id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES moderation_cases(case_id) ON DELETE CASCADE,
  guild_id BIGINT NOT NULL,
  appellant_user BIGINT NOT NULL,
  appeal_reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'withdrawn')),
  reviewed_by BIGINT,
  review_reason TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_appeals_case ON case_appeals(case_id);
CREATE INDEX idx_appeals_guild_status ON case_appeals(guild_id, status);
CREATE INDEX idx_appeals_appellant ON case_appeals(appellant_user);
```

### Ticketing System

#### Tickets Table
```sql
CREATE TABLE tickets (
  ticket_id SERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
  channel_id BIGINT UNIQUE NOT NULL,
  creator_user BIGINT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  subject VARCHAR(100),
  description TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'waiting', 'closed', 'archived')),
  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 4), -- 1=urgent, 4=low
  assigned_to BIGINT[],
  department VARCHAR(50),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}',
  transcript_url TEXT,
  closed_reason TEXT,
  closed_by BIGINT,
  closed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tickets_guild_status ON tickets(guild_id, status);
CREATE INDEX idx_tickets_creator ON tickets(creator_user);
CREATE INDEX idx_tickets_assigned ON tickets USING GIN(assigned_to);
CREATE INDEX idx_tickets_category ON tickets(guild_id, category);
CREATE INDEX idx_tickets_priority ON tickets(guild_id, priority, status);
CREATE INDEX idx_tickets_department ON tickets(guild_id, department) WHERE department IS NOT NULL;
```

#### Ticket Messages Table
```sql
CREATE TABLE ticket_messages (
  message_id BIGINT PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  username VARCHAR(32) NOT NULL,
  content TEXT,
  attachments JSONB DEFAULT '[]',
  message_type VARCHAR(20) DEFAULT 'message' CHECK (message_type IN ('message', 'system', 'note')),
  is_staff BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id, created_at);
CREATE INDEX idx_ticket_messages_user ON ticket_messages(user_id);
```

### Configuration & Settings

#### Guild Settings Table
```sql
CREATE TABLE guild_settings (
  guild_id BIGINT PRIMARY KEY REFERENCES guilds(guild_id) ON DELETE CASCADE,
  
  -- Moderation settings
  mod_log_channel BIGINT,
  mute_role BIGINT,
  automod_enabled BOOLEAN DEFAULT TRUE,
  automod_config JSONB DEFAULT '{}',
  
  -- Ticket settings
  ticket_category BIGINT,
  ticket_log_channel BIGINT,
  ticket_departments JSONB DEFAULT '[]',
  
  -- General settings
  prefix VARCHAR(10) DEFAULT '!',
  locale VARCHAR(10) DEFAULT 'en-US',
  timezone VARCHAR(50) DEFAULT 'UTC',
  welcome_enabled BOOLEAN DEFAULT FALSE,
  welcome_config JSONB DEFAULT '{}',
  
  -- Feature toggles
  features JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Role Permissions Table
```sql
CREATE TABLE role_permissions (
  guild_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (guild_id, role_id)
);

-- Indexes
CREATE INDEX idx_role_permissions_guild ON role_permissions(guild_id);
CREATE INDEX idx_role_permissions_perms ON role_permissions USING GIN(permissions);
```

### Audit & Logging

#### Audit Logs Table
```sql
CREATE TABLE audit_logs (
  log_id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT,
  user_id BIGINT,
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(50), -- user, role, channel, etc.
  target_id BIGINT,
  old_values JSONB,
  new_values JSONB,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes (partitioned by date for performance)
CREATE INDEX idx_audit_logs_guild_date ON audit_logs(guild_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);

-- Partition by month for better performance
CREATE TABLE audit_logs_y2025m01 PARTITION OF audit_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

#### Command Usage Table
```sql
CREATE TABLE command_usage (
  usage_id BIGSERIAL PRIMARY KEY,
  guild_id BIGINT,
  user_id BIGINT NOT NULL,
  command_name VARCHAR(100) NOT NULL,
  subcommand VARCHAR(100),
  options JSONB,
  execution_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_command_usage_guild_date ON command_usage(guild_id, created_at DESC);
CREATE INDEX idx_command_usage_user ON command_usage(user_id, created_at DESC);
CREATE INDEX idx_command_usage_command ON command_usage(command_name, created_at DESC);
CREATE INDEX idx_command_usage_success ON command_usage(success, created_at DESC);

-- Partition by month
CREATE TABLE command_usage_y2025m01 PARTITION OF command_usage
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Advanced Features

#### Automod Rules Table
```sql
CREATE TABLE automod_rules (
  rule_id SERIAL PRIMARY KEY,
  guild_id BIGINT NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL, -- profanity, spam, links, etc.
  triggers JSONB NOT NULL, -- Rule conditions
  actions JSONB NOT NULL, -- Actions to take
  exceptions JSONB DEFAULT '{}', -- Channels, roles to exclude
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 10,
  created_by BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_automod_rules_guild ON automod_rules(guild_id, enabled, priority);
CREATE INDEX idx_automod_rules_type ON automod_rules(rule_type, guild_id);
```

#### Rate Limits Table
```sql
CREATE TABLE rate_limits (
  limit_key VARCHAR(255) PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP NOT NULL DEFAULT NOW(),
  window_duration_seconds INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

-- Index for cleanup
CREATE INDEX idx_rate_limits_expires ON rate_limits(expires_at);
```

#### Scheduled Tasks Table
```sql
CREATE TABLE scheduled_tasks (
  task_id SERIAL PRIMARY KEY,
  guild_id BIGINT,
  task_type VARCHAR(50) NOT NULL, -- unmute, unban, reminder, etc.
  payload JSONB NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scheduled_tasks_due ON scheduled_tasks(scheduled_for, status) WHERE status = 'pending';
CREATE INDEX idx_scheduled_tasks_guild ON scheduled_tasks(guild_id, task_type);
```

## Data Access Layer

### TypeScript Interfaces

```typescript
// Core entities
export interface Guild {
  guildId: string;
  name: string;
  ownerId: string;
  settings: GuildSettings;
  featuresEnabled: string[];
  locale: string;
  timezone: string;
  premiumTier: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface User {
  userId: string;
  username: string;
  discriminator?: string;
  globalName?: string;
  avatarHash?: string;
  flags: Record<string, any>;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
  lastSeen: Date;
}

export interface ModerationCase {
  caseId: number;
  guildId: string;
  actionType: 'warn' | 'mute' | 'kick' | 'ban' | 'unban' | 'unmute';
  targetUser: string;
  targetUsername: string;
  moderatorUser: string;
  moderatorUsername: string;
  reason: string;
  durationSeconds?: number;
  expiresAt?: Date;
  evidence: Record<string, any>;
  metadata: Record<string, any>;
  status: 'active' | 'expired' | 'revoked' | 'appealed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Ticket {
  ticketId: number;
  guildId: string;
  channelId: string;
  creatorUser: string;
  category: string;
  subject?: string;
  description?: string;
  status: 'open' | 'claimed' | 'waiting' | 'closed' | 'archived';
  priority: 1 | 2 | 3 | 4;
  assignedTo: string[];
  department?: string;
  tags: string[];
  metadata: Record<string, any>;
  transcriptUrl?: string;
  closedReason?: string;
  closedBy?: string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Repository Pattern

```typescript
export interface Repository<T> {
  findById(id: string | number): Promise<T | null>;
  findMany(filters: Partial<T>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string | number, data: Partial<T>): Promise<T>;
  delete(id: string | number): Promise<boolean>;
}

export class ModerationCaseRepository implements Repository<ModerationCase> {
  constructor(private db: Database) {}

  async findById(caseId: number): Promise<ModerationCase | null> {
    const result = await this.db('moderation_cases')
      .where('case_id', caseId)
      .first();
    return result || null;
  }

  async findByGuild(guildId: string, filters: {
    targetUser?: string;
    actionType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ModerationCase[]> {
    let query = this.db('moderation_cases')
      .where('guild_id', guildId)
      .orderBy('created_at', 'desc');

    if (filters.targetUser) {
      query = query.where('target_user', filters.targetUser);
    }
    if (filters.actionType) {
      query = query.where('action_type', filters.actionType);
    }
    if (filters.status) {
      query = query.where('status', filters.status);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return query;
  }

  async create(data: Partial<ModerationCase>): Promise<ModerationCase> {
    const [created] = await this.db('moderation_cases')
      .insert(data)
      .returning('*');
    return created;
  }

  async getActiveTemporaryActions(): Promise<ModerationCase[]> {
    return this.db('moderation_cases')
      .where('status', 'active')
      .whereNotNull('expires_at')
      .where('expires_at', '<=', new Date())
      .whereIn('action_type', ['mute', 'ban']);
  }
}
```

## Data Migration Strategy

### Initial Migration
```sql
-- migrations/001_initial_schema.sql
BEGIN;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create tables (as defined above)
-- ... table definitions ...

-- Create functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_guilds_updated_at 
  BEFORE UPDATE ON guilds 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... more triggers ...

COMMIT;
```

### Data Seeding
```typescript
// seeds/development.ts
export async function seed(knex: Knex): Promise<void> {
  // Clear existing data
  await knex('guild_members').del();
  await knex('guilds').del();
  await knex('users').del();

  // Seed test data
  await knex('users').insert([
    {
      user_id: '123456789012345678',
      username: 'testuser',
      global_name: 'Test User',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  await knex('guilds').insert([
    {
      guild_id: '987654321098765432',
      name: 'Test Guild',
      owner_id: '123456789012345678',
      settings: JSON.stringify({
        prefix: '!',
        modLogChannel: null
      }),
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}
```

## Performance Optimization

### Database Optimization
- **Indexing Strategy**: Compound indexes for common query patterns
- **Partitioning**: Time-based partitioning for high-volume tables
- **Connection Pooling**: Proper connection management
- **Query Optimization**: Use EXPLAIN ANALYZE for slow queries

### Caching Strategy
```typescript
// Redis caching layer
export class CacheService {
  constructor(private redis: Redis) {}

  async getCachedGuildSettings(guildId: string): Promise<GuildSettings | null> {
    const cached = await this.redis.get(`guild:${guildId}:settings`);
    return cached ? JSON.parse(cached) : null;
  }

  async setCachedGuildSettings(guildId: string, settings: GuildSettings): Promise<void> {
    await this.redis.setex(
      `guild:${guildId}:settings`, 
      300, // 5 minutes
      JSON.stringify(settings)
    );
  }

  async invalidateGuildCache(guildId: string): Promise<void> {
    const pattern = `guild:${guildId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

This comprehensive data model provides a solid foundation for the Aegis Discord bot, with proper normalization, indexing, and scalability considerations.
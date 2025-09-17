import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create guilds table
  await knex.schema.createTable('guilds', (table) => {
    table.bigInteger('guild_id').primary();
    table.string('name', 100).notNullable();
    table.bigInteger('owner_id').notNullable();
    table.jsonb('settings').defaultTo('{}');
    table.specificType('features_enabled', 'text[]').defaultTo('{}');
    table.string('locale', 10).defaultTo('en-US');
    table.string('timezone', 50).defaultTo('UTC');
    table.integer('premium_tier').defaultTo(0);
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    table.index(['owner_id']);
    table.index(['created_at']);
    table.index('features_enabled', 'idx_guilds_features', 'GIN');
    table.index('settings', 'idx_guilds_settings', 'GIN');
  });

  // Create users table
  await knex.schema.createTable('users', (table) => {
    table.bigInteger('user_id').primary();
    table.string('username', 32).notNullable();
    table.string('discriminator', 4).nullable();
    table.string('global_name', 32).nullable();
    table.string('avatar_hash', 32).nullable();
    table.jsonb('flags').defaultTo('{}');
    table.jsonb('preferences').defaultTo('{}');
    table.timestamps(true, true);
    table.timestamp('last_seen').defaultTo(knex.fn.now());
    
    table.index([knex.raw('LOWER(username)')]);
    table.index(['last_seen']);
    table.index('flags', 'idx_users_flags', 'GIN');
  });

  // Create guild_members table
  await knex.schema.createTable('guild_members', (table) => {
    table.bigInteger('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.bigInteger('user_id').references('user_id').inTable('users').onDelete('CASCADE');
    table.string('nickname', 32).nullable();
    table.specificType('roles', 'bigint[]').defaultTo('{}');
    table.timestamp('joined_at').notNullable();
    table.timestamp('premium_since').nullable();
    table.jsonb('permissions').defaultTo('{}');
    table.jsonb('flags').defaultTo('{}');
    table.timestamps(true, true);
    
    table.primary(['guild_id', 'user_id']);
    table.index(['guild_id', 'joined_at']);
    table.index('roles', 'idx_guild_members_roles', 'GIN');
    table.index('permissions', 'idx_guild_members_permissions', 'GIN');
  });

  // Create moderation_cases table
  await knex.schema.createTable('moderation_cases', (table) => {
    table.increments('case_id').primary();
    table.bigInteger('guild_id').notNullable().references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.string('action_type', 20).notNullable().checkIn(['warn', 'mute', 'kick', 'ban', 'unban', 'unmute']);
    table.bigInteger('target_user').notNullable();
    table.string('target_username', 32).notNullable();
    table.bigInteger('moderator_user').notNullable();
    table.string('moderator_username', 32).notNullable();
    table.text('reason').notNullable();
    table.integer('duration_seconds').nullable();
    table.timestamp('expires_at').nullable();
    table.jsonb('evidence').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');
    table.string('status', 20).defaultTo('active').checkIn(['active', 'expired', 'revoked', 'appealed']);
    table.timestamps(true, true);
    
    table.index(['guild_id', 'created_at']);
    table.index(['target_user', 'guild_id']);
    table.index(['moderator_user', 'guild_id']);
    table.index(['action_type', 'guild_id']);
    table.index(['status', 'expires_at'], 'idx_mod_cases_status');
    table.index(['expires_at'], 'idx_mod_cases_expires');
  });

  // Create tickets table
  await knex.schema.createTable('tickets', (table) => {
    table.increments('ticket_id').primary();
    table.bigInteger('guild_id').notNullable().references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.bigInteger('channel_id').unique().notNullable();
    table.bigInteger('creator_user').notNullable();
    table.string('category', 50).notNullable().defaultTo('general');
    table.string('subject', 100).nullable();
    table.text('description').nullable();
    table.string('status', 20).defaultTo('open').checkIn(['open', 'claimed', 'waiting', 'closed', 'archived']);
    table.integer('priority').defaultTo(2).checkBetween([1, 4]);
    table.specificType('assigned_to', 'bigint[]').defaultTo('{}');
    table.string('department', 50).nullable();
    table.specificType('tags', 'text[]').defaultTo('{}');
    table.jsonb('metadata').defaultTo('{}');
    table.text('transcript_url').nullable();
    table.text('closed_reason').nullable();
    table.bigInteger('closed_by').nullable();
    table.timestamp('closed_at').nullable();
    table.timestamps(true, true);
    
    table.index(['guild_id', 'status']);
    table.index(['creator_user']);
    table.index('assigned_to', 'idx_tickets_assigned', 'GIN');
    table.index(['guild_id', 'category']);
    table.index(['guild_id', 'priority', 'status']);
    table.index(['guild_id', 'department']);
  });

  // Create audit_logs table
  await knex.schema.createTable('audit_logs', (table) => {
    table.bigIncrements('log_id').primary();
    table.bigInteger('guild_id').nullable();
    table.bigInteger('user_id').nullable();
    table.string('action', 50).notNullable();
    table.string('target_type', 50).nullable();
    table.bigInteger('target_id').nullable();
    table.jsonb('old_values').nullable();
    table.jsonb('new_values').nullable();
    table.text('reason').nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.specificType('ip_address', 'inet').nullable();
    table.text('user_agent').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['guild_id', 'created_at']);
    table.index(['user_id', 'created_at']);
    table.index(['action', 'created_at']);
    table.index(['target_type', 'target_id']);
  });

  // Create command_usage table
  await knex.schema.createTable('command_usage', (table) => {
    table.bigIncrements('usage_id').primary();
    table.bigInteger('guild_id').nullable();
    table.bigInteger('user_id').notNullable();
    table.string('command_name', 100).notNullable();
    table.string('subcommand', 100).nullable();
    table.jsonb('options').nullable();
    table.integer('execution_time_ms').nullable();
    table.boolean('success').notNullable();
    table.text('error_message').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['guild_id', 'created_at']);
    table.index(['user_id', 'created_at']);
    table.index(['command_name', 'created_at']);
    table.index(['success', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('command_usage');
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('tickets');
  await knex.schema.dropTableIfExists('moderation_cases');
  await knex.schema.dropTableIfExists('guild_members');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('guilds');
}
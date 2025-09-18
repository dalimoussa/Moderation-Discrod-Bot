const { Knex } = require('knex');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create guilds table
  await knex.schema.createTable('guilds', (table) => {
    table.bigInteger('guild_id').primary();
    table.string('name', 100).notNullable();
    table.bigInteger('owner_id').notNullable();
    table.jsonb('settings').defaultTo('{}');
    table.specificType('features_enabled', 'text[]').defaultTo('{}');
    table.integer('member_count').defaultTo(0);
    table.string('prefix', 10).defaultTo('!');
    table.string('locale', 10).defaultTo('en');
    table.string('timezone', 50).defaultTo('UTC');
    table.boolean('premium').defaultTo(false);
    table.timestamp('premium_expires_at').nullable();
    table.timestamps(true, true);
    
    table.index(['owner_id']);
    table.index(['premium']);
  });

  // Create users table
  await knex.schema.createTable('users', (table) => {
    table.bigInteger('user_id').primary();
    table.string('username', 32).notNullable();
    table.string('discriminator', 4).notNullable();
    table.string('avatar_hash', 255).nullable();
    table.jsonb('preferences').defaultTo('{}');
    table.boolean('premium').defaultTo(false);
    table.timestamp('premium_expires_at').nullable();
    table.timestamps(true, true);
    
    table.index(['username']);
    table.index(['premium']);
  });

  // Create guild_members table
  await knex.schema.createTable('guild_members', (table) => {
    table.bigInteger('guild_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.timestamp('joined_at').notNullable();
    table.timestamp('left_at').nullable();
    table.specificType('roles', 'text[]').defaultTo('{}');
    table.jsonb('permissions').defaultTo('{}');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    
    table.primary(['guild_id', 'user_id']);
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.foreign('user_id').references('user_id').inTable('users').onDelete('CASCADE');
    table.index(['joined_at']);
    table.index(['is_active']);
  });

  // Create moderation_logs table
  await knex.schema.createTable('moderation_logs', (table) => {
    table.increments('id').primary();
    table.bigInteger('guild_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.bigInteger('moderator_id').notNullable();
    table.string('action', 50).notNullable(); // ban, kick, warn, mute, etc.
    table.text('reason').nullable();
    table.timestamp('expires_at').nullable();
    table.boolean('is_active').defaultTo(true);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamps(true, true);
    
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.foreign('user_id').references('user_id').inTable('users').onDelete('CASCADE');
    table.foreign('moderator_id').references('user_id').inTable('users').onDelete('CASCADE');
    table.index(['guild_id', 'user_id']);
    table.index(['action']);
    table.index(['is_active']);
    table.index(['expires_at']);
  });

  // Create command_usage table
  await knex.schema.createTable('command_usage', (table) => {
    table.increments('id').primary();
    table.bigInteger('guild_id').nullable();
    table.bigInteger('user_id').notNullable();
    table.string('command_name', 100).notNullable();
    table.boolean('success').defaultTo(true);
    table.integer('execution_time_ms').nullable();
    table.text('error_message').nullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('executed_at').defaultTo(knex.fn.now());
    
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.foreign('user_id').references('user_id').inTable('users').onDelete('CASCADE');
    table.index(['guild_id', 'command_name']);
    table.index(['user_id', 'command_name']);
    table.index(['executed_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('command_usage');
  await knex.schema.dropTableIfExists('moderation_logs');
  await knex.schema.dropTableIfExists('guild_members');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('guilds');
};
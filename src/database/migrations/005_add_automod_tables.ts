import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if automod_config table exists, if not create it
  const hasAutomodConfig = await knex.schema.hasTable('automod_config');
  if (!hasAutomodConfig) {
    await knex.schema.createTable('automod_config', (table) => {
      table.string('guild_id').primary();
      table.boolean('enabled').defaultTo(false);
      table.jsonb('filters').defaultTo('{}'); // profanity, spam, links, invites, etc.
      table.jsonb('thresholds').defaultTo('{}'); // Rate limits, similarity scores
      table.jsonb('exemptions').defaultTo('{}'); // Exempt roles/channels
      table.jsonb('actions').defaultTo('{}'); // What to do when triggered
      table.string('log_channel_id').nullable();
      table.timestamps(true, true);
    });
  }

  // Check if automod_violations table exists, if not create it
  const hasAutomodViolations = await knex.schema.hasTable('automod_violations');
  if (!hasAutomodViolations) {
    await knex.schema.createTable('automod_violations', (table) => {
      table.increments('id').primary();
      table.string('guild_id').notNullable();
      table.string('user_id').notNullable();
      table.string('channel_id').notNullable();
      table.string('message_id').nullable();
      table.enum('violation_type', ['profanity', 'spam', 'links', 'invites', 'caps', 'mentions', 'similarity']).notNullable();
      table.text('content').nullable(); // Original message content
      table.jsonb('metadata').defaultTo('{}'); // Additional violation data
      table.enum('action_taken', ['delete', 'warn', 'timeout', 'kick', 'ban', 'none']).notNullable();
      table.timestamps(true, true);
      
      table.index(['guild_id', 'user_id']);
      table.index(['guild_id', 'violation_type']);
      table.index(['created_at']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('automod_violations');
  await knex.schema.dropTableIfExists('automod_config');
}
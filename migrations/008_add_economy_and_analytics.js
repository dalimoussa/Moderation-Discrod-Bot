/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create user_economy table
  await knex.schema.createTable('user_economy', (table) => {
    table.bigInteger('guild_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.bigInteger('balance').defaultTo(0);
    table.bigInteger('bank').defaultTo(0);
    table.timestamp('last_daily').nullable();
    table.timestamp('last_weekly').nullable();
    table.integer('daily_streak').defaultTo(0);
    table.timestamps(true, true);
    
    table.primary(['guild_id', 'user_id']);
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.foreign('user_id').references('user_id').inTable('users').onDelete('CASCADE');
    table.index(['guild_id', 'balance']);
  });

  // Create guild_analytics table
  await knex.schema.createTable('guild_analytics', (table) => {
    table.increments('id').primary();
    table.bigInteger('guild_id').notNullable();
    table.date('date').notNullable();
    table.integer('member_count').defaultTo(0);
    table.integer('messages_sent').defaultTo(0);
    table.integer('commands_used').defaultTo(0);
    table.integer('new_members').defaultTo(0);
    table.integer('members_left').defaultTo(0);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('recorded_at').defaultTo(knex.fn.now());
    
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.unique(['guild_id', 'date']);
    table.index(['guild_id', 'date']);
  });

  // Create user_analytics table
  await knex.schema.createTable('user_analytics', (table) => {
    table.increments('id').primary();
    table.bigInteger('guild_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.date('date').notNullable();
    table.integer('messages_sent').defaultTo(0);
    table.integer('commands_used').defaultTo(0);
    table.integer('voice_minutes').defaultTo(0);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('recorded_at').defaultTo(knex.fn.now());
    
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.foreign('user_id').references('user_id').inTable('users').onDelete('CASCADE');
    table.unique(['guild_id', 'user_id', 'date']);
    table.index(['guild_id', 'user_id', 'date']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_analytics');
  await knex.schema.dropTableIfExists('guild_analytics');
  await knex.schema.dropTableIfExists('user_economy');
};
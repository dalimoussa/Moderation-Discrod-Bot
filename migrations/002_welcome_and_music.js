/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create welcome_settings table
  await knex.schema.createTable('welcome_settings', (table) => {
    table.bigInteger('guild_id').primary();
    table.bigInteger('channel_id').nullable();
    table.text('welcome_message').defaultTo('Welcome to the server, {user}!');
    table.bigInteger('welcome_role_id').nullable();
    table.boolean('enabled').defaultTo(false);
    table.timestamps(true, true);
    
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
  });

  // Create music_queues table
  await knex.schema.createTable('music_queues', (table) => {
    table.increments('id').primary();
    table.bigInteger('guild_id').notNullable();
    table.string('url', 500).notNullable();
    table.string('title', 200).notNullable();
    table.integer('duration').nullable();
    table.bigInteger('requested_by').notNullable();
    table.integer('position').notNullable();
    table.timestamp('added_at').defaultTo(knex.fn.now());
    
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.foreign('requested_by').references('user_id').inTable('users').onDelete('CASCADE');
    table.index(['guild_id', 'position']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('music_queues');
  await knex.schema.dropTableIfExists('welcome_settings');
};
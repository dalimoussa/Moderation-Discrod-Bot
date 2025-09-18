/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create automod_rules table
  await knex.schema.createTable('automod_rules', (table) => {
    table.increments('id').primary();
    table.bigInteger('guild_id').notNullable();
    table.string('rule_type', 50).notNullable(); // spam, caps, links, etc.
    table.boolean('enabled').defaultTo(true);
    table.jsonb('settings').defaultTo('{}');
    table.string('action', 50).defaultTo('warn'); // warn, mute, kick, ban
    table.integer('threshold').defaultTo(3);
    table.timestamps(true, true);
    
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.index(['guild_id', 'rule_type']);
    table.index(['enabled']);
  });

  // Create automod_violations table
  await knex.schema.createTable('automod_violations', (table) => {
    table.increments('id').primary();
    table.bigInteger('guild_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.integer('rule_id').notNullable();
    table.text('content').nullable();
    table.string('action_taken', 50).nullable();
    table.timestamp('violated_at').defaultTo(knex.fn.now());
    
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.foreign('user_id').references('user_id').inTable('users').onDelete('CASCADE');
    table.foreign('rule_id').references('id').inTable('automod_rules').onDelete('CASCADE');
    table.index(['guild_id', 'user_id']);
    table.index(['violated_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('automod_violations');
  await knex.schema.dropTableIfExists('automod_rules');
};
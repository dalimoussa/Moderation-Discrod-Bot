/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create user_levels table for leveling system
  await knex.schema.createTable('user_levels', (table) => {
    table.bigInteger('guild_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.integer('level').defaultTo(1);
    table.bigInteger('xp').defaultTo(0);
    table.bigInteger('total_xp').defaultTo(0);
    table.timestamp('last_message_at').nullable();
    table.timestamps(true, true);
    
    table.primary(['guild_id', 'user_id']);
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.foreign('user_id').references('user_id').inTable('users').onDelete('CASCADE');
    table.index(['guild_id', 'level']);
    table.index(['guild_id', 'total_xp']);
  });

  // Create level_roles table for role rewards
  await knex.schema.createTable('level_roles', (table) => {
    table.increments('id').primary();
    table.bigInteger('guild_id').notNullable();
    table.integer('required_level').notNullable();
    table.bigInteger('role_id').notNullable();
    table.timestamps(true, true);
    
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.unique(['guild_id', 'required_level']);
    table.index(['guild_id', 'required_level']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('level_roles');
  await knex.schema.dropTableIfExists('user_levels');
};
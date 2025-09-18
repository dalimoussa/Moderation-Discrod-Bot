/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create ticket_categories table
  await knex.schema.createTable('ticket_categories', (table) => {
    table.increments('id').primary();
    table.bigInteger('guild_id').notNullable();
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.bigInteger('category_id').nullable(); // Discord category ID
    table.specificType('support_roles', 'text[]').defaultTo('{}');
    table.boolean('enabled').defaultTo(true);
    table.timestamps(true, true);
    
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.index(['guild_id', 'enabled']);
  });

  // Create tickets table
  await knex.schema.createTable('tickets', (table) => {
    table.increments('id').primary();
    table.bigInteger('guild_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.integer('category_id').nullable();
    table.bigInteger('channel_id').notNullable();
    table.string('subject', 200).notNullable();
    table.string('status', 20).defaultTo('open'); // open, closed, archived
    table.bigInteger('closed_by').nullable();
    table.text('close_reason').nullable();
    table.timestamp('closed_at').nullable();
    table.timestamps(true, true);
    
    table.foreign('guild_id').references('guild_id').inTable('guilds').onDelete('CASCADE');
    table.foreign('user_id').references('user_id').inTable('users').onDelete('CASCADE');
    table.foreign('category_id').references('id').inTable('ticket_categories').onDelete('SET NULL');
    table.foreign('closed_by').references('user_id').inTable('users').onDelete('SET NULL');
    table.index(['guild_id', 'status']);
    table.index(['user_id', 'status']);
  });

  // Create ticket_messages table
  await knex.schema.createTable('ticket_messages', (table) => {
    table.increments('id').primary();
    table.integer('ticket_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.bigInteger('message_id').notNullable();
    table.text('content').nullable();
    table.jsonb('attachments').defaultTo('[]');
    table.timestamp('sent_at').defaultTo(knex.fn.now());
    
    table.foreign('ticket_id').references('id').inTable('tickets').onDelete('CASCADE');
    table.foreign('user_id').references('user_id').inTable('users').onDelete('CASCADE');
    table.index(['ticket_id', 'sent_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('ticket_messages');
  await knex.schema.dropTableIfExists('tickets');
  await knex.schema.dropTableIfExists('ticket_categories');
};
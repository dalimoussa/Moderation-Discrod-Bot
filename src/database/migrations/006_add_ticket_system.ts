import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if ticket_categories table exists, if not create it
  const hasTicketCategories = await knex.schema.hasTable('ticket_categories');
  if (!hasTicketCategories) {
    await knex.schema.createTable('ticket_categories', (table) => {
      table.increments('id').primary();
      table.string('guild_id').notNullable();
      table.string('name', 50).notNullable();
      table.text('description').nullable();
      table.string('emoji').nullable();
      table.specificType('staff_roles', 'text[]').defaultTo('{}');
      table.integer('max_open_per_user').defaultTo(1);
      table.boolean('require_reason').defaultTo(false);
      table.jsonb('auto_responses').defaultTo('{}');
      table.timestamps(true, true);
      
      table.index(['guild_id']);
    });
  }

  // Check if tickets table exists, if not create it
  const hasTickets = await knex.schema.hasTable('tickets');
  if (!hasTickets) {
    await knex.schema.createTable('tickets', (table) => {
      table.increments('id').primary();
      table.string('guild_id').notNullable();
      table.string('channel_id').notNullable();
      table.string('creator_id').notNullable();
      table.string('assigned_to').nullable();
      table.integer('category_id').references('id').inTable('ticket_categories').onDelete('SET NULL');
      table.enum('status', ['open', 'claimed', 'closed']).defaultTo('open');
      table.enum('priority', ['low', 'normal', 'high', 'urgent']).defaultTo('normal');
      table.text('reason').nullable();
      table.text('resolution').nullable();
      table.timestamp('closed_at').nullable();
      table.string('closed_by').nullable();
      table.timestamps(true, true);
      
      table.index(['guild_id', 'status']);
      table.index(['creator_id']);
      table.index(['assigned_to']);
    });
  }

  // Check if appeals table exists, if not create it
  const hasAppeals = await knex.schema.hasTable('appeals');
  if (!hasAppeals) {
    await knex.schema.createTable('appeals', (table) => {
      table.increments('id').primary();
      table.string('guild_id').notNullable();
      table.integer('case_id').references('case_id').inTable('moderation_cases').onDelete('CASCADE');
      table.string('user_id').notNullable();
      table.text('reason').notNullable();
      table.enum('status', ['pending', 'approved', 'denied']).defaultTo('pending');
      table.text('review_notes').nullable();
      table.string('reviewed_by').nullable();
      table.timestamp('reviewed_at').nullable();
      table.timestamps(true, true);
      
      table.index(['guild_id', 'status']);
      table.index(['user_id']);
      table.index(['case_id']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('appeals');
  await knex.schema.dropTableIfExists('tickets');
  await knex.schema.dropTableIfExists('ticket_categories');
}
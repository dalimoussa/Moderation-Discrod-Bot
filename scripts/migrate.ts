#!/usr/bin/env tsx
import knex from 'knex';
import * as config from '../knexfile';

async function runMigrations() {
  const environment = process.env.NODE_ENV || 'development';
  const knexConfig = (config as any)[environment];
  
  if (!knexConfig) {
    throw new Error(`No knex configuration found for environment: ${environment}`);
  }

  const db = knex(knexConfig);
  
  try {
    console.log('Running database migrations...');
    const [batchNo, migrations] = await db.migrate.latest();
    
    if (migrations.length === 0) {
      console.log('Database is already up to date');
    } else {
      console.log(`Batch ${batchNo} ran ${migrations.length} migrations:`);
      migrations.forEach((migration: string) => console.log(`- ${migration}`));
    }
    
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigrations();

if (require.main === module) {
  runMigrations();
}
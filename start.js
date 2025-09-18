#!/usr/bin/env node

// Bootstrap script that sets up tsconfig-paths and starts the bot
// This ensures proper path resolution in production

const path = require('path');
const fs = require('fs');

// Add comprehensive error handling
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error.message);
  console.error('📍 Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION at:', promise);
  console.error('📍 Reason:', reason);
  process.exit(1);
});

// Check if tsconfig.json exists
const tsconfigPath = path.join(__dirname, 'tsconfig.json');
if (!fs.existsSync(tsconfigPath)) {
  console.error('❌ tsconfig.json not found at:', tsconfigPath);
  console.error('📁 Available files:', fs.readdirSync(__dirname));
  process.exit(1);
}

console.log('✅ Found tsconfig.json, setting up path resolution...');

// Register tsconfig-paths
require('tsconfig-paths/register');

console.log('✅ Path resolution configured, starting bot...');

// Check environment variables
console.log('🔍 Environment check:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'undefined');
console.log('  DISCORD_TOKEN:', process.env.DISCORD_TOKEN ? '✅ Present' : '❌ Missing');
console.log('  DATABASE_URL:', process.env.DATABASE_URL ? '✅ Present' : '❌ Missing');
console.log('  REDIS_URL:', process.env.REDIS_URL ? '✅ Present' : '⚠️ Missing (optional)');

// Start the actual bot with explicit error catching
try {
  console.log('🚀 Loading bot application...');
  require('./dist/index.js');
} catch (error) {
  console.error('💥 ERROR loading bot:', error.message);
  console.error('📍 Stack:', error.stack);
  process.exit(1);
}
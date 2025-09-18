#!/usr/bin/env node

// Bootstrap script that sets up tsconfig-paths and starts the bot
// This ensures proper path resolution in production

const path = require('path');
const fs = require('fs');

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

// Start the actual bot
require('./dist/index.js');
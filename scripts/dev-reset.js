#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔄 Resetting development environment...\n');

// Function to execute commands and log output
function runCommand(command, description) {
  console.log(`⏳ ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ Error in ${description}:`, error.message);
    process.exit(1);
  }
}

// Clean dist directory
if (fs.existsSync('dist')) {
  console.log('🗑️  Cleaning dist directory...');
  fs.rmSync('dist', { recursive: true, force: true });
  console.log('✅ Dist directory cleaned\n');
}

// Clean node_modules/.cache
const cacheDir = path.join('node_modules', '.cache');
if (fs.existsSync(cacheDir)) {
  console.log('🗑️  Cleaning node_modules/.cache...');
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('✅ Cache directory cleaned\n');
}

// Clean Vite cache
const viteCacheDir = path.join('node_modules', '.vite');
if (fs.existsSync(viteCacheDir)) {
  console.log('🗑️  Cleaning Vite cache...');
  fs.rmSync(viteCacheDir, { recursive: true, force: true });
  console.log('✅ Vite cache cleaned\n');
}

// Reinstall dependencies (optional - uncomment if needed)
// runCommand('npm install', 'Reinstalling dependencies');

// Start development server
console.log('🚀 Starting development server...');
console.log('💡 Tips:');
console.log('   - Use Ctrl+C to stop the server');
console.log('   - Open your browser with DevTools (F12) to check for errors');
console.log('   - Use Ctrl+Shift+R (or Cmd+Shift+R on Mac) for hard refresh if needed\n');

try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start development server:', error.message);
  process.exit(1);
}
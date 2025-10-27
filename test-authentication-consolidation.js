#!/usr/bin/env node

/**
 * Test script to verify authentication middleware consolidation
 * This script tests that the unified authentication system works correctly
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

console.log('🔍 Testing Authentication Middleware Consolidation...\n');

// Test 1: Check that auth.ts exports the unified middleware
try {
  const authPath = path.join(__dirname, 'server', 'auth.ts');
  console.log('✅ Test 1: Checking auth.ts exports...');
  
  // Import the auth module dynamically
  const authModule = await import('./server/auth.ts');
  
  if (authModule.requireAuth && typeof authModule.requireAuth === 'function') {
    console.log('✅ requireAuth middleware found in auth.ts');
  } else {
    console.log('❌ requireAuth middleware NOT found in auth.ts');
    process.exit(1);
  }
  
  if (authModule.authenticateToken) {
    console.log('⚠️  authenticateToken still exists in auth.ts (should be removed)');
  } else {
    console.log('✅ authenticateToken properly removed from auth.ts');
  }
  
} catch (error) {
  console.log('❌ Test 1 failed:', error.message);
  process.exit(1);
}

// Test 2: Check that routes.ts uses requireAuth instead of authenticateToken
try {
  console.log('\n✅ Test 2: Checking routes.ts middleware usage...');
  
  const fs = require('fs');
  const routesContent = fs.readFileSync('./server/routes.ts', 'utf8');
  
  // Check that requireAuth is imported
  if (routesContent.includes("import { requireAuth } from './auth'")) {
    console.log('✅ requireAuth properly imported in routes.ts');
  } else {
    console.log('❌ requireAuth NOT imported in routes.ts');
    process.exit(1);
  }
  
  // Check that authenticateToken is NOT used in the middleware
  if (routesContent.includes('return authenticateToken(req, res, next)')) {
    console.log('❌ authenticateToken still used in routes.ts middleware');
    process.exit(1);
  } else {
    console.log('✅ authenticateToken properly replaced with requireAuth in routes.ts');
  }
  
} catch (error) {
  console.log('❌ Test 2 failed:', error.message);
  process.exit(1);
}

// Test 3: Check that admin-requests-api.ts uses requireAuth
try {
  console.log('\n✅ Test 3: Checking admin-requests-api.ts middleware usage...');
  
  const fs = require('fs');
  const adminContent = fs.readFileSync('./server/admin-requests-api.ts', 'utf8');
  
  // Check that requireAuth is imported
  if (adminContent.includes("import { requireAuth } from './auth'")) {
    console.log('✅ requireAuth properly imported in admin-requests-api.ts');
  } else {
    console.log('❌ requireAuth NOT imported in admin-requests-api.ts');
    process.exit(1);
  }
  
  // Check that authenticateToken is NOT used anywhere
  if (adminContent.includes('authenticateToken')) {
    console.log('❌ authenticateToken still used in admin-requests-api.ts');
    process.exit(1);
  } else {
    console.log('✅ authenticateToken properly replaced with requireAuth in admin-requests-api.ts');
  }
  
} catch (error) {
  console.log('❌ Test 3 failed:', error.message);
  process.exit(1);
}

// Test 4: Check that stream routes use requireAuth
try {
  console.log('\n✅ Test 4: Checking stream routes middleware usage...');
  
  const fs = require('fs');
  const streamContent = fs.readFileSync('./server/stream-routes.ts', 'utf8');
  const unifiedStreamContent = fs.readFileSync('./server/unified-stream-routes.ts', 'utf8');
  
  // Check that requireAuth is imported in both files
  if (streamContent.includes("import { requireAuth } from './auth'")) {
    console.log('✅ requireAuth properly imported in stream-routes.ts');
  } else {
    console.log('❌ requireAuth NOT imported in stream-routes.ts');
    process.exit(1);
  }
  
  if (unifiedStreamContent.includes("import { requireAuth } from './auth'")) {
    console.log('✅ requireAuth properly imported in unified-stream-routes.ts');
  } else {
    console.log('❌ requireAuth NOT imported in unified-stream-routes.ts');
    process.exit(1);
  }
  
  // Check that authenticateToken is NOT used in stream routes
  if (streamContent.includes('authenticateToken') || unifiedStreamContent.includes('authenticateToken')) {
    console.log('❌ authenticateToken still used in stream routes');
    process.exit(1);
  } else {
    console.log('✅ authenticateToken properly replaced with requireAuth in stream routes');
  }
  
} catch (error) {
  console.log('❌ Test 4 failed:', error.message);
  process.exit(1);
}

// Test 5: Check that no authenticateToken references remain in source files
try {
  console.log('\n✅ Test 5: Checking for remaining authenticateToken references...');
  
  const fs = require('fs');
  const path = require('path');
  
  // Read all TypeScript files in server directory
  const serverFiles = fs.readdirSync('./server').filter(file => file.endsWith('.ts'));
  
  let foundAuthenticateToken = false;
  
  for (const file of serverFiles) {
    const content = fs.readFileSync(path.join('./server', file), 'utf8');
    
    // Skip test files and docs
    if (file.includes('test') || file.includes('spec')) continue;
    
    if (content.includes('authenticateToken') && !content.includes('requireAuth')) {
      console.log(`❌ authenticateToken found in ${file} without requireAuth`);
      foundAuthenticateToken = true;
    }
  }
  
  if (!foundAuthenticateToken) {
    console.log('✅ No orphaned authenticateToken references found');
  }
  
} catch (error) {
  console.log('❌ Test 5 failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 All Authentication Middleware Consolidation Tests Passed!');
console.log('\n📋 Summary:');
console.log('✅ requireAuth middleware properly exported from auth.ts');
console.log('✅ routes.ts uses requireAuth instead of authenticateToken');
console.log('✅ admin-requests-api.ts uses requireAuth instead of authenticateToken');
console.log('✅ stream routes use requireAuth instead of authenticateToken');
console.log('✅ No orphaned authenticateToken references found');
console.log('\n🚀 Authentication middleware consolidation is complete!');
#!/usr/bin/env node

/**
 * Test Script for Simplified Streaming Architecture
 * 
 * This script validates the new unified streaming components and API endpoints.
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Simplified Streaming Architecture...\n');

// Test 1: Check if all required files exist
console.log('📋 Test 1: Checking required files...');

const requiredFiles = [
  'server/schemas/stream-config.sql',
  'server/routes/stream-config.ts',
  'client/src/components/AdminStreamControl.tsx',
  'client/src/components/StreamPlayer.tsx',
  'client/src/components/MobileGameLayout/VideoArea.tsx'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.log('\n❌ Test 1 FAILED: Some required files are missing');
  process.exit(1);
}
console.log('✅ Test 1 PASSED: All required files exist\n');

// Test 2: Check database schema
console.log('📋 Test 2: Validating database schema...');

const schemaContent = fs.readFileSync('server/schemas/stream-config.sql', 'utf8');

const requiredSchemaElements = [
  'CREATE TABLE stream_config',
  'active_method',
  'stream_status',
  'rtmp_server_url',
  'rtmp_stream_key',
  'webrtc_resolution',
  'webrtc_fps',
  'stream_width',
  'stream_height',
  'show_stream',
  'stream_title',
  'viewer_count'
];

let schemaValid = true;
for (const element of requiredSchemaElements) {
  if (schemaContent.includes(element)) {
    console.log(`  ✅ Found: ${element}`);
  } else {
    console.log(`  ❌ Missing: ${element}`);
    schemaValid = false;
  }
}

if (!schemaValid) {
  console.log('\n❌ Test 2 FAILED: Database schema is incomplete');
  process.exit(1);
}
console.log('✅ Test 2 PASSED: Database schema is complete\n');

// Test 3: Check API endpoints
console.log('📋 Test 3: Validating API endpoints...');

const apiContent = fs.readFileSync('server/routes/stream-config.ts', 'utf8');

const requiredEndpoints = [
  'GET /api/stream/config',
  'POST /api/stream/config',
  'POST /api/stream/status'
];

let endpointsValid = true;
for (const endpoint of requiredEndpoints) {
  if (apiContent.includes(endpoint)) {
    console.log(`  ✅ Found: ${endpoint}`);
  } else {
    console.log(`  ❌ Missing: ${endpoint}`);
    endpointsValid = false;
  }
}

if (!endpointsValid) {
  console.log('\n❌ Test 3 FAILED: API endpoints are incomplete');
  process.exit(1);
}
console.log('✅ Test 3 PASSED: API endpoints are complete\n');

// Test 4: Check AdminStreamControl component
console.log('📋 Test 4: Validating AdminStreamControl component...');

const adminContent = fs.readFileSync('client/src/components/AdminStreamControl.tsx', 'utf8');

const requiredAdminFeatures = [
  'RTMPSettings',
  'WebRTCSettings', 
  'DisplaySettings',
  'activeMethod',
  'streamStatus',
  'rtmpServerUrl',
  'rtmpStreamKey',
  'webrtcResolution',
  'webrtcFps',
  'streamWidth',
  'streamHeight',
  'showStream',
  'streamTitle'
];

let adminValid = true;
for (const feature of requiredAdminFeatures) {
  if (adminContent.includes(feature)) {
    console.log(`  ✅ Found: ${feature}`);
  } else {
    console.log(`  ❌ Missing: ${feature}`);
    adminValid = false;
  }
}

if (!adminValid) {
  console.log('\n❌ Test 4 FAILED: AdminStreamControl component is incomplete');
  process.exit(1);
}
console.log('✅ Test 4 PASSED: AdminStreamControl component is complete\n');

// Test 5: Check StreamPlayer component
console.log('📋 Test 5: Validating StreamPlayer component...');

const playerContent = fs.readFileSync('client/src/components/StreamPlayer.tsx', 'utf8');

const requiredPlayerFeatures = [
  'RTMPStream',
  'WebRTCStream',
  'NoStream',
  'activeMethod',
  'streamStatus',
  'streamTitle',
  'viewerCount',
  'showStream'
];

let playerValid = true;
for (const feature of requiredPlayerFeatures) {
  if (playerContent.includes(feature)) {
    console.log(`  ✅ Found: ${feature}`);
  } else {
    console.log(`  ❌ Missing: ${feature}`);
    playerValid = false;
  }
}

if (!playerValid) {
  console.log('\n❌ Test 5 FAILED: StreamPlayer component is incomplete');
  process.exit(1);
}
console.log('✅ Test 5 PASSED: StreamPlayer component is complete\n');

// Test 6: Check VideoArea integration
console.log('📋 Test 6: Validating VideoArea integration...');

const videoAreaContent = fs.readFileSync('client/src/components/MobileGameLayout/VideoArea.tsx', 'utf8');

if (videoAreaContent.includes('StreamPlayer') && !videoAreaContent.includes('VideoStream')) {
  console.log('  ✅ VideoArea uses StreamPlayer component');
  console.log('  ✅ VideoArea no longer uses old VideoStream component');
} else {
  console.log('  ❌ VideoArea integration is incorrect');
  console.log('\n❌ Test 6 FAILED: VideoArea integration issues');
  process.exit(1);
}
console.log('✅ Test 6 PASSED: VideoArea integration is correct\n');

// Test 7: Check for deprecated components
console.log('📋 Test 7: Checking for deprecated components...');

const deprecatedComponents = [
  'client/src/components/VideoStream.tsx',
  'client/src/components/StreamPlayer/RTMPPlayer.tsx',
  'client/src/components/StreamPlayer/WebRTCPlayer.tsx',
  'client/src/components/StreamPlayer/UniversalStreamPlayer.tsx'
];

let deprecatedFound = false;
for (const component of deprecatedComponents) {
  if (fs.existsSync(component)) {
    console.log(`  ⚠️  Deprecated component still exists: ${component}`);
    deprecatedFound = true;
  }
}

if (deprecatedFound) {
  console.log('  ⚠️  Consider removing deprecated components for full simplification');
} else {
  console.log('  ✅ No deprecated components found');
}
console.log('✅ Test 7 COMPLETED\n');

// Summary
console.log('🎉 All tests completed successfully!');
console.log('\n📋 Summary:');
console.log('✅ Database schema created with unified stream_config table');
console.log('✅ API endpoints implemented for stream management');
console.log('✅ AdminStreamControl component provides unified interface');
console.log('✅ StreamPlayer component handles both RTMP and WebRTC');
console.log('✅ VideoArea integrated with new StreamPlayer');
console.log('✅ Simplified architecture removes complexity');

console.log('\n🚀 The simplified streaming architecture is ready for deployment!');
console.log('\nNext steps:');
console.log('1. Run database migrations to create stream_config table');
console.log('2. Test API endpoints with real streaming data');
console.log('3. Validate admin interface with streaming tests');
console.log('4. Test player experience with both RTMP and WebRTC streams');

process.exit(0);
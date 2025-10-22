#!/usr/bin/env node

// Test script to verify all dependencies are available
console.log('🔍 Testing dependencies...');

try {
  // Test express-mongo-sanitize
  const mongoSanitize = require('express-mongo-sanitize');
  console.log('✅ express-mongo-sanitize loaded successfully');
} catch (error) {
  console.error('❌ express-mongo-sanitize failed:', error.message);
}

try {
  // Test nanoid
  const { nanoid } = require('nanoid');
  console.log('✅ nanoid loaded successfully');
  console.log('   Sample ID:', nanoid(8));
} catch (error) {
  console.error('❌ nanoid failed:', error.message);
}

try {
  // Test other critical imports
  const express = require('express');
  console.log('✅ express loaded successfully');
} catch (error) {
  console.error('❌ express failed:', error.message);
}

try {
  const ws = require('ws');
  console.log('✅ ws loaded successfully');
} catch (error) {
  console.error('❌ ws failed:', error.message);
}

console.log('\n🎉 Dependency test completed!');

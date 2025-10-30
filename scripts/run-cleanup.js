#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';

// Run the cleanup script with automated responses
const cleanupScript = spawn('node', ['cleanup-database.js'], {
  cwd: path.resolve('./scripts'),
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send responses to the cleanup script
const responses = ['YES\n', 'DELETE\n', 'CONFIRM\n'];

let responseIndex = 0;

// Handle the script output and send responses when needed
cleanupScript.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // Look for confirmation prompts
  if (output.includes('type "YES" to continue') ||
      output.includes('Type the word "DELETE"') ||
      output.includes('Final confirmation')) {
    if (responseIndex < responses.length) {
      setTimeout(() => {
        cleanupScript.stdin.write(responses[responseIndex]);
        console.log(`Sent response: ${responses[responseIndex].trim()}`);
        responseIndex++;
      }, 100);
    }
  }
});

cleanupScript.stderr.on('data', (data) => {
  process.stderr.write(data.toString());
});

cleanupScript.on('close', (code) => {
  console.log(`\n🧹 Cleanup script completed with exit code: ${code}`);
  process.exit(code);
});

cleanupScript.on('error', (err) => {
  console.error('Failed to start cleanup script:', err);
  process.exit(1);
});

// Send the first response after a short delay
setTimeout(() => {
  cleanupScript.stdin.write(responses[responseIndex]);
  console.log(`Sent first response: ${responses[responseIndex].trim()}`);
  responseIndex++;
}, 1000);
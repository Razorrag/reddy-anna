#!/usr/bin/env node
/**
 * Additional Unused Files Deletion Script
 * 
 * Deletes additional unused files found after full directory scan.
 * Only deletes files we're 100% certain are unused.
 * 
 * Usage: node scripts/delete-additional-unused.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');
const BACKUP_DIR = path.join(__dirname, '..', '.backup-additional-unused');

// Additional files to delete - CONFIRMED UNUSED (100% confidence)
const ADDITIONAL_FILES_TO_DELETE = [
  // Test files importing deleted components
  'client/src/__tests__/streaming.test.tsx',
  
  // Empty directories (will be handled separately)
  // 'server/services/', // Empty but keep for future use
];

function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  return fs.existsSync(fullPath);
}

function deleteFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    return { success: false, error: 'File not found' };
  }
  
  try {
    if (!DRY_RUN) {
      fs.unlinkSync(fullPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function main() {
  log('\n🗑️  ADDITIONAL UNUSED FILES DELETION SCRIPT', 'magenta');
  log('==================================================\n');
  
  if (DRY_RUN) {
    log('🔍 DRY RUN MODE - No files will be deleted\n', 'yellow');
  }
  
  let deleted = 0;
  let notFound = 0;
  let errors = 0;
  
  log('🗑️  Deleting additional unused files...', 'cyan');
  
  for (const file of ADDITIONAL_FILES_TO_DELETE) {
    if (!checkFileExists(file)) {
      log(`⚠️  Not found: ${file}`, 'yellow');
      notFound++;
      continue;
    }
    
    if (DRY_RUN) {
      log(`[DRY RUN] Would delete file: ${file}`, 'yellow');
    } else {
      const result = deleteFile(file);
      if (result.success) {
        log(`✅ Deleted file: ${file}`, 'green');
        deleted++;
      } else {
        log(`❌ Error deleting ${file}: ${result.error}`, 'red');
        errors++;
      }
    }
  }
  
  log('\n==================================================', 'cyan');
  log('📊 DELETION SUMMARY', 'cyan');
  log('==================================================', 'cyan');
  log(`${DRY_RUN ? 'Would delete' : 'Deleted'}: ${deleted}`, DRY_RUN ? 'yellow' : 'green');
  log(`⚠️  Not found: ${notFound}`, 'yellow');
  log(`❌ Errors: ${errors}`, errors > 0 ? 'red' : 'green');
  log(`📁 Total processed: ${ADDITIONAL_FILES_TO_DELETE.length}`, 'cyan');
  log('\n✅ Process complete!', 'green');
}

main();

















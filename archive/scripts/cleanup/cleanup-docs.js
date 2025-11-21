#!/usr/bin/env node
/**
 * Documentation Cleanup Script
 * 
 * Consolidates and removes duplicate/obsolete documentation files.
 * Keeps only essential documentation files.
 * 
 * Usage: node scripts/cleanup-docs.js [--dry-run] [--keep-all]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DRY_RUN = process.argv.includes('--dry-run');
const KEEP_ALL = process.argv.includes('--keep-all');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const BACKUP_DIR = path.join(__dirname, '..', '.backup-docs');

// Essential documentation files to KEEP
const KEEP_FILES = [
  'README.md',
  'COMPREHENSIVE_AUTH_AND_ROUTING_ANALYSIS.md',
  'COMPREHENSIVE_CODEBASE_AUDIT.md',
  'GAME_LOGIC_VERIFICATION_REPORT.md',
  'FINAL_UNUSED_FILES_COMPLETE_LIST.md',
  'START_HERE_FINAL.md',
  'VPS_STREAMING_FIX_GUIDE.md',
  'CLEANUP_SCRIPT_USAGE.md', // Keep the cleanup guide we just created
  'ADMIN_CREDENTIALS.md', // Keep admin credentials reference
  'CLEANUP_EXECUTION_SUMMARY.md', // Keep cleanup execution summary
];

// Files that can be safely removed (duplicates/obsolete)
const REMOVE_FILES = [
  // Duplicate/obsolete audit files
  'FINAL_AUDIT_COMPLETE.md',
  'COMPLETE_LINE_BY_LINE_VERIFICATION.md',
  'COMPREHENSIVE_CODEBASE_AUDIT_FINAL.md',
  'AUDIT_COMPLETE.md',
  'AUDIT_FIXES_COMPLETE.md',
  'COMPREHENSIVE_AUDIT_AND_FIXES.md',
  'COMPREHENSIVE_AUDIT_REPORT.md',
  'COMPREHENSIVE_ERROR_HANDLING_SUMMARY.md',
  'COMPREHENSIVE_FIXES_APPLIED.md',
  'DEEP_ANALYSIS_COMPLETE.md',
  'DEEP_ANALYSIS_PART1.md',
  'DEEP_ANALYSIS_PART2.md',
  'DEEP_ANALYSIS_ROOT_CAUSE_FOUND.md',
  
  // Duplicate unused files lists
  'UNUSED_FILES_AND_COMPONENTS.md',
  'COMPLETE_UNUSED_FILES_FINAL.md',
  'COMPLETE_UNUSED_FILES_LIST.md',
  'FINAL_UNUSED_FILES_COMPLETE.md',
  'UNUSED_FILES_COMPLETE.md',
  
  // Obsolete fix documentation (all fix summaries)
  'FIXES_APPLIED.md',
  'GAME_FUNCTIONALITY_FIXES_COMPLETE.md',
  'CARD_SELECTION_FLOW_FIX.md',
  'CARD_SELECTION_FLOW_TESTING_GUIDE.md',
  'ROUTING_AND_WALLET_FIXES.md',
  'ARCHITECTURE_FIXES.md',
  'FINAL_FIXES_COMPLETE.md',
  'FINAL_FIXES_SUMMARY.md',
  'FINAL_FIX_SUMMARY.md',
  'FIXES_SUMMARY.md',
  'FIX_NOW.md',
  'FIX_SUMMARY.md',
  'QUICK_FIX_SUMMARY.md',
  'ROUTE_FIX_SUMMARY.md',
  'ROUTE_FIX_VERIFICATION.md',
  'ROUTE_HANDLING_FIX.md',
  'ALL_FIXES_COMPLETE.md',
  'ALL_BUGS_FIXED.md',
  'COMPLETE_FIXES_MASTER.md',
  'CRITICAL_FIXES_APPLIED.md',
  'CRITICAL_FIX_SESSION_AUTH.md',
  'CRITICAL_SECURITY_FIXES.md',
  'SECURITY_FIXES_SUMMARY.md',
  'FRONTEND_FIXES_APPLIED.md',
  'FRONTEND_ISSUES_AND_FIXES.md',
  'AUTHENTICATION_FIX.md',
  'AUTHENTICATION_FIXES_COMPLETE.md',
  'AUTHENTICATION_FIX_GUIDE.md',
  'AUTH_COMPLETE_FIX.md',
  'AUTH_FIX_README.md',
  'LOGIN_FIX_SUMMARY.md',
  'LOGIN_ISSUE_ANALYSIS.md',
  'LOGIN_TESTING_GUIDE.md',
  'CONNECTION_FIX.md',
  'STREAMING_SYSTEM_FIX.md',
  'USER_MANAGEMENT_FIX.md',
  'ADMIN_PANEL_CARD_SELECTION_FIX.md',
  'ADMIN_PANEL_COMPLETE_FIX.md',
  'ADMIN_PLAYER_ACCESS_FIX.md',
  'ADMIN_UI_TRANSITION_FIX.md',
  'GAME_FLOW_UI_FIX_SUMMARY.md',
  'GAME_FIXES.md',
  'API_ROUTING_FIX.md',
  'EMERGENCY_FIX_DEPLOY.md',
  
  // Obsolete implementation docs
  'GAME_FUNCTIONALITY_IMPLEMENTATION.md',
  'GAME_AUTO_RESET_FLOW.md',
  'STREAMING_IMPLEMENTATION_ANALYSIS.md',
  'STREAMING_IMPLEMENTATION_COMPLETE.md',
  'STREAMING_BOTH_LOCATIONS_COMPLETE.md',
  'DIRECT_STREAMING_IMPLEMENTATION.md',
  'DUAL_STREAMING_IMPLEMENTATION_COMPLETE.md',
  'DUAL_STREAMING_COMPLETE_GUIDE.md',
  'DUAL_STREAMING_NOW_WORKING.md',
  'DUAL_STREAMING_QUICK_START.md',
  'UNIFIED_STREAMING_IMPLEMENTATION.md',
  
  // Obsolete analysis files
  'ADMIN_AND_STREAMING_ANALYSIS.md',
  'ADMIN_PLAYER_SEPARATION.md',
  'BACKEND_CLEANUP_COMPLETE.md',
  'BACKEND_CLEANUP_NEEDED.md',
  'SYSTEM_STATUS_REPORT.md',
  'FUNCTIONALITY_VERIFICATION_REPORT.md',
  'ENDPOINT_AUTHENTICATION_ANALYSIS.md',
  'SIGNUP_SECURITY_ANALYSIS.md',
  'ERROR_ANALYSIS_AND_FIXES.md',
  'HARDCODED_VALUES_AUDIT.md',
  'CRITICAL_BACKEND_ERRORS_TO_FIX.md',
  
  // Obsolete summary/report files
  'FINAL_SUMMARY.md',
  'FINAL_VERIFICATION.md',
  'FINAL_STATUS_AND_REMAINING_WORK.md',
  'FINAL_IMPLEMENTATION_SUMMARY.md',
  'FINAL_REITERATION_REPORT.md',
  'FINAL_DEPLOYMENT_SUMMARY.md',
  'IMPLEMENTATION_SUMMARY.md',
  'CORRECTED_FUNCTIONALITY_SUMMARY.md',
  'CLEANUP_SUMMARY.md',
  'COMPREHENSIVE_ERROR_HANDLING_SUMMARY.md',
  'EVERYTHING_VERIFIED.md',
  'FINAL_VERIFICATION.md',
  
  // Obsolete deployment guides (keep only VPS_STREAMING_FIX_GUIDE.md)
  'DEPLOY_NOW.md',
  'UPDATE_VPS_NOW.md',
  'START_DEPLOYMENT_HERE.md',
  'DEPLOYMENT_CHECKLIST.md',
  'DEPLOYMENT_QUICK_CHECKLIST.md',
  'VPS_DEPLOYMENT_COMMANDS.md',
  'VPS_DEPLOYMENT_GUIDE.md',
  'VPS_DEPLOYMENT_STEPS.md',
  'VPS_TROUBLESHOOTING_GUIDE.md',
  'COMPLETE_VPS_DEPLOYMENT_GUIDE.md',
  'PRODUCTION_DEPLOYMENT_QUICK_REFERENCE.md',
  'PRODUCTION_SERVER_CONFIGURATION.md',
  'RESTART_VPS_WITH_CHANGES.md',
  
  // Obsolete start/quick start guides (keep only START_HERE_FINAL.md)
  'START_HERE.md',
  'QUICK_START.md',
  'QUICK_START_AFTER_FIXES.md',
  'README_FIRST.md',
  'QUICK_REFERENCE.md',
  
  // Obsolete testing/dev docs
  'TESTING_GUIDE.md',
  'DEVELOPMENT_NOTES.md',
  'TEMP_NOTES.md',
  'TYPESCRIPT_WARNINGS_FIXED.md',
  'test-registration-admin.md',
  
  // Obsolete feature guides (implementation plans that are done)
  'BET_MONITORING_EDITING_IMPLEMENTATION_PLAN.md',
  'BONUS_AND_REFERRAL_IMPLEMENTATION_PLAN.md',
  'USER_MANAGEMENT_IMPLEMENTATION_PLAN.md',
  'COMPLETE_ADMIN_FEATURES.md',
  'COMPLETE_NAVIGATION_GUIDE.md',
  'COMPLETE_DEEP_ANALYSIS_FINAL.md',
  
  // Obsolete specific guides (outdated)
  'LOGIN_FLOW_DIAGRAM.md',
  'DATABASE_SETUP_SUMMARY.md',
  'INSTALL_DEPENDENCIES.md',
  'SUPABASE_SETUP_GUIDE.md',
  'DIRECT_OBS_STREAMING_SETUP.md',
  'OBS_QUICK_START.md',
  'YOUTUBE_LIVE_SETUP.md',
  'WHATSAPP_WITHDRAWAL_DEPOSIT_GUIDE.md',
  'JWT_TOKEN_REFRESH_SYSTEM.md',
  'LIVE_ANALYTICS_AND_BET_MONITORING.md',
  'PAYMENT_SYSTEM_CLARIFICATION.md',
  'DEPOSIT_WITHDRAWAL_COMPLETE_FLOW.md',
  'USER_CREATION_GUIDE.md',
  'VERIFICATION_CHECKLIST.md',
  
  // Obsolete documentation files
  'ROUTING_ARCHITECTURE.md',
  'ADMIN_ROUTES_STRUCTURE.md',
  'UNIFIED_ADMIN_PAGES.md',
  'ERROR_HANDLING_GUIDE.md',
  'MIGRATION_GUIDE.md',
  'PRODUCTION_DEPLOYMENT.md',
  'ROUTE_FLOW_DIAGRAM.md', // Redundant with COMPREHENSIVE_AUTH_AND_ROUTING_ANALYSIS.md
  
  // Priority/completion markers
  'PRIORITY_2_IMPROVEMENTS_COMPLETE.md',
];

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createBackup() {
  log('\n📦 Creating backup...', 'blue');
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `docs-backup-${timestamp}`);
  fs.mkdirSync(backupPath, { recursive: true });
  
  // Backup all docs
  const files = fs.readdirSync(DOCS_DIR);
  let backedUp = 0;
  
  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    if (fs.statSync(filePath).isFile() && file.endsWith('.md')) {
      const destPath = path.join(backupPath, file);
      fs.copyFileSync(filePath, destPath);
      backedUp++;
    }
  }
  
  log(`✅ Backed up ${backedUp} files to ${backupPath}`, 'green');
  return backupPath;
}

function deleteFile(filePath) {
  const fullPath = path.join(DOCS_DIR, filePath);
  
  if (!fs.existsSync(fullPath)) {
    log(`⚠️  File not found: ${filePath}`, 'yellow');
    return false;
  }
  
  try {
    if (DRY_RUN) {
      log(`[DRY RUN] Would delete: ${filePath}`, 'cyan');
      return true;
    }
    fs.unlinkSync(fullPath);
    log(`✅ Deleted: ${filePath}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error deleting ${filePath}: ${error.message}`, 'red');
    return false;
  }
}

function main() {
  log('\n📚 DOCUMENTATION CLEANUP SCRIPT', 'magenta');
  log('='.repeat(50), 'magenta');
  
  if (!fs.existsSync(DOCS_DIR)) {
    log(`❌ Docs directory not found: ${DOCS_DIR}`, 'red');
    process.exit(1);
  }
  
  if (KEEP_ALL) {
    log('\n⚠️  KEEP_ALL mode - No files will be deleted', 'yellow');
    return;
  }
  
  if (DRY_RUN) {
    log('\n🔍 DRY RUN MODE - No files will be deleted', 'yellow');
  }
  
  // Create backup
  if (!DRY_RUN) {
    createBackup();
  }
  
  // Get all markdown files
  const allFiles = fs.readdirSync(DOCS_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => ({
      name: file,
      keep: KEEP_FILES.includes(file),
      remove: REMOVE_FILES.includes(file),
    }));
  
  // Delete remove files
  log('\n🗑️  Removing duplicate/obsolete files...', 'blue');
  
  let deleted = 0;
  let kept = 0;
  let unknown = 0;
  
  for (const file of allFiles) {
    if (file.keep) {
      log(`✅ Keeping: ${file.name}`, 'green');
      kept++;
    } else if (file.remove) {
      if (deleteFile(file.name)) {
        deleted++;
      }
    } else {
      log(`❓ Unknown: ${file.name} (not in keep or remove list)`, 'yellow');
      unknown++;
    }
  }
  
  // Summary
  log('\n' + '='.repeat(50), 'magenta');
  log('📊 CLEANUP SUMMARY', 'magenta');
  log('='.repeat(50), 'magenta');
  log(`✅ Kept: ${kept}`, 'green');
  log(`🗑️  Deleted: ${deleted}`, 'blue');
  log(`❓ Unknown: ${unknown}`, 'yellow');
  log(`📁 Total files: ${allFiles.length}`, 'cyan');
  
  if (unknown > 0) {
    log('\n⚠️  Some files are not in keep/remove lists. Review manually.', 'yellow');
  }
  
  if (!DRY_RUN) {
    log(`\n💾 Backup saved to: ${BACKUP_DIR}`, 'cyan');
  }
  
  log('\n✅ Process complete!', 'green');
}

main();


// Analyze all database operations in the codebase
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '..');
const serverDir = path.join(projectRoot, 'server');

// Track all database operations
const operations = {
  tables: new Map(),
  columns: new Map(),
  rpcCalls: new Set(),
  issues: []
};

// Read all TypeScript files
function readTsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      files.push(...readTsFiles(fullPath));
    } else if (item.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract table operations from code
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(projectRoot, filePath);
  
  // Find .from('table_name') patterns
  const fromMatches = content.matchAll(/\.from\(['"]([^'"]+)['"]\)/g);
  for (const match of fromMatches) {
    const tableName = match[1];
    if (!operations.tables.has(tableName)) {
      operations.tables.set(tableName, { files: new Set(), operations: [] });
    }
    operations.tables.get(tableName).files.add(relativePath);
  }
  
  // Find .insert({ ... }) patterns
  const insertMatches = content.matchAll(/\.insert\(\{([^}]+)\}\)/gs);
  for (const match of insertMatches) {
    const fields = match[1];
    const fieldNames = [...fields.matchAll(/(\w+):/g)].map(m => m[1]);
    
    // Find which table this insert belongs to
    const beforeInsert = content.substring(0, match.index);
    const fromMatch = beforeInsert.match(/\.from\(['"]([^'"]+)['"]\)[^]*$/);
    if (fromMatch) {
      const tableName = fromMatch[1];
      if (!operations.tables.has(tableName)) {
        operations.tables.set(tableName, { files: new Set(), operations: [] });
      }
      operations.tables.get(tableName).operations.push({
        type: 'INSERT',
        fields: fieldNames,
        file: relativePath
      });
      
      // Track columns
      for (const field of fieldNames) {
        const key = `${tableName}.${field}`;
        if (!operations.columns.has(key)) {
          operations.columns.set(key, []);
        }
        operations.columns.get(key).push({ file: relativePath, operation: 'INSERT' });
      }
    }
  }
  
  // Find .update({ ... }) patterns
  const updateMatches = content.matchAll(/\.update\(\{([^}]+)\}\)/gs);
  for (const match of updateMatches) {
    const fields = match[1];
    const fieldNames = [...fields.matchAll(/(\w+):/g)].map(m => m[1]);
    
    // Find which table this update belongs to
    const beforeUpdate = content.substring(0, match.index);
    const fromMatch = beforeUpdate.match(/\.from\(['"]([^'"]+)['"]\)[^]*$/);
    if (fromMatch) {
      const tableName = fromMatch[1];
      if (!operations.tables.has(tableName)) {
        operations.tables.set(tableName, { files: new Set(), operations: [] });
      }
      operations.tables.get(tableName).operations.push({
        type: 'UPDATE',
        fields: fieldNames,
        file: relativePath
      });
      
      // Track columns
      for (const field of fieldNames) {
        const key = `${tableName}.${field}`;
        if (!operations.columns.has(key)) {
          operations.columns.set(key, []);
        }
        operations.columns.get(key).push({ file: relativePath, operation: 'UPDATE' });
      }
    }
  }
  
  // Find .rpc('function_name') patterns
  const rpcMatches = content.matchAll(/\.rpc\(['"]([^'"]+)['"]\)/g);
  for (const match of rpcMatches) {
    operations.rpcCalls.add(match[1]);
  }
}

// Analyze all files
console.log('🔍 Analyzing database operations...\n');
const tsFiles = readTsFiles(serverDir);
console.log(`Found ${tsFiles.length} TypeScript files\n`);

for (const file of tsFiles) {
  analyzeFile(file);
}

// Generate report
console.log('📊 DATABASE OPERATIONS REPORT');
console.log('='.repeat(80));
console.log('');

console.log('📋 TABLES USED IN CODE:');
console.log('-'.repeat(80));
const sortedTables = Array.from(operations.tables.keys()).sort();
for (const tableName of sortedTables) {
  const info = operations.tables.get(tableName);
  console.log(`\n✓ ${tableName}`);
  console.log(`  Files: ${info.files.size}`);
  console.log(`  Operations: ${info.operations.length}`);
  
  // Count operation types
  const inserts = info.operations.filter(op => op.type === 'INSERT').length;
  const updates = info.operations.filter(op => op.type === 'UPDATE').length;
  if (inserts > 0) console.log(`    - INSERT: ${inserts}`);
  if (updates > 0) console.log(`    - UPDATE: ${updates}`);
}

console.log('\n\n🔧 RPC FUNCTIONS CALLED:');
console.log('-'.repeat(80));
const sortedRpc = Array.from(operations.rpcCalls).sort();
for (const rpcName of sortedRpc) {
  console.log(`  ✓ ${rpcName}()`);
}

console.log('\n\n📝 COLUMNS ACCESSED:');
console.log('-'.repeat(80));
const sortedColumns = Array.from(operations.columns.keys()).sort();
for (const columnKey of sortedColumns) {
  const usages = operations.columns.get(columnKey);
  console.log(`  ${columnKey} (${usages.length} usages)`);
}

// Save detailed report to file
const reportPath = path.join(projectRoot, 'DATABASE_OPERATIONS_AUDIT.json');
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalTables: operations.tables.size,
    totalRpcCalls: operations.rpcCalls.size,
    totalColumns: operations.columns.size
  },
  tables: Object.fromEntries(
    Array.from(operations.tables.entries()).map(([name, info]) => [
      name,
      {
        files: Array.from(info.files),
        operations: info.operations
      }
    ])
  ),
  rpcCalls: Array.from(operations.rpcCalls),
  columns: Object.fromEntries(operations.columns)
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n\n✅ Detailed report saved to: DATABASE_OPERATIONS_AUDIT.json`);
console.log('\n' + '='.repeat(80));

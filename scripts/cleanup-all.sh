#!/bin/bash
# Complete Cleanup Script
# 
# Runs both file deletion and documentation cleanup in sequence.
# Creates backups before any deletion.
#
# Usage: ./scripts/cleanup-all.sh [--dry-run]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧹 COMPLETE CLEANUP SCRIPT"
echo "=========================="
echo ""

cd "$PROJECT_ROOT"

# Check for dry-run flag
DRY_RUN_FLAG=""
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN_FLAG="--dry-run"
    echo "🔍 DRY RUN MODE - No files will be deleted"
    echo ""
fi

# Step 1: Delete unused files
echo "📋 Step 1: Deleting unused files..."
echo "-----------------------------------"
node scripts/delete-unused-files.js $DRY_RUN_FLAG

echo ""
echo ""

# Step 2: Cleanup documentation
echo "📚 Step 2: Cleaning up documentation..."
echo "---------------------------------------"
node scripts/cleanup-docs.js $DRY_RUN_FLAG

echo ""
echo ""
echo "✅ CLEANUP COMPLETE!"
echo ""
echo "💡 Next steps:"
echo "   1. Run 'npm run type-check' to verify TypeScript"
echo "   2. Run 'npm run build' to verify build"
echo "   3. Test the application to ensure everything works"
echo "   4. If issues occur, restore from .backup-* directories"















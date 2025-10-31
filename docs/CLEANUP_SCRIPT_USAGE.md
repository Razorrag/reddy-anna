# Cleanup Scripts Usage Guide

This guide explains how to safely delete unused files and clean up documentation.

---

## 📋 Available Scripts

### 1. `scripts/delete-unused-files.js`
Deletes confirmed unused files from frontend and backend.

**Files to be deleted (27 total):**
- **Frontend (21 files):** Unused components, hooks, services
- **Backend (6 files):** Dead code, unused services

**Usage:**
```bash
# Dry run (preview what will be deleted)
node scripts/delete-unused-files.js --dry-run

# Actual deletion (creates backup first)
node scripts/delete-unused-files.js

# Deletion without backup (not recommended)
node scripts/delete-unused-files.js --no-backup
```

**What it does:**
1. Creates backup in `.backup-unused-files/`
2. Deletes confirmed unused files
3. Verifies TypeScript compilation
4. Reports summary

---

### 2. `scripts/cleanup-docs.js`
Removes duplicate and obsolete documentation files.

**Files to be removed:**
- Duplicate audit files
- Obsolete fix documentation
- Outdated implementation guides
- Test/development notes

**Usage:**
```bash
# Dry run (preview what will be deleted)
node scripts/cleanup-docs.js --dry-run

# Actual cleanup (creates backup first)
node scripts/cleanup-docs.js

# Keep all files (no deletion)
node scripts/cleanup-docs.js --keep-all
```

**What it does:**
1. Creates backup in `.backup-docs/`
2. Keeps essential documentation (15 files)
3. Removes duplicate/obsolete files
4. Reports unknown files for manual review

---

### 3. `scripts/cleanup-all.sh`
Runs both cleanup scripts in sequence.

**Usage:**
```bash
# Make executable (first time only)
chmod +x scripts/cleanup-all.sh

# Dry run (preview)
./scripts/cleanup-all.sh --dry-run

# Actual cleanup
./scripts/cleanup-all.sh
```

**What it does:**
1. Runs file deletion script
2. Runs documentation cleanup script
3. Provides next steps

---

## 🔒 Safety Features

### Automatic Backups
- All scripts create backups before deletion
- Backups stored in `.backup-*` directories
- Timestamped for easy restoration

### Dry Run Mode
- Preview what will be deleted
- No actual files removed
- Use before actual cleanup

### Verification
- TypeScript compilation check after deletion
- Reports broken imports if any
- Summary of actions taken

---

## 📊 Files to be Deleted

### Frontend (21 files)

#### Components (15 files)
- `client/src/components/VideoStream.tsx`
- `client/src/components/PlayerStreamView.tsx`
- `client/src/components/GameStream.tsx`
- `client/src/components/LiveStreamSimulation.tsx`
- `client/src/components/BettingStats.tsx`
- `client/src/components/GameAdmin/*` (6 files)
- `client/src/components/AdminGamePanel/*` (4 files)
- `client/src/components/ScreenShare/` (empty folder)

#### Hooks (3 files)
- `client/src/hooks/useStreamWebSocket.ts`
- `client/src/hooks/useBetting.ts`
- `client/src/hooks/useGameQuery.ts`

#### Services/Utilities (3 files)
- `client/src/lib/webrtc-client.ts`
- `client/src/utils/streamingWorkflow.ts`
- `client/src/services/userAdminService.ts`

### Backend (6 files)
- `server/types/express-session.d.ts`
- `server/unified-stream-routes.ts`
- `server/quick-fix-stream-visibility.js`
- `server/whatsapp-service.ts`
- `server/services/GameService.ts`
- `server/state-manager.ts`
- `server/controllers/adminController.ts`
- `server/db/queries/adminQueries.ts`

---

## ✅ Recommended Workflow

### Step 1: Preview (Dry Run)
```bash
# Preview file deletion
node scripts/delete-unused-files.js --dry-run

# Preview doc cleanup
node scripts/cleanup-docs.js --dry-run
```

### Step 2: Actual Cleanup
```bash
# Run complete cleanup
./scripts/cleanup-all.sh
```

### Step 3: Verify
```bash
# Check TypeScript compilation
cd client && npm run type-check
cd ../server && npm run type-check

# Test build
cd client && npm run build
cd ../server && npm run build

# Test application
npm run dev
```

### Step 4: If Issues Occur
```bash
# Restore from backup
cp -r .backup-unused-files/backup-*/client/src/* client/src/
cp -r .backup-unused-files/backup-*/server/* server/

# Or restore docs
cp -r .backup-docs/docs-backup-*/* docs/
```

---

## ⚠️ Important Notes

1. **Always run dry-run first** to preview changes
2. **Backups are automatic** - don't disable unless confident
3. **Test after cleanup** - verify app still works
4. **Git commit before cleanup** for extra safety
5. **Review unknown files** - some docs may need manual decision

---

## 📝 Files to Keep

These files are **NOT deleted** and are confirmed to be in use:

### Frontend
- All components in `AdminGamePanel/` that are actually used
- All contexts (AuthContext, WebSocketContext, GameStateContext, etc.)
- All hooks that are imported somewhere
- All services that are used

### Backend
- All routes and handlers
- All socket handlers
- All storage functions
- All middleware

---

## 🆘 Troubleshooting

### "File not found" warnings
- Normal - files may have been deleted already
- Script continues safely

### TypeScript errors after deletion
- Check if backup exists
- Restore specific files if needed
- Run `npm install` to refresh dependencies

### Build failures
- Verify all imports are correct
- Check if any essential files were deleted
- Restore from backup if necessary

---

**Last Updated:** $(date)
**Scripts Version:** 1.0.0







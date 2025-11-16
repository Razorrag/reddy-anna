# Additional Unused Files Found

## 🔍 Additional Analysis After Full Directory Scan

### **1. Empty Directories**
- `server/services/` - Empty directory (already deleted GameService.ts)
- `server/db/queries/` - Only has `adminQueries.ts` which IS used

### **2. Unused Test Files**
- `client/src/__tests__/streaming.test.tsx` - **DELETE**
  - Imports deleted components: `GameStream`, `PlayerStreamView`
  - Never run (not in test suite)
  - File already marked for deletion in test cleanup

### **3. Duplicate/Obsolete Scripts**
The following scripts are likely duplicates or obsolete:

- `scripts/test-streaming-architecture.js` - **CHECK**
- `scripts/test-streaming-architecture.mjs` - **CHECK** (duplicate?)
- `scripts/test-streaming.sh` - **CHECK**
- `scripts/cleanup-repository.ps1` - **CHECK**
- `scripts/emergency-deploy.ps1` - **CHECK**
- `scripts/emergency-deploy.sh` - **CHECK**
- `scripts/fix-streaming.sh` - **CHECK**
- `scripts/cleanup-all.sh` - **KEEP** (we just created this)
- Multiple admin creation scripts (check if still needed):
  - `scripts/create-admin-final.js`
  - `scripts/create-admin-fixed.js`
  - `scripts/create-default-user.js`
  - `scripts/setup-admin.js`
  - `scripts/setup-admin.ts`
  - `scripts/setup-database.js`
- Multiple cleanup scripts (check if still needed):
  - `scripts/final-cleanup.js`
  - `scripts/run-cleanup.js`
  - `scripts/run-sql-cleanup.js`
  - `scripts/simple-cleanup.js`
  - `scripts/cleanup-database.js`
  - `scripts/cleanup-database-fast.js`
- Multiple test scripts:
  - `scripts/test-connection.js`
  - `scripts/test-db-connection.js`
  - `scripts/test-dependencies.js`
  - `scripts/test-password.js`
  - `scripts/test-passwords.ts`
  - `scripts/test-auth.ts`
  - `scripts/test-bonus-system.js`
  - `scripts/test-bonus-system.cjs`
  - `scripts/check-admin-credentials.js`
  - `scripts/check-admin-credentials.cjs`
  - `scripts/debug-admin-user.js`
  - `scripts/debug-stream-settings.cjs`

### **4. Obsolete SQL Files**
- `fix-admin-password.sql` - Root level SQL file (might be obsolete)
- `database-setup.sql` - Root level SQL file (might be obsolete)
- `scripts/delete-all-data.sql` - **CHECK**
- `scripts/fix-test-user-passwords.sql` - **CHECK**
- `scripts/reset-and-recreate-database.sql` - **KEEP** (referenced in docs)

### **5. Root Level Files**
- `QUICK_HTTPS_SETUP.md` - **CHECK** if still needed
- `test-game-functionality.js` - Root level test file - **CHECK**
- `setup-env.sh` - **CHECK** if still needed

### **6. Broken Imports to Fix**
- `server/routes.ts` - Imports from deleted `whatsapp-service.ts`
  - Lines 135-139: Remove imports
  - Lines 1868, 2971, 3002, 3019, 3042: Remove or replace function calls

---

## ✅ Files That ARE Used (Keep!)
- `AnalyticsDashboard.tsx` - Used in `admin-analytics.tsx`
- `BetMonitoringDashboard.tsx` - Used in `admin.tsx` and `AdminDashboardLayout.tsx`
- `AdminStreamControl.tsx` - Used in `admin-stream-settings.tsx`
- `GameContext.tsx` - Used in `AppProviders.tsx`
- `AppContext.tsx` - Used in providers
- `server/controllers/adminController.ts` - Used in `server/routes/admin.ts`
- `server/controllers/userController.ts` - Used in `server/routes/user.ts`
- `server/db/queries/adminQueries.ts` - Used in `adminController.ts`

































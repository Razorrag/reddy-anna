# 🔍 Diagnostic Scripts

## Available Scripts

### 1. **check-all-issues.ps1** (Recommended)
Comprehensive check of all 18 client-reported issues.

**Usage:**
```powershell
cd "c:\Users\15anu\Desktop\andar bahar\andar bahar"
.\scripts\check-all-issues.ps1
```

**What it checks:**
- User statistics API
- Financial overview calculations
- Game history payouts
- Payment requests
- Auto-refresh intervals in code
- Component locations

### 2. **check-user-stats.ps1**
Focused check on user statistics issue.

**Usage:**
```powershell
.\scripts\check-user-stats.ps1
```

### 3. **check-database.sql**
SQL queries to check database directly.

**Usage:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy-paste queries from this file
4. Run to see database state

## Quick Start

**Step 1:** Run PowerShell script
```powershell
.\scripts\check-all-issues.ps1
```

**Step 2:** Check database
- Run queries from check-database.sql in Supabase

**Step 3:** Review generated report
- Check diagnostic-report-*.txt file

## Requirements

- Server must be running (npm run dev)
- Admin JWT token (get from browser DevTools)
- Supabase access for SQL queries

# 📦 Install New Dependencies

After the comprehensive fixes, new dependencies have been added. Follow these steps to install them.

## ⚡ Quick Install

```bash
npm install
```

This will install all new dependencies automatically.

---

## 📋 New Dependencies Added

### Production Dependencies

```json
{
  "redis": "^4.6.0"
}
```

**Purpose:** State management for production (replaces in-memory storage)

### Development Dependencies

```json
{
  "vitest": "^1.0.0",
  "@vitest/ui": "^1.0.0",
  "eslint": "^8.57.0",
  "@typescript-eslint/eslint-plugin": "^6.0.0",
  "@typescript-eslint/parser": "^6.0.0"
}
```

**Purpose:** Testing framework and code linting

---

## 🔍 Verify Installation

After running `npm install`, verify:

```bash
# Check package.json was updated
cat package.json | grep redis
# Should show: "redis": "^4.6.0"

# Check node_modules
ls node_modules/ | grep redis
# Should show: redis/

# Check TypeScript compilation
npm run check
# Should complete without errors
```

---

## 🐛 Troubleshooting

### "npm ERR! peer dependencies"

```bash
# Use legacy peer deps
npm install --legacy-peer-deps
```

### "Cannot find module 'redis'"

```bash
# Force reinstall
rm -rf node_modules package-lock.json
npm install
```

### "TypeScript errors"

```bash
# Rebuild TypeScript
npm run check
```

---

## ✅ After Installation

1. **Update .env** (see `QUICK_START_AFTER_FIXES.md`)
2. **Test build:** `npm run build`
3. **Run locally:** `npm start`

---

## 📚 Next Steps

See `QUICK_START_AFTER_FIXES.md` for complete setup instructions.

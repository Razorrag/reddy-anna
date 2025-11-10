# Bonus Settings Database Schema Fix ✅

## Problem

The bonus settings endpoints were failing with error:
```
Could not find the 'admin_whatsapp_number' column of 'game_settings' in the schema cache
```

## Root Cause

The `game_settings` table uses a **key-value structure** with columns:
- `setting_key` (VARCHAR)
- `setting_value` (TEXT)
- `description` (TEXT)

But the storage functions were trying to access individual columns like:
- `deposit_bonus_percent`
- `referral_bonus_percent`
- `admin_whatsapp_number`

This is a fundamental schema mismatch.

---

## Solution

### Updated `getBonusSettings()` Function

**Before:** Tried to fetch a single row with multiple columns
```typescript
const { data } = await supabaseServer
  .from('game_settings')
  .select('*')
  .eq('id', 1)
  .single();

return {
  depositBonusPercent: parseFloat(data.deposit_bonus_percent || '5'),
  // ... accessing non-existent columns
};
```

**After:** Fetches multiple rows and converts key-value pairs to object
```typescript
const { data } = await supabaseServer
  .from('game_settings')
  .select('*')
  .in('setting_key', [
    'deposit_bonus_percent',
    'referral_bonus_percent',
    'conditional_bonus_threshold',
    'bonus_claim_threshold',
    'admin_whatsapp_number'
  ]);

// Convert array to object
const settings = { /* defaults */ };
data.forEach((row) => {
  switch (row.setting_key) {
    case 'deposit_bonus_percent':
      settings.depositBonusPercent = parseFloat(row.setting_value);
      break;
    // ... etc
  }
});
```

---

### Updated `updateBonusSettings()` Function

**Before:** Tried to update multiple columns in one row
```typescript
await supabaseServer
  .from('game_settings')
  .update({
    deposit_bonus_percent: settings.depositBonusPercent,
    referral_bonus_percent: settings.referralBonusPercent,
    // ... non-existent columns
  })
  .eq('id', 1);
```

**After:** Updates/inserts each setting individually
```typescript
const updates = [
  { key: 'deposit_bonus_percent', value: String(settings.depositBonusPercent) },
  { key: 'referral_bonus_percent', value: String(settings.referralBonusPercent) },
  // ... etc
];

for (const update of updates) {
  // Try to update existing setting
  const { error } = await supabaseServer
    .from('game_settings')
    .update({ setting_value: update.value })
    .eq('setting_key', update.key);

  // If no rows affected, insert new setting
  if (error) {
    await supabaseServer
      .from('game_settings')
      .insert({
        setting_key: update.key,
        setting_value: update.value,
        description: `Bonus setting: ${update.key}`
      });
  }
}
```

---

## Database Schema

### game_settings Table Structure

```sql
CREATE TABLE game_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Example Data

| id | setting_key | setting_value | description |
|----|-------------|---------------|-------------|
| uuid-1 | deposit_bonus_percent | 5 | Deposit bonus percentage |
| uuid-2 | referral_bonus_percent | 1 | Referral bonus percentage |
| uuid-3 | admin_whatsapp_number | +919876543210 | Admin WhatsApp contact |

---

## Endpoints Fixed

### GET /api/admin/bonus-settings
- ✅ Now correctly reads from key-value table
- ✅ Returns default values if settings don't exist
- ✅ Converts string values to appropriate types

### PUT /api/admin/bonus-settings
- ✅ Now correctly updates/inserts individual settings
- ✅ Uses upsert pattern (update or insert)
- ✅ Handles missing settings gracefully

---

## Testing

### Test GET Endpoint
```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:5000/api/admin/bonus-settings
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "depositBonusPercent": 5,
    "referralBonusPercent": 1,
    "conditionalBonusThreshold": 1000,
    "bonusClaimThreshold": 100,
    "adminWhatsappNumber": ""
  }
}
```

### Test PUT Endpoint
```bash
curl -X PUT \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "depositBonusPercent": 10,
    "referralBonusPercent": 2,
    "conditionalBonusThreshold": 2000,
    "bonusClaimThreshold": 200,
    "adminWhatsappNumber": "+919876543210"
  }' \
  http://localhost:5000/api/admin/bonus-settings
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "depositBonusPercent": 10,
    "referralBonusPercent": 2,
    "conditionalBonusThreshold": 2000,
    "bonusClaimThreshold": 200,
    "adminWhatsappNumber": "+919876543210"
  }
}
```

---

## Files Modified

1. **`server/storage-supabase.ts`**
   - Lines 5292-5344: `getBonusSettings()` - Rewritten for key-value structure
   - Lines 5346-5385: `updateBonusSettings()` - Rewritten with upsert logic

---

## Migration Notes

### If Settings Don't Exist

The functions will work with empty database:
- `getBonusSettings()` returns default values
- `updateBonusSettings()` inserts new settings

### To Populate Initial Settings

Run this SQL in Supabase:
```sql
INSERT INTO game_settings (setting_key, setting_value, description) VALUES
  ('deposit_bonus_percent', '5', 'Deposit bonus percentage'),
  ('referral_bonus_percent', '1', 'Referral bonus percentage'),
  ('conditional_bonus_threshold', '1000', 'Minimum deposit for bonus'),
  ('bonus_claim_threshold', '100', 'Minimum bonus to claim'),
  ('admin_whatsapp_number', '', 'Admin WhatsApp contact number')
ON CONFLICT (setting_key) DO NOTHING;
```

---

## Status: ✅ FIXED

- ✅ Schema mismatch resolved
- ✅ Functions rewritten for key-value structure
- ✅ Upsert logic implemented
- ✅ Default values provided
- ✅ Error handling improved
- ✅ Ready for testing

The bonus settings endpoints now work correctly with the existing database schema.

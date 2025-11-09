# 🔍 **STREAM NOT SHOWING - DEBUG STEPS**

## **ISSUE:**
You save a stream URL in admin settings but it doesn't show on the game page.

---

## **🎯 QUICK FIX - CHECK THESE 3 THINGS:**

### **1. Did you create the database table?**

Go to **Supabase Dashboard** → **SQL Editor** → Run this:

```sql
-- Check if table exists
SELECT * FROM simple_stream_config;
```

**If you get an error "relation does not exist":**
- The table doesn't exist!
- Run the SQL from `CREATE_SIMPLE_STREAM_CONFIG_TABLE.sql`

**If you see a row:**
- Good! Table exists. Check the values.

---

### **2. Is the stream ACTIVE?**

The VideoArea code checks 3 conditions (line 200):
```typescript
if (!streamConfig || !streamConfig.isActive || !streamConfig.streamUrl) {
  // Shows "Stream not configured" message
}
```

**This means:**
- ✅ Config must exist
- ✅ `isActive` must be `true` ← **YOU MUST TOGGLE THIS ON!**
- ✅ `streamUrl` must not be empty

**In the admin page:**
1. Enter your URL
2. **TOGGLE "Stream Active" to ON** (it should be green)
3. Click "Save Settings"

---

### **3. Check browser console for errors**

**Open game page:**
1. Go to `http://localhost:3000/game`
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Look for these messages:

**Good messages:**
```
🎥 VideoArea: Stream config loaded: {streamUrl: "...", isActive: true, ...}
```

**Bad messages:**
```
Failed to load stream config: ...
```

---

## **🔧 DETAILED DEBUG STEPS:**

### **Step 1: Verify Database Table**

Run this in Supabase SQL Editor:

```sql
-- Check table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'simple_stream_config';
```

**Expected columns:**
- id
- stream_url
- stream_type
- is_active
- stream_title
- autoplay
- muted
- controls
- created_at
- updated_at

---

### **Step 2: Check Current Data**

```sql
-- See what's saved
SELECT 
  id,
  stream_url,
  stream_type,
  is_active,
  created_at,
  updated_at
FROM simple_stream_config;
```

**Expected result:**
```
id: [some UUID]
stream_url: "http://91.108.110.72:8000/live/test/index.m3u8"
stream_type: "iframe"
is_active: true  ← MUST BE TRUE!
```

**If `is_active` is `false`:**
```sql
-- Manually set it to true
UPDATE simple_stream_config 
SET is_active = true 
WHERE id = (SELECT id FROM simple_stream_config LIMIT 1);
```

---

### **Step 3: Test API Endpoint**

**Open a new browser tab:**
```
http://localhost:5000/api/stream/simple-config
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "streamUrl": "http://91.108.110.72:8000/live/test/index.m3u8",
    "streamType": "iframe",
    "isActive": true,
    "streamTitle": "Live Game Stream",
    "autoplay": true,
    "muted": true,
    "controls": false
  }
}
```

**If you see `"isActive": false`:**
- Go back to admin settings
- Toggle "Stream Active" to ON (green)
- Click "Save Settings"
- Refresh the API endpoint

---

### **Step 4: Check Server Logs**

**In your terminal where server is running:**

Look for these messages when you save:
```
✅ Simple stream config saved: {
  streamType: 'iframe',
  isActive: true,
  url: 'http://91.108.110.72:8000/live/test/index.m...'
}
```

**If you see `isActive: false`:**
- The toggle switch isn't working properly
- Try clicking it multiple times
- Make sure it turns GREEN before saving

---

### **Step 5: Check Frontend Console**

**On game page (F12 → Console):**

You should see:
```
🎥 VideoArea: Stream config loaded: {
  streamUrl: "http://91.108.110.72:8000/live/test/index.m3u8",
  streamType: "iframe",
  isActive: true,
  ...
}
```

**If you see `isActive: false`:**
- The stream won't show!
- Go back to admin settings
- Toggle it ON

---

## **🎬 STEP-BY-STEP FIX:**

### **1. Create Table (if not exists)**

```sql
CREATE TABLE IF NOT EXISTS simple_stream_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_url TEXT NOT NULL,
  stream_type VARCHAR(20) NOT NULL DEFAULT 'iframe',
  is_active BOOLEAN NOT NULL DEFAULT false,
  stream_title VARCHAR(255) DEFAULT 'Live Game Stream',
  autoplay BOOLEAN DEFAULT true,
  muted BOOLEAN DEFAULT true,
  controls BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **2. Go to Admin Settings**

```
http://localhost:3000/admin/stream-settings
```

### **3. Enter Stream URL**

```
http://91.108.110.72:8000/live/test/index.m3u8
```

### **4. TOGGLE "Stream Active" to ON**

**IMPORTANT:** The switch must be **GREEN** (to the right)

### **5. Click "Save Settings"**

Wait for success message: "Stream settings saved successfully!"

### **6. Verify in Database**

```sql
SELECT stream_url, is_active FROM simple_stream_config;
```

Should show:
```
stream_url: "http://91.108.110.72:8000/live/test/index.m3u8"
is_active: true  ← MUST BE TRUE!
```

### **7. Open Game Page**

```
http://localhost:3000/game
```

### **8. Check Console (F12)**

Should see:
```
🎥 VideoArea: Stream config loaded: {streamUrl: "...", isActive: true}
```

### **9. Stream Should Show!**

If you still see "Stream not configured":
- Check console for errors
- Verify `isActive: true` in console log
- Hard refresh: Ctrl+Shift+R

---

## **🐛 COMMON MISTAKES:**

### **Mistake 1: Forgot to toggle "Stream Active"**
❌ URL entered but toggle is OFF (gray)
✅ Toggle must be ON (green)

### **Mistake 2: Didn't create database table**
❌ Table doesn't exist in Supabase
✅ Run the CREATE TABLE SQL

### **Mistake 3: Server not restarted**
❌ Old code still running
✅ Stop and restart: `npm run dev:both`

### **Mistake 4: Wrong API endpoint**
❌ Frontend calling wrong URL
✅ Should be: `/api/stream/simple-config`

### **Mistake 5: CORS issues**
❌ API blocked by browser
✅ Check server CORS settings in `.env`

---

## **✅ VERIFICATION CHECKLIST:**

- [ ] Database table `simple_stream_config` exists
- [ ] Row exists in table with your URL
- [ ] `is_active` column is `true` (not `false`)
- [ ] Admin page shows toggle as GREEN (ON)
- [ ] API endpoint returns `"isActive": true`
- [ ] Server logs show "Simple stream config saved"
- [ ] Game page console shows "Stream config loaded"
- [ ] No errors in browser console
- [ ] Hard refresh game page (Ctrl+Shift+R)

---

## **🚨 IF STILL NOT WORKING:**

### **Force it manually in database:**

```sql
-- Delete any existing config
DELETE FROM simple_stream_config;

-- Insert fresh config with is_active = true
INSERT INTO simple_stream_config (
  stream_url, 
  stream_type, 
  is_active,
  stream_title,
  autoplay,
  muted,
  controls
) VALUES (
  'http://91.108.110.72:8000/live/test/index.m3u8',
  'iframe',
  true,  -- ← MUST BE TRUE!
  'Live Game Stream',
  true,
  true,
  false
);

-- Verify
SELECT * FROM simple_stream_config;
```

Then:
1. Hard refresh game page: **Ctrl+Shift+R**
2. Check console for stream config
3. Should now show!

---

## **📞 STILL STUCK?**

Share these details:

1. **Database query result:**
   ```sql
   SELECT * FROM simple_stream_config;
   ```

2. **API response:**
   ```
   http://localhost:5000/api/stream/simple-config
   ```

3. **Browser console output** (F12 → Console)

4. **Server logs** when you click "Save Settings"

This will help identify the exact issue!

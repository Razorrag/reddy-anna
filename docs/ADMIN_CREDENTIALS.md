# 🔐 Admin Credentials - Reddy Anna Andar Bahar

## Default Admin Account

```
Username: admin
Password: Admin@123
```

## Admin Panel URLs

Access the admin panel using any of these URLs:

- `http://localhost:5000/admin-game`
- `http://localhost:5000/game-admin`
- `http://localhost:5000/admin-control`

## Test Player Account

Create a test player account with these credentials:

```
Phone: 9999999999
Password: Test@123
Initial Balance: ₹100,000
```

## Quick Start

1. **Run the SQL script:**
   - Open Supabase SQL Editor
   - Copy all contents from `supabase_init.sql`
   - Run the script
   - Wait for completion

2. **Update .env file:**
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

4. **Login as admin:**
   - Go to: http://localhost:5000/admin-game
   - Username: `admin`
   - Password: `Admin@123`

## ⚠️ SECURITY WARNING

**CHANGE THE DEFAULT PASSWORD IMMEDIATELY AFTER FIRST LOGIN!**

The default password `Admin@123` is publicly known and should only be used for initial setup.

### How to Change Admin Password:

1. Login to admin panel
2. Go to Settings/Profile
3. Change password to a strong password:
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Example: `MyStr0ng!P@ssw0rd#2024`

## Database Verification

To verify admin account exists, run this in Supabase SQL Editor:

```sql
SELECT id, username, role, created_at 
FROM admin_credentials 
WHERE username = 'admin';
```

Expected result:
- 1 row returned
- username: `admin`
- role: `admin`

## Troubleshooting

### Can't login as admin?

1. **Check if admin exists:**
   ```sql
   SELECT * FROM admin_credentials;
   ```

2. **If empty, re-insert admin:**
   ```sql
   INSERT INTO admin_credentials (id, username, password_hash, role) 
   VALUES (
     gen_random_uuid()::text,
     'admin',
     '$2b$10$GFwpBgUccj3Al4OqMLMTmukHeQoVymRbog99qaXDKiY6lrm/46iIu',
     'admin'
   );
   ```

3. **Clear browser cache and try again**

### Password not working?

The password hash in the database is:
```
$2b$10$GFwpBgUccj3Al4OqMLMTmukHeQoVymRbog99qaXDKiY6lrm/46iIu
```

This corresponds to password: `Admin@123`

If you changed the password and forgot it, you can reset it by running:

```sql
UPDATE admin_credentials 
SET password_hash = '$2b$10$GFwpBgUccj3Al4OqMLMTmukHeQoVymRbog99qaXDKiY6lrm/46iIu'
WHERE username = 'admin';
```

This will reset it back to `Admin@123`.

## Admin Capabilities

Once logged in as admin, you can:

- ✅ Start and manage games
- ✅ Select opening cards
- ✅ Deal cards to Andar/Bahar
- ✅ View real-time betting statistics
- ✅ Manage player accounts
- ✅ View game history and analytics
- ✅ Configure game settings
- ✅ Manage stream settings
- ✅ Block/unblock users
- ✅ View transaction logs
- ✅ Generate reports

## Production Deployment

Before deploying to production:

1. ✅ Change admin password
2. ✅ Enable Row Level Security (RLS)
3. ✅ Set up proper authentication
4. ✅ Use HTTPS only
5. ✅ Secure environment variables
6. ✅ Set up database backups
7. ✅ Configure monitoring
8. ✅ Test all functionality

---

**Last Updated:** $(date)
**Schema Version:** 1.0.0

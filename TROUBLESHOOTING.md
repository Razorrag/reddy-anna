# Troubleshooting Authentication Issues

## Common Problems & Solutions

### 1. Database Connection Issues
**Problem**: Authentication fails with database errors.
**Solution**: 
- Verify your Supabase credentials in `.env` are correct
- Ensure your Supabase project is active and not in "Paused" state
- Check that the required tables exist (users, admin_credentials)

### 2. Admin Login Issues
**Problem**: Can't login as admin.
**Solution**:
- Run `npm run init` to ensure admin account is created
- Default admin credentials: username: `admin`, password: `admin123`
- Change password immediately after first login

### 3. User Registration Issues
**Problem**: Registration failing or users not found after registration.
**Solution**:
- Make sure phone numbers are exactly 10 digits
- Check that user table has proper structure with required fields
- Verify that balance and other fields have default values

### 4. Session Management Issues
**Problem**: Users get logged out unexpectedly.
**Solution**:
- Check session secret in `.env` is set properly
- Verify JWT expiration times are appropriate for your use case
- Ensure CORS settings allow your frontend domain

## Quick Fixes

### Test Authentication System
Run: `npm run test:auth` to test registration, login, and admin login functionality.

### Initialize Application
Run: `npm run init` to ensure database is accessible and admin account exists.

### Environment Variables
Make sure your `.env` file contains:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_role_key
SESSION_SECRET=your_secure_session_secret
JWT_SECRET=your_secure_jwt_secret
```

## Database Schema Requirements

Make sure your Supabase database contains these tables:
- `users` - for user accounts
- `admin_credentials` - for admin accounts
- `game_sessions` - for game management
- `player_bets` - for tracking bets
- `game_history` - for game results
- `dealt_cards` - for card history

## Contact for Support

If issues persist, check that:
1. Your Supabase project has Row Level Security (RLS) properly configured or disabled for development
2. The service role key has read/write permissions to all required tables
3. Your network/firewall allows connections to Supabase
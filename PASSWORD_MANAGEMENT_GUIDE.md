# Password Management System - Complete Guide

## Overview
This guide covers the complete password management system including admin password reset and user forgot password functionality.

## Features Implemented

### 1. Admin Password Reset (Admin Panel)
Admins can reset any user's password from the admin users page.

**Location:** `/admin/users`

**How to Use:**
1. Navigate to Admin → Users page
2. Find the user whose password needs to be reset
3. Click the "Change Password" button (blue key icon)
4. Enter new password (minimum 6 characters)
5. Confirm the password
6. Click "Reset Password"

**Backend Endpoint:**
```
PATCH /api/admin/users/:userId/password
Body: { newPassword: string }
```

### 2. Forgot Password (Login Page)
Users can request password reset by contacting admin via WhatsApp.

**Location:** `/login`

**How it Works:**
1. User enters their phone number on login page
2. Clicks "Forgot Password?" link
3. WhatsApp opens with pre-filled message to admin
4. Message includes user's phone number
5. Admin can then reset password from admin panel

**WhatsApp Message Template:**
```
Hello Admin,

I need help resetting my password.

My Phone Number: [user's phone number]

Please help me reset my password.

Thank you!
```

## Configuration

### Environment Variables

#### Backend (.env)
No additional backend environment variables needed. Uses existing JWT authentication.

#### Frontend (.env or .env.local)
```bash
# Admin WhatsApp number for password reset requests
# Format: Country code + phone number (no spaces or special characters)
VITE_ADMIN_WHATSAPP=919876543210
```

**Default:** If not set, defaults to `919876543210`

### How to Set Admin WhatsApp Number

1. Create or edit `client/.env.local`:
```bash
VITE_ADMIN_WHATSAPP=919876543210
```

2. Replace `919876543210` with actual admin WhatsApp number
   - Include country code (91 for India)
   - No spaces, dashes, or special characters
   - Example: `919876543210` for +91 98765 43210

3. Restart the development server for changes to take effect

## File Changes

### Backend Files Modified
1. **server/user-management.ts**
   - Added `resetUserPassword()` function
   - Validates password length (min 6 characters)
   - Hashes password with bcrypt
   - Updates user password in database

2. **server/routes/admin.ts**
   - Added `PATCH /api/admin/users/:userId/password` endpoint
   - Requires admin authentication
   - Validates admin access before password reset

### Frontend Files Created/Modified

1. **client/src/components/UserPasswordModal.tsx** (NEW)
   - Modal component for password reset
   - Password validation and confirmation
   - Show/hide password toggle
   - Real-time validation feedback

2. **client/src/pages/user-admin.tsx**
   - Added password change button to user actions
   - Integrated UserPasswordModal
   - Added handlePasswordReset function
   - Imported resetUserPassword service

3. **client/src/services/userAdminService.ts**
   - Added `resetUserPassword()` API function
   - Calls backend password reset endpoint

4. **client/src/pages/login.tsx**
   - Added "Forgot Password?" link
   - Integrated WhatsApp functionality
   - Pre-fills message with user's phone number
   - Opens WhatsApp in new tab

## Security Features

### Password Requirements
- Minimum 6 characters
- Must match confirmation field
- Hashed with bcrypt (10 salt rounds)
- Stored securely in database

### Admin Authorization
- Only authenticated admins can reset passwords
- Uses JWT token validation
- Requires admin role verification
- All actions logged with admin ID

### Audit Trail
- Password resets logged to console
- Includes admin ID, user ID, and timestamp
- Format: `Admin {adminId} reset password for user {userId} ({phone})`

## User Flow Examples

### Example 1: Admin Resets User Password
1. Admin logs in to admin panel
2. Navigates to Users page
3. Finds user "John Doe" (9876543210)
4. Clicks "Change Password" button
5. Enters new password: "newpass123"
6. Confirms password: "newpass123"
7. Clicks "Reset Password"
8. Success message shown
9. User can now login with new password

### Example 2: User Forgot Password
1. User goes to login page
2. Enters phone number: 9876543210
3. Clicks "Forgot Password?" link
4. WhatsApp opens with message:
   ```
   Hello Admin,
   
   I need help resetting my password.
   
   My Phone Number: 9876543210
   
   Please help me reset my password.
   
   Thank you!
   ```
5. User sends message to admin
6. Admin receives WhatsApp message
7. Admin logs into admin panel
8. Admin finds user by phone number
9. Admin resets password
10. Admin sends new password to user via WhatsApp
11. User logs in with new password

## API Documentation

### Reset User Password (Admin Only)

**Endpoint:** `PATCH /api/admin/users/:userId/password`

**Authentication:** Required (Admin JWT token)

**Request:**
```json
{
  "newPassword": "newpassword123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully for user John Doe (9876543210)"
}
```

**Error Responses:**

400 - Validation Error:
```json
{
  "success": false,
  "error": "Password must be at least 6 characters long"
}
```

401 - Unauthorized:
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

404 - User Not Found:
```json
{
  "success": false,
  "error": "User not found"
}
```

## Testing

### Test Admin Password Reset
1. Login as admin
2. Go to `/admin/users`
3. Click "Change Password" on any user
4. Enter password: "test123"
5. Confirm password: "test123"
6. Click "Reset Password"
7. Verify success message
8. Logout and login as that user with new password

### Test Forgot Password WhatsApp
1. Go to `/login`
2. Enter phone number: 9876543210
3. Click "Forgot Password?"
4. Verify WhatsApp opens
5. Check message contains correct phone number
6. Verify message is addressed to admin

## Troubleshooting

### WhatsApp Not Opening
- Check VITE_ADMIN_WHATSAPP is set correctly
- Ensure WhatsApp is installed on device
- Try different browser if issue persists
- Check browser popup blocker settings

### Password Reset Fails
- Verify admin is logged in
- Check password meets minimum requirements
- Ensure passwords match
- Check network connection
- Verify backend server is running

### User Can't Login After Reset
- Verify password was actually reset (check success message)
- Ensure user is using correct phone number
- Check user account is not banned/suspended
- Try resetting password again

## Best Practices

### For Admins
1. Always verify user identity before resetting password
2. Use strong, unique passwords
3. Inform user of password reset via secure channel
4. Encourage users to change password after reset
5. Keep admin WhatsApp number secure

### For Users
1. Keep phone number updated
2. Use strong passwords
3. Don't share passwords
4. Change password immediately after admin reset
5. Contact admin only via official WhatsApp number

## Future Enhancements

Potential improvements for future versions:
- Email-based password reset
- SMS OTP verification
- Password strength meter
- Password history (prevent reuse)
- Self-service password reset
- Two-factor authentication
- Password expiry policy
- Account lockout after failed attempts

## Support

For issues or questions:
1. Check this documentation
2. Review error messages
3. Check browser console for errors
4. Contact admin via WhatsApp
5. Review server logs for backend issues

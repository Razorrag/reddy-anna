# Password Reset - Quick Reference

## 🔑 Admin Password Reset

### Access
- **URL:** `/admin/users`
- **Button:** Blue "Change Password" button with key icon

### Steps
1. Find user in list
2. Click "Change Password"
3. Enter new password (min 6 chars)
4. Confirm password
5. Click "Reset Password"

### API
```
PATCH /api/admin/users/:userId/password
{ "newPassword": "string" }
```

---

## 📱 User Forgot Password (WhatsApp)

### Access
- **URL:** `/login`
- **Link:** "Forgot Password?" next to password field

### Steps
1. Enter phone number
2. Click "Forgot Password?"
3. WhatsApp opens automatically
4. Send message to admin
5. Wait for admin to reset password

### Configuration
```bash
# client/.env.local
VITE_ADMIN_WHATSAPP=919876543210
```

---

## ✅ Password Requirements
- Minimum 6 characters
- Must match confirmation
- Automatically hashed (bcrypt)

---

## 🔒 Security
- Admin authentication required
- JWT token validation
- All actions logged
- Secure password hashing

---

## 📞 WhatsApp Message Template
```
Hello Admin,

I need help resetting my password.

My Phone Number: [user's phone]

Please help me reset my password.

Thank you!
```

---

## 🚨 Troubleshooting

### WhatsApp doesn't open
- Check VITE_ADMIN_WHATSAPP in .env.local
- Disable popup blocker
- Try different browser

### Password reset fails
- Verify admin is logged in
- Check password length (min 6)
- Ensure passwords match
- Check network connection

### User can't login after reset
- Verify success message was shown
- Check user status (not banned)
- Try resetting again
- Verify correct phone number

---

## 📋 Files Modified

### Backend
- `server/user-management.ts` - resetUserPassword()
- `server/routes/admin.ts` - Password endpoint

### Frontend
- `client/src/components/UserPasswordModal.tsx` - NEW
- `client/src/pages/user-admin.tsx` - Added button
- `client/src/pages/login.tsx` - Forgot password link
- `client/src/services/userAdminService.ts` - API call

---

## 🎯 Quick Test

### Test Admin Reset
```bash
1. Login as admin
2. Go to /admin/users
3. Click "Change Password" on test user
4. Enter: test123 / test123
5. Verify success message
```

### Test Forgot Password
```bash
1. Go to /login
2. Enter phone: 9876543210
3. Click "Forgot Password?"
4. Verify WhatsApp opens with message
```

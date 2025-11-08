# Profile Page Fix & Database Migration Guide

## Summary

Fixed profile data loading issue and documented database schema limitations for extended profile fields.

---

## ✅ Fixes Applied

### 1. Profile Page Data Fetching

**File**: `client/src/pages/profile.tsx`

**Changes**:
- Added `fetchUserProfile` to destructuring from `useUserProfile()` hook (line 45)
- Added `useEffect` to fetch profile data on page mount (lines 91-97)
- Profile now loads automatically when user navigates to `/profile`

**Before**:
```typescript
const {
  state: profileState,
  fetchTransactions,
  fetchGameHistory,
  updateProfile,
  fetchReferralData,
  claimBonus
} = useUserProfile();
```

**After**:
```typescript
const {
  state: profileState,
  fetchTransactions,
  fetchGameHistory,
  updateProfile,
  fetchReferralData,
  claimBonus,
  fetchUserProfile  // ✅ ADDED
} = useUserProfile();

// ✅ NEW: Fetch profile data on mount
useEffect(() => {
  if (user && !profileState.user && !profileState.loading) {
    console.log('📥 Profile page: Fetching user profile data');
    fetchUserProfile();
  }
}, [user, profileState.user, profileState.loading, fetchUserProfile]);
```

---

## ⚠️ Database Schema Limitation

### Current Schema (working fields)

The `users` table in `shared/schema.ts` currently stores:
```typescript
- id (phone number)
- phone
- password_hash
- full_name
- role
- status
- balance
- total_winnings
- total_losses
- games_played
- games_won
- phone_verified
- referral_code
- deposit_bonus_available
- referral_bonus_available
- last_login
- created_at
- updated_at
```

### Missing Fields (UI shows but DB doesn't store)

The profile form displays these fields, but they are **NOT stored** in the database:
```typescript
- email
- dateOfBirth
- gender
- address
- city
- state
- pincode
- country
- profilePicture
```

### Current Behavior

1. **Profile Edit**: Users can fill these fields, but they won't be saved
2. **Update Profile API**: Returns error "Profile updates not supported in current schema" (see `server/user-management.ts:74`)
3. **Data Display**: These fields will always show empty even after "saving"

---

## 🔧 Database Migration (Optional)

If you want to support extended profile fields, run this migration:

### Migration SQL

Create file: `server/migrations/add-extended-profile-fields.sql`

```sql
-- Add extended profile fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(100),
ADD COLUMN IF NOT EXISTS pincode VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(100),
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Add unique constraint on email (optional, for login via email later)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique 
ON users(email) 
WHERE email IS NOT NULL;

-- Add check constraint for gender
ALTER TABLE users
ADD CONSTRAINT check_gender 
CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say') OR gender IS NULL);

-- Comment on columns
COMMENT ON COLUMN users.email IS 'User email address (optional)';
COMMENT ON COLUMN users.date_of_birth IS 'User date of birth';
COMMENT ON COLUMN users.gender IS 'User gender (male/female/other/prefer_not_to_say)';
COMMENT ON COLUMN users.address IS 'Full street address';
COMMENT ON COLUMN users.city IS 'City name';
COMMENT ON COLUMN users.state IS 'State/Province name';
COMMENT ON COLUMN users.pincode IS 'Postal/ZIP code';
COMMENT ON COLUMN users.country IS 'Country name';
COMMENT ON COLUMN users.profile_picture IS 'URL or path to profile picture';
```

### Update Schema File

After running migration, update `shared/schema.ts`:

```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  phone: varchar("phone").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  full_name: text("full_name"),
  
  // ✅ ADD THESE:
  email: varchar("email", { length: 255 }),
  date_of_birth: timestamp("date_of_birth", { mode: 'date' }),
  gender: varchar("gender", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  pincode: varchar("pincode", { length: 20 }),
  country: varchar("country", { length: 100 }),
  profile_picture: text("profile_picture"),
  
  // ... rest of existing fields
  role: text("role").default("player"),
  status: text("status").default("active"),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("100000.00"),
  // ... etc
});
```

### Update Backend Code

1. **Update `getUserDetails` in `server/user-management.ts`**:

```typescript
export const getUserDetails = async (userId: string): Promise<UserManagementResponse> => {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const userResponse = {
      id: user.id,
      phone: user.phone,
      username: user.phone,
      fullName: user.full_name,
      // ✅ ADD THESE:
      email: user.email,
      mobile: user.phone, // Map phone to mobile for frontend compatibility
      dateOfBirth: user.date_of_birth,
      gender: user.gender,
      address: user.address,
      city: user.city,
      state: user.state,
      pincode: user.pincode,
      country: user.country,
      profilePicture: user.profile_picture,
      // ... rest of fields
      role: user.role,
      status: user.status,
      balance: parseFloat(user.balance as any),
      // ... etc
    };

    return { success: true, user: userResponse };
  } catch (error) {
    console.error('User details error:', error);
    return { success: false, error: 'User details retrieval failed' };
  }
};
```

2. **Update `updateUserProfile` in `server/user-management.ts`**:

```typescript
export const updateUserProfile = async (userId: string, updates: UserProfileUpdate): Promise<UserManagementResponse> => {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (updates.email) {
      const sanitizedEmail = sanitizeInput(updates.email).toLowerCase();
      if (!validateEmail(sanitizedEmail)) {
        return { success: false, error: 'Invalid email format' };
      }
      updateData.email = sanitizedEmail;
    }
    
    if (updates.name) {
      updateData.full_name = sanitizeInput(updates.name);
    }
    
    if (updates.profile) {
      if (updates.profile.address) updateData.address = sanitizeInput(updates.profile.address);
      if (updates.profile.city) updateData.city = sanitizeInput(updates.profile.city);
      if (updates.profile.state) updateData.state = sanitizeInput(updates.profile.state);
      if (updates.profile.pincode) updateData.pincode = sanitizeInput(updates.profile.pincode);
      if (updates.profile.country) updateData.country = sanitizeInput(updates.profile.country);
      if (updates.profile.dateOfBirth) updateData.date_of_birth = updates.profile.dateOfBirth;
      if (updates.profile.gender) updateData.gender = updates.profile.gender;
      if (updates.profile.profilePicture) updateData.profile_picture = updates.profile.profilePicture;
    }

    // Update user in database
    await storage.updateUser(userId, updateData);
    
    // Fetch updated user
    const updatedUser = await storage.getUser(userId);
    
    const userResponse = {
      id: updatedUser.id,
      phone: updatedUser.phone,
      username: updatedUser.phone,
      fullName: updatedUser.full_name,
      email: updatedUser.email,
      mobile: updatedUser.phone,
      dateOfBirth: updatedUser.date_of_birth,
      gender: updatedUser.gender,
      address: updatedUser.address,
      city: updatedUser.city,
      state: updatedUser.state,
      pincode: updatedUser.pincode,
      country: updatedUser.country,
      profilePicture: updatedUser.profile_picture,
      role: updatedUser.role,
      status: updatedUser.status,
      balance: updatedUser.balance,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at
    };

    return { success: true, user: userResponse };
  } catch (error) {
    console.error('Profile update error:', error);
    return { success: false, error: 'Profile update failed' };
  }
};
```

3. **Add `updateUser` method to `storage-supabase.ts`** (if not exists):

```typescript
async updateUser(userId: string, updates: any): Promise<void> {
  const { error } = await this.supabase
    .from('users')
    .update({
      ...updates,
      updated_at: new Date()
    })
    .eq('id', userId);
    
  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }
}
```

---

## 🧪 Testing

### Test Profile Data Loading

1. Login as a user
2. Navigate to `/profile`
3. Check browser console for: `📥 Profile page: Fetching user profile data`
4. Verify profile information displays (name, phone, balance, statistics)

### Test Extended Fields (After Migration)

1. Navigate to `/profile`
2. Click "Edit Profile"
3. Fill in extended fields (email, address, city, etc.)
4. Click "Save Changes"
5. Refresh page - fields should persist

### Without Migration

Extended fields will:
- Show in UI ✅
- Accept input ✅
- NOT save to database ❌
- Show empty after refresh ❌

---

## 📊 Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| Profile page loads | ✅ FIXED | Now fetches data on mount |
| Basic info display | ✅ WORKING | Phone, name, balance, stats |
| Profile fetch API | ✅ WORKING | Returns user data correctly |
| Extended fields UI | ✅ WORKING | Form displays all fields |
| Extended fields save | ❌ NOT WORKING | DB schema missing columns |
| Extended fields display | ❌ NOT WORKING | No data to display |

---

## 🎯 Recommendations

### Short-term (Current Setup)

If extended profile fields are **not critical**:
1. Keep current fix ✅
2. Hide/remove extended field inputs from profile form
3. Only show: name, phone, balance, statistics
4. Update profile form to only allow name changes

### Long-term (Complete Feature)

If you want full profile management:
1. Run the database migration ✅
2. Update schema.ts ✅
3. Update backend API handlers ✅
4. Test all fields ✅
5. Deploy changes ✅

---

## 📝 Implementation Steps

### Quick Fix (Hide Extended Fields)

Edit `client/src/pages/profile.tsx` around line 380-393:

```typescript
// REMOVE OR COMMENT OUT these fields:
// - dateOfBirth
// - gender
// - address
// - city
// - state
// - pincode
// - country

// Keep only:
<div>
  <Label htmlFor="fullName" className="text-gold">Full Name</Label>
  <Input
    id="fullName"
    value={profileForm.fullName}
    onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
    disabled={!editingProfile}
    className="bg-black/50 border-gold/30 text-white"
  />
</div>
<div>
  <Label htmlFor="mobile" className="text-gold">Mobile Number</Label>
  <Input
    id="mobile"
    value={profileForm.mobile || user.phone}
    disabled={true}  // Never allow phone changes
    className="bg-black/50 border-gold/30 text-white opacity-60"
  />
</div>
```

### Full Implementation

1. Run SQL migration on your database
2. Update `shared/schema.ts` with new columns
3. Update `server/user-management.ts` functions
4. Add `updateUser` method to storage
5. Test thoroughly
6. Deploy

---

## 🐛 Debugging

If profile still doesn't load:

1. Check browser console for errors
2. Check Network tab for `/api/user/profile` response
3. Verify authentication token is sent
4. Check server logs for API errors
5. Verify user is logged in (`localStorage.getItem('isLoggedIn')`)

---

## ✅ Files Modified

1. `client/src/pages/profile.tsx` - Added profile fetch on mount
2. `docs/PROFILE_PAGE_FIX_AND_DATABASE_MIGRATION.md` - This documentation

## 📋 Files to Modify (Optional - For Full Feature)

3. `shared/schema.ts` - Add extended profile columns
4. `server/user-management.ts` - Update getUserDetails, updateUserProfile
5. `server/storage-supabase.ts` - Add updateUser method
6. `server/migrations/add-extended-profile-fields.sql` - Create migration

---

## 🎉 Result

**Immediate**: Profile page now loads user data automatically when accessed.

**After Migration**: Users can edit and save complete profile information including address, date of birth, gender, etc.

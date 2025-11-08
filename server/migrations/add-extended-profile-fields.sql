-- Migration: Add Extended Profile Fields
-- Purpose: Enable full profile management (email, address, date of birth, etc.)
-- Created: 2024-11-08
-- Status: OPTIONAL - Only run if you want extended profile features

-- ============================================================
-- ADD NEW COLUMNS TO USERS TABLE
-- ============================================================

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

-- ============================================================
-- ADD CONSTRAINTS AND INDEXES
-- ============================================================

-- Unique email (optional, allows login via email later)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique 
ON users(email) 
WHERE email IS NOT NULL;

-- Email format validation
ALTER TABLE users
ADD CONSTRAINT check_email_format 
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Gender validation
ALTER TABLE users
ADD CONSTRAINT check_gender 
CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Age validation (must be 18+)
ALTER TABLE users
ADD CONSTRAINT check_minimum_age 
CHECK (date_of_birth IS NULL OR date_of_birth <= CURRENT_DATE - INTERVAL '18 years');

-- Pincode format (alphanumeric, 3-10 characters)
ALTER TABLE users
ADD CONSTRAINT check_pincode_format
CHECK (pincode IS NULL OR (LENGTH(pincode) BETWEEN 3 AND 10 AND pincode ~ '^[A-Za-z0-9\s-]+$'));

-- Index for searching by city/state (performance optimization)
CREATE INDEX IF NOT EXISTS users_location_idx ON users(city, state) WHERE city IS NOT NULL OR state IS NOT NULL;

-- Index for email lookups
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email) WHERE email IS NOT NULL;

-- ============================================================
-- ADD COLUMN COMMENTS (Documentation)
-- ============================================================

COMMENT ON COLUMN users.email IS 'User email address (optional, can be used for alternative login)';
COMMENT ON COLUMN users.date_of_birth IS 'User date of birth (must be 18+ years old)';
COMMENT ON COLUMN users.gender IS 'User gender: male, female, other, or prefer_not_to_say';
COMMENT ON COLUMN users.address IS 'Full street address with house/apartment number';
COMMENT ON COLUMN users.city IS 'City name';
COMMENT ON COLUMN users.state IS 'State or province name';
COMMENT ON COLUMN users.pincode IS 'Postal code or ZIP code (3-10 alphanumeric characters)';
COMMENT ON COLUMN users.country IS 'Country name';
COMMENT ON COLUMN users.profile_picture IS 'URL or file path to profile picture (CDN or storage path)';

-- ============================================================
-- CREATE AUDIT LOG FOR PROFILE CHANGES (Optional)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profile_audit (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_by VARCHAR, -- admin ID if changed by admin, NULL if self-edit
  field_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profile_audit_user_idx ON user_profile_audit(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS profile_audit_field_idx ON user_profile_audit(field_name, created_at DESC);

COMMENT ON TABLE user_profile_audit IS 'Audit log for tracking all profile field changes';

-- ============================================================
-- CREATE TRIGGER FOR AUTOMATIC AUDIT LOGGING (Optional)
-- ============================================================

CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log email changes
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    INSERT INTO user_profile_audit (user_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'email', OLD.email, NEW.email);
  END IF;
  
  -- Log date_of_birth changes
  IF OLD.date_of_birth IS DISTINCT FROM NEW.date_of_birth THEN
    INSERT INTO user_profile_audit (user_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'date_of_birth', OLD.date_of_birth::text, NEW.date_of_birth::text);
  END IF;
  
  -- Log gender changes
  IF OLD.gender IS DISTINCT FROM NEW.gender THEN
    INSERT INTO user_profile_audit (user_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'gender', OLD.gender, NEW.gender);
  END IF;
  
  -- Log address changes
  IF OLD.address IS DISTINCT FROM NEW.address THEN
    INSERT INTO user_profile_audit (user_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'address', OLD.address, NEW.address);
  END IF;
  
  -- Log city changes
  IF OLD.city IS DISTINCT FROM NEW.city THEN
    INSERT INTO user_profile_audit (user_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'city', OLD.city, NEW.city);
  END IF;
  
  -- Log state changes
  IF OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO user_profile_audit (user_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'state', OLD.state, NEW.state);
  END IF;
  
  -- Log pincode changes
  IF OLD.pincode IS DISTINCT FROM NEW.pincode THEN
    INSERT INTO user_profile_audit (user_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'pincode', OLD.pincode, NEW.pincode);
  END IF;
  
  -- Log country changes
  IF OLD.country IS DISTINCT FROM NEW.country THEN
    INSERT INTO user_profile_audit (user_id, field_name, old_value, new_value)
    VALUES (NEW.id, 'country', OLD.country, NEW.country);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_profile_changes ON users;
CREATE TRIGGER trigger_log_profile_changes
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION log_profile_changes();

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Check if columns were added successfully
SELECT 
  column_name, 
  data_type, 
  character_maximum_length,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('email', 'date_of_birth', 'gender', 'address', 'city', 'state', 'pincode', 'country', 'profile_picture')
ORDER BY column_name;

-- Check constraints
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users'
AND constraint_name LIKE 'check_%';

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'users'
AND indexname LIKE '%email%' OR indexname LIKE '%location%';

-- ============================================================
-- SAMPLE DATA (For Testing)
-- ============================================================

-- Update a test user with sample profile data
-- REPLACE 'test_phone_number' with an actual user phone number
/*
UPDATE users 
SET 
  email = 'test@example.com',
  date_of_birth = '1990-01-15',
  gender = 'male',
  address = '123 Test Street, Apt 4B',
  city = 'Mumbai',
  state = 'Maharashtra',
  pincode = '400001',
  country = 'India',
  profile_picture = 'https://example.com/profiles/test.jpg'
WHERE phone = 'test_phone_number';
*/

-- ============================================================
-- ROLLBACK SCRIPT (If you need to undo changes)
-- ============================================================

/*
-- WARNING: This will delete all extended profile data!
-- Only run if you need to completely remove the extended profile feature

ALTER TABLE users
DROP COLUMN IF EXISTS email CASCADE,
DROP COLUMN IF EXISTS date_of_birth CASCADE,
DROP COLUMN IF EXISTS gender CASCADE,
DROP COLUMN IF EXISTS address CASCADE,
DROP COLUMN IF EXISTS city CASCADE,
DROP COLUMN IF EXISTS state CASCADE,
DROP COLUMN IF EXISTS pincode CASCADE,
DROP COLUMN IF EXISTS country CASCADE,
DROP COLUMN IF EXISTS profile_picture CASCADE;

DROP TABLE IF EXISTS user_profile_audit CASCADE;
DROP FUNCTION IF EXISTS log_profile_changes CASCADE;

-- Verify removal
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('email', 'date_of_birth', 'gender', 'address', 'city', 'state', 'pincode', 'country', 'profile_picture');
*/

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

SELECT 'Extended profile fields migration completed successfully!' AS status;

-- Create database
CREATE DATABASE IF NOT EXISTS annar_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Create application user (adjust host as needed: '%' or 'localhost')
CREATE USER IF NOT EXISTS 'app_user'@'%' IDENTIFIED BY 'app_password';

-- Grant privileges to the app user on the database
GRANT ALL PRIVILEGES ON annar_db.* TO 'app_user'@'%';
FLUSH PRIVILEGES;

USE annar_db;

-- Users table aligned with forms
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email VARCHAR(255) NULL,
  referral_code VARCHAR(64) NULL,
  password_hash VARCHAR(255) NOT NULL,
  date_of_birth DATE NULL,
  address TEXT NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_mobile (mobile),
  UNIQUE KEY uk_users_email (email)
);

-- Blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  blocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_blocked_user_id (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin', 'moderator') NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  created_by BIGINT UNSIGNED NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_admins_username (username),
  UNIQUE KEY uk_admins_email (email),
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- Game settings table
CREATE TABLE IF NOT EXISTS game_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_setting_key (setting_key)
);

-- Insert default game settings
INSERT INTO game_settings (setting_key, setting_value, description) VALUES
('max_bet_amount', '50000', 'Maximum bet amount allowed in the game'),
('min_bet_amount', '1000', 'Minimum bet amount allowed in the game'),
('game_timer', '30', 'Default game timer in seconds'),
('opening_card', 'A♠', 'Current opening card for the game')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Stream settings table
CREATE TABLE IF NOT EXISTS stream_settings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_stream_setting_key (setting_key)
);

-- Insert default stream settings
INSERT INTO stream_settings (setting_key, setting_value, description) VALUES
('stream_url', 'hero images/uhd_30fps.mp4', 'Default stream URL for offline status'),
('stream_title', 'Andar Bahar Live Game', 'Stream title'),
('stream_status', 'offline', 'Current stream status (live/offline/maintenance)'),
('stream_description', 'Live Andar Bahar game streaming', 'Stream description'),
('stream_quality', '720p', 'Stream quality setting'),
('stream_delay', '0', 'Stream delay in seconds'),
('backup_stream_url', '', 'Backup stream URL'),
('stream_embed_code', '', 'Custom embed code for live streaming')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

-- Insert default admin accounts
INSERT INTO admins (username, email, full_name, password_hash, role, is_active) VALUES
('admin', 'admin@reddyanna.com', 'System Administrator', '$2a$10$NffV80ge6uVdYo5ltJsSk.dLTX8a/NWCkhYohvq1ndx0K3dzelQdG', 'super_admin', TRUE),
('reddy', 'reddy@reddyanna.com', 'Reddy Anna', '$2a$10$zIWYFvKfxiGK8JCeoJt9Y.EOKY3mXQX1C3Bptir7/uJOjJ0hu1VFO', 'admin', TRUE),
('superadmin', 'super@reddyanna.com', 'Super Admin', '$2a$10$NaoVEEgRDeudm23XS3W2geinQIYuAkmbmUI2RrmYTwoY0v1FUK8xq', 'super_admin', TRUE)
ON DUPLICATE KEY UPDATE username = username;



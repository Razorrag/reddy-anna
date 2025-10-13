# Reddy Anna Kossu - Free Deployment Guide

This guide will walk you through deploying the complete Reddy Anna Kossu gaming platform using only free services:
- **Frontend**: Netlify (free tier)
- **Backend**: Render (free tier)
- **Database**: Supabase (free tier)

## Architecture Overview

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Frontend      │       │    Backend      │       │    Database     │
│   (Netlify)     │◀──────▶│   (Render)      │◀──────▶│  (Supabase)     │
│                 │       │                 │       │                 │
│ - Static Files  │       │ - API Server    │       │ - PostgreSQL    │
│ - React/HTML    │       │ - Authentication │       │ - User Data     │
│ - CSS/JS        │       │ - Business Logic│       │ - Game Settings │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

## Prerequisites

1. Node.js (v14 or higher)
2. Git account and Git installed
3. Netlify account
4. Render account
5. Supabase account

## Part 1: Database Setup (Supabase)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Select your organization
4. Enter project details:
   - Project Name: `reddy-anna-db`
   - Database Password: Create a strong password
   - Region: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (2-3 minutes)

### Step 2: Get Database Credentials

1. In your Supabase dashboard, go to Settings > Database
2. Copy the connection string
3. Note these values:
   - Host: `db.******.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: Your created password

### Step 3: Create Database Tables

1. In Supabase dashboard, go to SQL Editor
2. Click "New query"
3. Copy and paste the contents of `backend/db.sql` (modified for PostgreSQL)
4. Click "Run" to execute the SQL

### Step 4: Modify Database Schema for PostgreSQL

Create a new file `backend/db_postgres.sql`:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  mobile VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) UNIQUE,
  referral_code VARCHAR(64),
  password_hash VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  blocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role TEXT CHECK (role IN ('super_admin', 'admin', 'moderator')) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  created_by BIGINT REFERENCES admins(id) ON DELETE SET NULL
);

-- Create game settings table
CREATE TABLE IF NOT EXISTS game_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stream settings table
CREATE TABLE IF NOT EXISTS stream_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default game settings
INSERT INTO game_settings (setting_key, setting_value, description) VALUES
('max_bet_amount', '50000', 'Maximum bet amount allowed in the game'),
('min_bet_amount', '1000', 'Minimum bet amount allowed in the game'),
('game_timer', '30', 'Default game timer in seconds'),
('opening_card', 'A♠', 'Current opening card for the game');

-- Insert default stream settings
INSERT INTO stream_settings (setting_key, setting_value, description) VALUES
('stream_url', 'hero images/uhd_30fps.mp4', 'Default stream URL for offline status'),
('stream_title', 'Andar Bahar Live Game', 'Stream title'),
('stream_status', 'offline', 'Current stream status (live/offline/maintenance)'),
('stream_description', 'Live Andar Bahar game streaming', 'Stream description'),
('stream_quality', '720p', 'Stream quality setting'),
('stream_delay', '0', 'Stream delay in seconds'),
('backup_stream_url', '', 'Backup stream URL'),
('stream_embed_code', '', 'Custom embed code for live streaming');

-- Insert default admin accounts (passwords are already hashed)
INSERT INTO admins (username, email, full_name, password_hash, role, is_active) VALUES
('admin', 'admin@reddyanna.com', 'System Administrator', '$2a$10$NffV80ge6uVdYo5ltJsSk.dLTX8a/NWCkhYohvq1ndx0K3dzelQdG', 'super_admin', TRUE),
('reddy', 'reddy@reddyanna.com', 'Reddy Anna', '$2a$10$zIWYFvKfxiGK8JCeoJt9Y.EOKY3mXQX1C3Bptir7/uJOjJ0hu1VFO', 'admin', TRUE),
('superadmin', 'super@reddyanna.com', 'Super Admin', '$2a$10$NaoVEEgRDeudm23XS3W2geinQIYuAkmbmUI2RrmYTwoY0v1FUK8xq', 'super_admin', TRUE);
```

## Part 2: Backend Setup for PostgreSQL

### Step 1: Update Backend Dependencies

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Update package.json to use PostgreSQL:
   ```json
   {
     "dependencies": {
       "bcryptjs": "^2.4.3",
       "cors": "^2.8.5",
       "dotenv": "^16.4.5",
       "express": "^4.19.2",
       "express-validator": "^7.2.0",
       "pg": "^8.11.3"
     }
   }
   ```

3. Install the PostgreSQL client:
   ```bash
   npm install pg
   ```

### Step 2: Update Database Connection

Create a new file `backend/src/db-postgres.js`:

```javascript
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Supabase
});

// Test connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err);
});

export default pool;
```

### Step 3: Update .env File

Create a new `.env` file in the backend directory:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

Replace `[YOUR-PASSWORD]` and `[YOUR-PROJECT-REF]` with your actual Supabase credentials.

## Part 3: Backend Deployment (Render)

### Step 1: Prepare Backend for Render

1. Update `backend/package.json` with a start script:
   ```json
   {
     "scripts": {
       "start": "node server.js",
       "dev": "nodemon server.js"
     }
   }
   ```

2. Create a `backend/render.yaml` file:
   ```yaml
   services:
     - type: web
       name: reddy-anna-backend
       env: node
       plan: free
       buildCommand: "npm install"
       startCommand: "npm start"
       envVars:
         - key: DATABASE_URL
           sync: false
   ```

### Step 2: Deploy to Render

1. Push your backend code to a GitHub repository
2. Go to [render.com](https://render.com) and sign up
3. Click "New" > "Web Service"
4. Connect your GitHub account
5. Select the repository with your backend code
6. Configure the service:
   - Name: `reddy-anna-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free`
7. Add environment variable:
   - Key: `DATABASE_URL`
   - Value: Your Supabase connection string
8. Click "Create Web Service"
9. Wait for deployment to complete

### Step 3: Test Backend API

1. Once deployed, click on your service URL
2. Test the API endpoints:
   - `https://your-app.onrender.com/api/auth/login`
   - You should see a JSON response

## Part 4: Frontend Deployment (Netlify)

### Step 1: Configure Backend URL

1. Open `config.js` in the root directory
2. Update the production URL with your Render URL:
   ```javascript
   production: {
     API_BASE_URL: 'https://your-app.onrender.com'  // Replace with your Render URL
   }
   ```

### Step 2: Update Netlify Configuration

1. Open `netlify.toml`
2. Update the API redirect URL:
   ```toml
   [[redirects]]
   from = "/api/*"
   to = "https://your-app.onrender.com/api/:splat"  // Replace with your Render URL
   status = 200
   force = true
   ```

### Step 3: Deploy to Netlify

1. Push your code to GitHub
2. Log in to Netlify
3. Click "New site from Git"
4. Select your repository
5. Configure build settings:
   - Build command: Leave blank
   - Publish directory: Leave blank (root)
6. Click "Deploy site"

## Part 5: Testing and Verification

### Test API Connection

1. Open your Netlify site
2. Try to login with default admin credentials:
   - Username: `admin`
   - Password: `admin123`
3. If login works, your setup is correct

### Test Database Connection

1. Check your Supabase dashboard
2. Go to Table Editor
3. Verify the tables were created
4. Check if data is being saved when users register

## Part 6: Free Tier Limitations

### Netlify (Free)
- 100GB bandwidth/month
- 300 build minutes/month
- 1 site per account
- Custom domains supported

### Render (Free)
- 750 hours/month of runtime
- Auto-sleep after 15 minutes of inactivity
- Cold starts (~30 seconds)
- No custom domains on free tier

### Supabase (Free)
- 500MB database storage
- 50MB file storage
- 2GB bandwidth/month
- 50,000 active users/month
- Auto-pause after 1 week of inactivity

## Part 7: Optimization for Free Tiers

### Prevent Render Sleep

1. Use a monitoring service like UptimeRobot
2. Set up a cron job to ping your service every 10 minutes
3. Create a simple health endpoint

### Optimize Database Usage

1. Implement connection pooling
2. Cache frequently accessed data
3. Optimize queries
4. Clean up old data regularly

### Reduce Bandwidth

1. Optimize images and assets
2. Implement lazy loading
3. Use compression
4. Minimize API calls

## Troubleshooting

### Common Issues

#### Backend Not Responding
1. Check Render dashboard for service status
2. Review deployment logs
3. Verify environment variables

#### Database Connection Issues
1. Check Supabase connection string
2. Verify SSL settings
3. Check if database is paused

#### CORS Issues
1. Update CORS settings in backend
2. Verify frontend URL is allowed
3. Check preflight requests

### Getting Help

1. Check service dashboards for logs
2. Review documentation:
   - [Netlify Docs](https://docs.netlify.com)
   - [Render Docs](https://render.com/docs)
   - [Supabase Docs](https://supabase.com/docs)
3. Search error messages online

## Security Checklist

- [ ] Change default admin passwords
- [ ] Enable SSL everywhere
- [ ] Validate all user inputs
- [ ] Use environment variables for secrets
- [ ] Monitor for suspicious activity
- [ ] Keep dependencies updated

## Next Steps

Once your free deployment is working:

1. Monitor usage to stay within free limits
2. Set up alerts for bandwidth/storage usage
3. Consider upgrading plans as your user base grows
4. Implement automated backups
5. Set up monitoring and analytics

Congratulations! Your Reddy Anna Kossu gaming platform is now deployed using only free services.
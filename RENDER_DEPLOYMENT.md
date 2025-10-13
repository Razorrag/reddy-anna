# Render Deployment Guide for Reddy Anna Kossu Backend

This guide will walk you through deploying your backend to Render using the free tier.

## Prerequisites

1. Your code is pushed to GitHub (https://github.com/Razorrag/reddy-anna.git)
2. Your Supabase database is set up with the schema imported
3. You have a Render account (sign up at [render.com](https://render.com))

## Step 1: Prepare Your Repository

1. Make sure all your changes are committed and pushed to GitHub:
   ```bash
   git add .
   git commit -m "Update backend for Supabase and Render deployment"
   git push origin master
   ```

## Step 2: Create a New Web Service on Render

1. Log in to your Render dashboard
2. Click **New** > **Web Service**
3. Click **Connect to GitHub repository**
4. Authorize Render to access your GitHub account
5. Select the `Razorrag/reddy-anna` repository
6. Select the `master` branch

## Step 3: Configure the Web Service

### Basic Settings
- **Name**: `reddy-anna-backend`
- **Environment**: `Node`
- **Region**: Choose the region closest to your users
- **Branch**: `master`
- **Root Directory**: `backend` (important!)

### Build Settings
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Environment Variables
Add these environment variables:

1. **PORT**
   - Key: `PORT`
   - Value: `4000`

2. **SUPABASE_URL**
   - Key: `SUPABASE_URL`
   - Value: `https://ktblkbkulozdfefsxuez.supabase.co`

3. **SUPABASE_ANON_KEY**
   - Key: `SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YmxrYmt1bG96ZGZlZnN4dWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyNjEyNzksImV4cCI6MjA3NTgzNzI3OX0.mUTcae0WPFzUGuUWBa1wg7e3wPJmZMWKa5GAj5oWkBA`

4. **SUPABASE_SERVICE_ROLE_KEY**
   - Key: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0YmxrYmt1bG96ZGZlZnN4dWV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDI2MTI3OSwiZXhwIjoyMDc1ODM3Mjc5fQ.FtSDB1TDzbbxYryyifumhTRZfnArZ940iBZHnqtSJPo`

## Step 4: Advanced Settings

### Instance Type
- Select **Free** instance type

## Step 5: Deploy

1. Click **Create Web Service**
2. Wait for the deployment to complete (this may take a few minutes)
3. Once deployed, you'll see your service URL like `https://reddy-anna-backend.onrender.com`

## Step 6: Test Your Deployment

1. Click on your service URL to open it
2. Test the health endpoint: `https://your-app.onrender.com/health`
   - You should see: `{"ok": true}`
3. Test the API endpoints:
   - `https://your-app.onrender.com/api/auth/login`
   - `https://your-app.onrender.com/api/game/settings`

## Step 7: Update Frontend Configuration

1. Open `config.js` in your project root
2. Update the production URL:
   ```javascript
   production: {
     API_BASE_URL: 'https://your-app.onrender.com'  // Replace with your actual Render URL
   }
   ```

3. Open `netlify.toml`
4. Update the redirect URL:
   ```toml
   [[redirects]]
   from = "/api/*"
   to = "https://your-app.onrender.com/api/:splat"  // Replace with your actual Render URL
   status = 200
   force = true
   ```

## Step 8: Troubleshooting

### If Deployment Fails

1. Check the deployment logs in Render dashboard
2. Common issues:
   - Missing dependencies: Make sure `package.json` is correct
   - Wrong root directory: Ensure it's set to `backend`
   - Environment variables: Double-check all values

### If API Returns Errors

1. Check the logs in Render dashboard
2. Verify Supabase connection:
   - Ensure Supabase URL and keys are correct
   - Check if database schema is imported

### If Service Keeps Sleeping

Render's free tier puts services to sleep after 15 minutes of inactivity. To keep it awake:

1. Use a monitoring service like UptimeRobot
2. Set it to ping your health endpoint every 10 minutes
3. URL to ping: `https://your-app.onrender.com/health`

## Step 9: Deploy Frontend to Netlify

Once the backend is working:

1. Push your updated config.js and netlify.toml to GitHub
2. Netlify will automatically rebuild with the new backend URL
3. Test the full application

## Free Tier Limitations

- **Render**: 750 hours/month (auto-sleeps after 15 minutes)
- **Cold Starts**: First request after sleep may take ~30 seconds
- **No Custom Domains**: On free tier, you'll use the `.onrender.com` URL

## Next Steps

1. Monitor your Render service for any issues
2. Set up logging and monitoring
3. Consider upgrading to a paid plan if you need more uptime
4. Implement automated backups for your Supabase database

Congratulations! Your Reddy Anna Kossu backend is now deployed on Render.
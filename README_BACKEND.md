# Reddy Anna Kossu - Backend Deployment Guide

This guide explains how the backend works and how to deploy it for production use with your Netlify frontend.

## Backend Architecture

The Reddy Anna Kossu backend is built with:
- **Node.js** with Express framework
- **MySQL** database for data storage
- **JWT** for authentication (if implemented)
- **bcryptjs** for password hashing
- **CORS** for cross-origin requests

## API Endpoints

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/admin/login` - Admin login
- `PUT /api/auth/change-password` - Change user password
- `GET /api/auth/dashboard` - Get user dashboard data
- `PUT /api/auth/profile` - Update user profile

### Game Settings Endpoints
- `GET /api/game/settings` - Get game settings
- `PUT /api/game/settings` - Update game settings (admin only)

## Database Schema

The backend uses these main tables:
- `users` - User accounts and profiles
- `admins` - Administrator accounts
- `game_settings` - Game configuration
- `stream_settings` - Streaming configuration
- `blocked_users` - Blocked user list

## Deployment Options

### Option 1: Heroku (Recommended for Beginners)

1. Install Heroku CLI
2. Login to Heroku:
   ```bash
   heroku login
   ```

3. Create a new Heroku app:
   ```bash
   heroku create your-app-name
   ```

4. Add MySQL addon:
   ```bash
   heroku addons:create cleardb:ignite
   ```

5. Set environment variables:
   ```bash
   heroku config:set DB_HOST=<your-db-host>
   heroku config:set DB_USER=<your-db-user>
   heroku config:set DB_PASSWORD=<your-db-password>
   heroku config:set DB_NAME=<your-db-name>
   heroku config:set PORT=4000
   ```

6. Deploy to Heroku:
   ```bash
   git subtree push --prefix backend heroku main
   ```

### Option 2: Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy the backend:
   ```bash
   cd backend
   vercel --prod
   ```

3. Set environment variables in Vercel dashboard

### Option 3: DigitalOcean/VPS

1. Rent a VPS (DigitalOcean, Vultr, etc.)
2. Install Node.js and MySQL
3. Upload your backend files
4. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
5. Set up PM2 for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "reddy-anna-backend"
   ```
6. Set up Nginx as reverse proxy (optional)

### Option 4: AWS EC2

1. Launch an EC2 instance
2. Install Node.js, MySQL, and Git
3. Clone your repository
4. Install dependencies and start the server
5. Configure security groups to allow port 4000

## Database Setup

### MySQL Installation

1. Install MySQL Server on your chosen platform
2. Create a database:
   ```sql
   CREATE DATABASE annar_db;
   ```

3. Import the schema:
   ```bash
   mysql -u username -p annar_db < backend/db.sql
   ```

### Environment Configuration

Update the `.env` file in the backend directory:

```env
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=annar_db
```

## Running the Backend

### Local Development

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

The backend will run on `http://localhost:4000`

### Production

1. Ensure all environment variables are set
2. Install dependencies
3. Start the server using PM2 or your hosting platform's tools

## CORS Configuration

The backend is configured to accept requests from your frontend. In production, update the CORS origin:

```javascript
// In backend/server.js
const corsOptions = {
  origin: ['https://your-netlify-site.netlify.app', 'http://localhost:3000'],
  credentials: true
};
```

## Security Considerations

1. Use HTTPS in production
2. Validate all user inputs
3. Implement rate limiting
4. Use environment variables for sensitive data
5. Keep dependencies updated
6. Implement proper authentication and authorization

## Monitoring and Logging

1. Use a logging service like Winston
2. Monitor server performance
3. Set up alerts for errors
4. Regular database backups

## Scaling Considerations

1. Use connection pooling for database
2. Implement caching for frequent requests
3. Consider using a CDN for static assets
4. Use load balancers for high traffic

## Troubleshooting

### Database Connection Issues
1. Check database credentials
2. Verify database server is running
3. Check network connectivity

### API Not Responding
1. Check server logs
2. Verify port is not blocked
3. Check environment variables

### CORS Errors
1. Verify frontend URL is in CORS allowed origins
2. Check if credentials are included

## Connecting Frontend to Backend

Once your backend is deployed:

1. Update the production URL in `config.js`:
   ```javascript
   production: {
     API_BASE_URL: 'https://your-backend-url.com'
   }
   ```

2. Update the Netlify redirects in `netlify.toml`:
   ```toml
   [[redirects]]
   from = "/api/*"
   to = "https://your-backend-url.com/api/:splat"
   status = 200
   force = true
   ```

3. Redeploy your frontend to Netlify

## Default Admin Accounts

The database is pre-populated with these admin accounts:
- Username: `admin`, Password: `admin123`
- Username: `reddy`, Password: `reddy123`
- Username: `superadmin`, Password: `super123`

**Important:** Change these passwords in production!
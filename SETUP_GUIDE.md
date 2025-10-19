# Reddy Anna Andar Bahar Game - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Running the Application](#running-the-application)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **PostgreSQL** (v14 or higher) OR a **Supabase** account
- **FFmpeg** (for RTMP streaming) - [Download](https://ffmpeg.org/download.html)
- **Git** (for version control)

---

## 📦 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd reddy-anna
```

### 2. Install Dependencies
```bash
npm install
```

This will install all required packages for both the server and client.

---

## 🗄️ Database Setup

### Option A: Using Supabase (Recommended)

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Wait for the project to be provisioned

2. **Run the Database Schema**
   - Open the Supabase SQL Editor
   - Copy the contents of `supabase_schema_unified.sql`
   - Paste and execute in the SQL Editor
   - Verify all tables are created successfully

3. **Get Your API Keys**
   - Go to Settings → API
   - Copy the `URL` and `anon/public` key
   - Copy the `service_role` key (keep this secret!)

### Option B: Using Local PostgreSQL

1. **Create Database**
```bash
createdb andar_bahar
```

2. **Run Schema**
```bash
psql -d andar_bahar -f supabase_schema_unified.sql
```

---

## ⚙️ Environment Configuration

### 1. Create Environment File
```bash
cp .env.example .env
```

### 2. Update Configuration

Edit `.env` with your actual values:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Session Secret (generate a secure random string)
SESSION_SECRET=your-generated-secret-key
```

### 3. Generate Session Secret

Run this command to generate a secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as your `SESSION_SECRET` in `.env`.

---

## 🚀 Running the Application

### Development Mode

#### Option 1: Run Both Server and Client Together
```bash
npm run dev:both
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend client on `http://localhost:5173` (Vite dev server)
- WebSocket server on `ws://localhost:5000/ws`
- RTMP server on port `1935`

#### Option 2: Run Separately

**Terminal 1 - Server:**
```bash
npm run dev:server
```

**Terminal 2 - Client:**
```bash
npm run dev:client
```

### Production Mode

1. **Build the Application**
```bash
npm run build
```

2. **Start Production Server**
```bash
npm start
```

The application will be available at `http://localhost:5000`.

---

## 🧪 Testing

### Create Test Users

The unified schema automatically creates test users:
- **Username:** `testplayer1` / **Password:** `password123`
- **Username:** `testplayer2` / **Password:** `password123`
- **Username:** `admin` / **Password:** `admin123`

**Note:** These passwords are plain text in the schema. After first login, they will be hashed automatically.

### Test the Game Flow

1. **Access Admin Panel**
   - Navigate to `http://localhost:5173/admin-game`
   - Select an opening card
   - Start the game timer

2. **Access Player Interface**
   - Open a new browser window
   - Navigate to `http://localhost:5173/player-game`
   - Login with test credentials
   - Place bets during the betting phase

3. **Test WebSocket Connection**
   - Open browser DevTools → Console
   - Look for "WebSocket connected successfully"
   - Verify real-time updates between admin and player views

---

## 🌐 Deployment

### Deploying to Production

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Update all URLs to production domains
   - Use secure, randomly generated secrets

2. **Database**
   - Ensure RLS policies are properly configured
   - Set up database backups
   - Monitor connection pool limits

3. **Security Checklist**
   - ✅ All passwords are hashed with bcrypt
   - ✅ Rate limiting is enabled
   - ✅ CORS is properly configured
   - ✅ Session secrets are secure
   - ✅ Environment variables are not committed to git

4. **WebSocket Configuration**
   - Ensure WebSocket connections are properly proxied
   - Use WSS (secure WebSocket) in production
   - Configure load balancer for sticky sessions

5. **RTMP Streaming**
   - Configure firewall rules for port 1935
   - Set up SSL/TLS for RTMPS
   - Configure CDN for HLS streaming

---

## 🔍 Troubleshooting

### Common Issues

#### 1. WebSocket Connection Failed

**Problem:** Client cannot connect to WebSocket server

**Solutions:**
- Verify server is running on the correct port
- Check firewall settings
- Ensure `VITE_WS_BASE_URL` matches server port
- Check browser console for CORS errors

#### 2. Database Connection Error

**Problem:** Cannot connect to Supabase/PostgreSQL

**Solutions:**
- Verify database credentials in `.env`
- Check if Supabase project is active
- Ensure IP is whitelisted in Supabase settings
- Test connection with `psql` or Supabase dashboard

#### 3. Authentication Fails

**Problem:** Login/signup returns errors

**Solutions:**
- Check if users table exists
- Verify password hashing is working
- Check browser console for detailed errors
- Ensure rate limiting hasn't blocked your IP

#### 4. Cards Not Dealing

**Problem:** Admin cannot deal cards

**Solutions:**
- Verify game session is created
- Check WebSocket connection status
- Ensure opening card is set
- Check server logs for errors

#### 5. RTMP Stream Not Working

**Problem:** Video stream not loading

**Solutions:**
- Verify FFmpeg is installed
- Check RTMP server is running (port 1935)
- Verify stream URL in settings
- Check HLS server is running (port 8000)

### Debug Mode

Enable detailed logging:
```env
LOG_LEVEL=debug
WS_DEBUG=true
```

Then restart the server and check logs for detailed information.

---

## 📚 Additional Resources

### Project Structure
```
reddy-anna/
├── client/              # Frontend React application
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── contexts/    # React contexts
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities
│   └── public/          # Static assets
├── server/              # Backend Express application
│   ├── lib/             # Server utilities
│   ├── middleware/      # Express middleware
│   ├── types/           # TypeScript types
│   └── routes.ts        # API routes
├── shared/              # Shared code between client/server
└── scripts/             # Utility scripts
```

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration

#### Game Management
- `GET /api/game/current` - Get current game state
- `POST /api/game/set-opening-card` - Set opening card
- `POST /api/game/deal-card` - Deal a card
- `POST /api/game/start-timer` - Start betting timer

#### Settings
- `GET /api/settings` - Get game settings
- `POST /api/settings` - Update game settings
- `GET /api/game/stream-settings` - Get stream settings
- `POST /api/game/update-stream-settings` - Update stream settings

### WebSocket Events

#### Client → Server
- `authenticate` - Authenticate WebSocket connection
- `place_bet` - Place a bet
- `game_start` - Start new game
- `card_dealt` - Deal a card
- `sync_request` - Request game state sync

#### Server → Client
- `authenticated` - Authentication confirmation
- `sync_game_state` - Full game state update
- `timer_update` - Timer countdown update
- `card_dealt` - Card dealt notification
- `game_complete` - Game completion notification
- `betPlaced` - Bet placed notification

---

## 🆘 Support

If you encounter issues not covered in this guide:

1. Check the `FIXES_APPLIED.md` file for known issues
2. Review server logs for detailed error messages
3. Check browser console for client-side errors
4. Verify all environment variables are correctly set

---

## 📝 License

[Add your license information here]

---

**Last Updated:** [Current Date]
**Version:** 1.0.0

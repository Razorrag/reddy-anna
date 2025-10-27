# Reddy Anna - Andar Bahar Game Platform

A real-time multiplayer Andar Bahar card game with live streaming, built with modern web technologies.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL (via Supabase)
- Redis (for production)

### Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd reddy-anna
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials and secrets
   ```

3. **Run Development Server**
   ```bash
   npm run dev:both
   # Server: http://localhost:5000
   # Client: http://localhost:5173
   ```

## 📦 Production Deployment

### Build for Production

```bash
# Build both client and server
npm run build

# Start production server
npm start
```

### Environment Variables (Production)

**Required:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `JWT_SECRET` - Secure JWT secret (min 32 chars)
- `SESSION_SECRET` - Secure session secret
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `REDIS_URL` - Redis connection URL (for scalable state management)

**Optional:**
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Set to `production`

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure `REDIS_URL` for state management
- [ ] Set secure `JWT_SECRET` and `SESSION_SECRET`
- [ ] Configure `ALLOWED_ORIGINS` with your domain
- [ ] Enable HTTPS (cookies require secure flag)
- [ ] Run database migrations (see `database_schema_fixed.sql`)

## 🏗️ Architecture

### Tech Stack
- **Frontend:** React, TypeScript, TailwindCSS, Vite
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL (Supabase)
- **Real-time:** WebSockets (ws library)
- **State Management:** Redis (production) / In-memory (development)
- **Authentication:** JWT + Session-based

### Project Structure
```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # React contexts (WebSocket, Auth, etc.)
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities
│   └── public/          # Static assets
├── server/              # Express backend
│   ├── index.ts         # Server entry point
│   ├── auth.ts          # Authentication logic
│   ├── routes.ts        # API routes
│   ├── state-manager.ts # State management abstraction
│   └── security.ts      # Security middleware
├── shared/              # Shared types and schemas
├── scripts/             # Build and utility scripts
├── docs/                # Documentation
└── database_schema_fixed.sql  # Database schema with ENUM types
```

## 🔐 Security Features

- ✅ JWT-based authentication with refresh tokens
- ✅ Bcrypt password hashing (12 rounds)
- ✅ Rate limiting on all endpoints
- ✅ CORS protection with configurable origins
- ✅ Helmet security headers
- ✅ XSS protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ Session security (httpOnly, secure cookies in production)

## 🧪 Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Interactive UI
npm run test:ui
```

## 🔧 Development Scripts

```bash
npm run dev              # Start server only
npm run dev:client       # Start client only
npm run dev:both         # Start both (recommended)
npm run build            # Build for production
npm run start            # Run production build
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run check            # TypeScript type checking
```

## 📊 Database Schema

The project uses PostgreSQL with proper ENUM types for data integrity:

- `user_role` - player, admin, super_admin
- `user_status` - active, suspended, banned, inactive
- `game_phase` - idle, betting, dealing, complete
- `transaction_type` - deposit, withdrawal, bet, win, refund, bonus
- `transaction_status` - pending, completed, failed, cancelled

See `database_schema_fixed.sql` for the complete schema.

## 🐛 Known Issues & Limitations

### Development
- In-memory state storage (not persistent)
- Single server instance only

### Production Requirements
- Redis required for multi-server deployment
- HTTPS required for secure cookies
- Manual payment approval system (not automated)

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new player
- `POST /api/auth/login` - Player login
- `POST /api/auth/admin/login` - Admin login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout

### Game Endpoints
- `GET /api/game/current` - Get current game state
- `POST /api/game/start` - Start new game (admin only)
- `POST /api/game/deal-card` - Deal card (admin only)

### Player Endpoints
- `GET /api/player/profile` - Get player profile
- `GET /api/player/balance` - Get current balance
- `POST /api/player/bet` - Place bet (WebSocket preferred)

### Admin Endpoints
- `GET /api/admin/users` - List all users
- `GET /api/admin/requests` - List deposit/withdrawal requests
- `POST /api/admin/requests/:id/approve` - Approve request
- `POST /api/admin/requests/:id/reject` - Reject request

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues and questions:
- Check the `docs/` folder for detailed guides
- Review `docs/archive/` for historical fixes
- Open an issue on GitHub

---

**Note:** This is a gambling application. Ensure compliance with local laws and regulations before deployment.

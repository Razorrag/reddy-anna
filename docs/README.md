# Andar Bahar Game

This is a real-time multiplayer Andar Bahar card game with admin and player interfaces.

## Live Demo
- Admin Interface: `https://your-railway-app-name.railway.app/admin-game`
- Player Interface: `https://your-railway-app-name.railway.app/player-game`

## Features
- Real-time multiplayer game with WebSocket synchronization
- Multi-round betting system (Round 1, Round 2, Round 3)
- Admin panel to control the game
- Player betting interface
- Real-time game state synchronization
- Complete payout system

## Tech Stack
- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express, WebSocket
- Database: Supabase
- Styling: Tailwind CSS, Radix UI components

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Access the application:
- Admin: http://localhost:5000/admin-game
- Player: http://localhost:5000/player-game

## Deployment on Railway

1. Push your code to a GitHub repository
2. Connect your GitHub repo to Railway
3. Railway will automatically deploy using the railway.toml configuration
4. Add your environment variables in the Railway dashboard

## Environment Variables

Required environment variables:
- `NODE_ENV`: Set to "production" for production deployments
- `PORT`: Provided automatically by Railway
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Your Supabase service role key
- `SESSION_SECRET`: Secret for session management
- `VITE_SUPABASE_URL`: Frontend Supabase URL (for Vite)
- `VITE_SUPABASE_ANON_KEY`: Frontend Supabase anon key

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run db:push` - Push database schema changes

## Architecture

The application has two main interfaces:
- Admin Interface: For starting games, selecting cards, dealing cards
- Player Interface: For placing bets and viewing game status

All game state is synchronized in real-time using WebSockets.
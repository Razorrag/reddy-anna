# Andar Bahar Game Implementation

A professional Andar Bahar game with superior mobile layout and robust backend integration.

## Features

### Player Interface (`start-game.html`)
- **Responsive Three-Column Layout**: Equal-width panels that maintain proportions on all screen sizes
- **Mobile-Optimized Design**: Maintains professional appearance on mobile devices
- **Real-Time Game State**: Synchronizes with backend for live game updates
- **Dynamic Chip Selection**: Shows selected chip value instead of static image
- **Betting Functionality**: Place bets on Andar or Bahar with proper validation
- **Timer Synchronization**: Real-time timer updates from backend
- **Connection Status**: Visual indicator for backend connectivity

### Admin Interface (`game-admin.html`)
- **Game Control Panel**: Complete game management interface
- **Opening Card Selection**: Set opening cards for new games
- **Timer Control**: Start/stop timers for different rounds
- **Betting Totals Management**: Submit and track betting amounts
- **Card Selection**: Select cards for Andar and Bahar sides
- **Game Settings**: Configure bet limits and timer duration
- **Real-Time Updates**: Live status updates every 2-5 seconds

### Backend API (`backend/`)
- **Separate Endpoints**: Dedicated endpoints for different aspects of game state
- **Real-Time Updates**: Optimized for frequent updates without performance issues
- **Game State Management**: Sophisticated state tracking with proper round management
- **Timer Control**: Backend-controlled timer with precise state management
- **Database Integration**: Supabase database integration with fallback to in-memory storage

## Technical Architecture

### Frontend-Backend Communication
- **State Endpoint** (`/api/game/state`): General game state (phase, timer, winner, etc.)
- **Betting Amounts Endpoint** (`/api/game/betting-amounts`): Just betting amounts (updates every 2 seconds)
- **Game Settings Endpoint** (`/api/game/settings`): Configure game parameters
- **Timer Control Endpoint** (`/api/game/start-timer`): Start timer for rounds
- **Card Selection Endpoint** (`/api/game/select-cards`): Submit card selections

### Game State Management
- **New Game Detection**: gameId field helps frontend detect new games
- **Round Management**: Clear distinction between different rounds
- **Phase Tracking**: Proper phase tracking for round completion
- **Selected Cards**: Separate arrays for Andar and Bahar cards
- **Betting Amounts**: Round-specific betting totals

### Performance Optimizations
- **Separate API Calls**: Betting amounts updated every 2 seconds, game state every 5 seconds
- **Targeted Updates**: Only update necessary UI elements without full refresh
- **Efficient Data Transfer**: Minimize data payload for frequent updates
- **Connection Status**: Visual feedback for backend connectivity

## File Structure

```
├── start-game.html          # Player interface
├── game-admin.html          # Admin interface
├── config.js                # Configuration for different environments
├── styles.css               # Global styles
├── backend/
│   ├── package.json
│   ├── server.js            # Main server file
│   └── src/
│       ├── routes/
│       │   ├── gameSettings.js  # Game settings and state management
│       │   └── auth.js          # Authentication routes
│       └── db-supabase.js      # Database connection
├── TESTING_GUIDE.md         # Comprehensive testing guide
└── README.md               # This file
```

## Getting Started

### Prerequisites
- Node.js 18+ (for running the backend)
- Supabase account (optional, fallback to in-memory storage)
- Modern web browser with JavaScript support

### Running the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   node server.js
   ```

4. The server should start on port 4000 (or the port specified in your environment variables).

### Running the Frontend

1. Open `start-game.html` in a web browser for the player interface
2. Open `game-admin.html` in a web browser for the admin interface

### Testing

Run the API test script to verify backend functionality:
```bash
node test-api.js
```

## API Endpoints

### Game State
- `GET /api/game/state` - Get general game state
- `GET /api/game/betting-amounts` - Get betting amounts (updates every 2 seconds)
- `GET /api/game/game-state` - Get complete game state (legacy endpoint)

### Game Control
- `POST /api/game/set-opening-card` - Set opening card for new game
- `POST /api/game/start-timer` - Start timer for a round
- `POST /api/game/update-timer` - Update timer countdown
- `POST /api/game/submit-bets` - Submit betting totals
- `POST /api/game/select-cards` - Select cards for a round
- `POST /api/game/reset-game` - Reset game state

### Game Settings
- `GET /api/game/settings` - Get game settings
- `PUT /api/game/settings` - Update game settings
- `GET /api/game/stream-settings` - Get stream settings
- `PUT /api/game/stream-settings` - Update stream settings

## Mobile Responsiveness

The player interface maintains a professional three-column layout on all screen sizes:

- **Desktop**: Full three-column layout with all controls visible
- **Tablet**: Adjusted spacing for medium screens
- **Mobile**: Optimized three-column layout with touch-friendly controls

The key design principle is that the betting areas (Andar, Central Card, Bahar) maintain equal proportions on all devices, ensuring a consistent experience.

## Deployment Options

### Option 1: Local Development
- Run the backend server locally
- Open the HTML files directly in a browser
- Use local file:// protocol for testing

### Option 2: Heroku Deployment
- Use the provided `backend/deploy-heroku.sh` script
- Follow the Heroku deployment guide

### Option 3: Render Deployment
- Use the provided `backend/render.yaml` file
- Follow the Render deployment guide

### Option 4: Custom Server
- Deploy the backend to any Node.js hosting service
- Update the API_BASE_URL in config.js to point to your server

## Browser Compatibility

The implementation is tested and compatible with:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Security Considerations

- Input validation on both client and server
- SQL injection prevention
- XSS protection
- Rate limiting considerations
- Authentication (to be implemented in production)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- WhatsApp: +91 8686868686
- Email: support@reddyannakossu.com

---

**Note**: This is a demonstration implementation. For production use, additional security measures, authentication, and testing should be implemented.
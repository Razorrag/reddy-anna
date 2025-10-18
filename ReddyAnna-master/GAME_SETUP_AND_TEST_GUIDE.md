# Reddy Anna Andar Bahar Game - Setup and Test Guide

## Overview
This guide will help you set up and test the complete Andar Bahar game flow. The game consists of:
- **Backend Server**: Node.js/Express server with WebSocket support
- **Admin Panel**: Game control interface for administrators
- **User Interface**: Game interface for players to place bets
- **Real-time Synchronization**: WebSocket-based communication between admin and users

## Fixed Issues
The following issues have been resolved to make the game work properly:

1. **WebSocket Connection Initialization**: Fixed missing WebSocket instance creation
2. **Game State Synchronization**: Improved real-time sync between admin and users
3. **Timer Functionality**: Fixed timer countdown and betting phase management
4. **Card Dealing Logic**: Fixed proper side determination (Andar/Bahar alternation)
5. **Winner Determination**: Fixed detection of winning cards
6. **Betting System**: Added missing bet placement endpoint and validation
7. **Stream Settings**: Added missing stream settings update endpoint

## Quick Start (Windows)

### Option 1: Using the Batch Script
1. Double-click on `start-and-test.bat`
2. Wait for the server to start
3. Three browser tabs will open automatically:
   - Test Page
   - Admin Panel
   - User Game Interface

### Option 2: Manual Setup
1. Open Command Prompt
2. Navigate to the project directory
3. Run the following commands:
   ```bash
   cd backend
   npm install
   npm start
   ```
4. Open your browser and navigate to:
   - Test Page: http://localhost:4001/test-complete-game-flow.html
   - Admin Panel: http://localhost:4001/game-admin.html
   - User Game: http://localhost:4001/start-game.html

## Quick Start (Linux/Mac)

1. Open Terminal
2. Navigate to the project directory
3. Make the script executable:
   ```bash
   chmod +x start-and-test.sh
   ```
4. Run the script:
   ```bash
   ./start-and-test.sh
   ```

## Game Flow Testing

### Step 1: Verify Backend Connection
1. Open the test page (test-complete-game-flow.html)
2. Click "Test Backend Connection"
3. Verify you see a "Connected" status

### Step 2: Verify WebSocket Connection
1. Click "Test WebSocket Connection"
2. Verify WebSocket status shows "Connected"

### Step 3: Run Complete Game Flow Test
1. Click "Run Complete Game Flow Test"
2. Wait for all tests to complete
3. Verify all tests show "PASSED" status

### Step 4: Manual Game Flow Test

#### Admin Actions:
1. Open the admin panel (game-admin.html)
2. Select an opening card (e.g., A♠)
3. Click "Start Game"
4. Set the timer duration (e.g., 30 seconds)
5. Click "Start 1st Round"
6. Deal cards by clicking on them:
   - First card goes to Bahar
   - Second card goes to Andar
   - Continue alternating until you find a matching rank

#### User Actions:
1. Open the user game interface (start-game.html)
2. Wait for the opening card to appear
3. Select a chip value
4. Place bets on Andar or Bahar while timer is running
5. Watch as cards are dealt by the admin
6. See the winner announcement

## Game Rules

1. **Opening Card**: Admin selects a card that sets the target rank
2. **Betting Phase**: Users place bets on Andar or Bahar while timer counts down
3. **Card Dealing**: Admin deals cards alternately to Bahar (first) and Andar (second)
4. **Winning Condition**: The first card with the same rank as the opening card wins
5. **Payout**: Winning bets are paid 1:1

## Key Features

### Real-time Synchronization
- Opening card selection syncs immediately to all users
- Timer countdown is synchronized across all clients
- Card dealing is broadcast in real-time
- Betting stats update live

### Admin Controls
- Select opening card from full deck
- Set custom timer duration
- Deal cards manually with proper side determination
- View betting statistics
- Manage stream settings

### User Interface
- View opening card and game status
- Place bets with chip selection
- See live timer countdown
- Watch cards being dealt in real-time
- View game history

## Troubleshooting

### Backend Server Won't Start
- Check if port 4001 is already in use
- Verify Node.js is installed (version 14 or higher)
- Run `npm install` in the backend directory

### WebSocket Connection Fails
- Check if the backend server is running
- Verify the WebSocket URL matches your server URL
- Check browser console for error messages

### Timer Not Syncing
- Ensure WebSocket connection is established
- Check browser console for connection errors
- Refresh the page and reconnect

### Bets Not Working
- Verify the betting phase is active (timer running)
- Check if bet amount is within limits (₹1,000 - ₹50,000)
- Ensure user has sufficient balance

### Cards Not Showing
- Verify admin has selected an opening card
- Check WebSocket connection for card updates
- Refresh the user page if cards don't appear

## API Endpoints

### Game Settings
- `GET /api/game/settings` - Get game settings
- `PUT /api/game/settings` - Update game settings

### Game Control
- `POST /api/game/set-opening-card` - Set opening card
- `POST /api/game/start-timer` - Start game timer
- `POST /api/game/update-timer` - Update timer
- `POST /api/game/deal-card` - Deal a card

### Betting
- `POST /api/game/place-bet` - Place a bet
- `GET /api/game/betting-stats/:gameId` - Get betting statistics

### Stream Settings
- `GET /api/game/stream-settings` - Get stream settings
- `POST /api/game/update-stream-settings` - Update stream settings

## WebSocket Messages

### Client to Server
- `authenticate` - Authenticate user/admin
- `subscribe_game` - Subscribe to game updates
- `sync_request` - Request game state sync

### Server to Client
- `timer_update` - Timer countdown update
- `game_state_update` - Game state changes
- `card_dealt` - Card dealt notification
- `game_complete` - Game completion
- `betting_stats` - Betting statistics
- `phase_change` - Game phase changes

## Development Notes

### Database
The game uses an in-memory database for development. All data is reset when the server restarts.

### Authentication
Authentication is simplified for development. Users are identified by a userId parameter.

### Error Handling
The game includes comprehensive error handling with fallback mechanisms when the backend is unavailable.

## Testing
Use the test page (test-complete-game-flow.html) to verify all game components:
- Backend connectivity
- WebSocket connection
- Game settings
- Timer functionality
- Bet placement
- Card dealing
- Winner detection

## Support
For issues or questions:
1. Check the browser console for error messages
2. Verify all components are running (backend, admin, user)
3. Use the test page to diagnose specific issues
4. Check the game flow documentation for proper usage
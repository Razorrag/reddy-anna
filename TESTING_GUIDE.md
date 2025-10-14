# Andar Bahar Game Testing Guide

This guide provides instructions for testing the updated Andar Bahar game implementation with proper backend integration.

## Overview

The implementation includes:
1. **Player Interface** (`start-game.html`) - Mobile-optimized game interface
2. **Admin Interface** (`game-admin.html`) - Game control panel for administrators
3. **Backend API** (`backend/`) - RESTful API for game state management

## Testing Setup

### 1. Start the Backend Server

First, navigate to the backend directory and start the server:

```bash
cd backend
node server.js
```

The server should start on port 4000 (or the port specified in your environment variables).

### 2. Test API Endpoints

Open a new terminal or use API testing tools (like Postman) to verify the backend is working:

#### Check Health
```bash
curl http://localhost:4000/health
```
Expected response:
```json
{"ok": true}
```

#### Get Game Settings
```bash
curl http://localhost:4000/api/game/settings
```

#### Get Game State
```bash
curl http://localhost:4000/api/game/game-state
```

### 3. Test the Frontend

#### Player Interface Testing

1. Open `start-game.html` in a web browser
2. Verify the following:
   - The page loads without errors
   - The mobile layout is responsive (try resizing the browser)
   - Connection status shows "Connected" when backend is running
   - Game settings are loaded from the backend
   - Betting functionality works with proper validation

#### Admin Interface Testing

1. Open `game-admin.html` in a web browser
2. Verify the following:
   - The page loads without errors
   - Game status displays correctly
   - You can set an opening card
   - You can start/stop timers
   - You can submit betting totals
   - You can select cards for rounds

## Testing Scenarios

### Scenario 1: Basic Game Flow

1. **Admin Actions:**
   - Open `game-admin.html`
   - Set an opening card (e.g., "A♠")
   - Start Round 1 timer (30 seconds)
   - Submit betting totals for both sides
   - Select cards for Andar and Bahar

2. **Player Actions:**
   - Open `start-game.html`
   - Select a chip value
   - Place bets on Andar or Bahar
   - Verify betting limits are enforced
   - Check that bets are reflected in the UI

### Scenario 2: Timer Synchronization

1. **Admin Actions:**
   - Start a timer from the admin panel
   - Observe the countdown

2. **Player Actions:**
   - Verify the timer appears in the player interface
   - Check that betting is disabled when timer reaches 0

### Scenario 3: Offline Mode

1. **Backend Offline:**
   - Stop the backend server
   - Refresh the player interface
   - Verify the connection status shows "Disconnected"
   - Check that the game still functions with local/mock data

### Scenario 4: Mobile Responsiveness

1. **Responsive Testing:**
   - Open the player interface in a browser
   - Resize to mobile dimensions (or use developer tools)
   - Verify the three-column layout is maintained
   - Check that chip selection works properly on mobile
   - Ensure all controls are accessible on small screens

## Expected Features

### Player Interface (`start-game.html`)

- [x] Responsive three-column betting layout
- [x] Equal-width panels that maintain proportions
- [x] Chip selection panel that appears on demand
- [x] Backend integration for game state
- [x] Real-time timer synchronization
- [x] Proper betting validation
- [x] Connection status indicator
- [x] Recent results display
- [x] Opening card display

### Admin Interface (`game-admin.html`)

- [x] Game status monitoring
- [x] Opening card selection
- [x] Timer control for rounds
- [x] Betting totals submission
- [x] Card selection for game rounds
- [x] Game settings management
- [x] Game reset functionality
- [x] Connection status indicator

### Backend API

- [x] Game settings management
- [x] Game state tracking
- [x] Timer control
- [x] Betting totals handling
- [x] Card selection processing
- [x] Winner determination

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Ensure the backend server is running on the correct port
   - Check that `config.js` has the correct API_BASE_URL
   - Verify CORS is properly configured in the backend

2. **Timer Not Syncing**
   - Check browser console for JavaScript errors
   - Verify the backend timer endpoints are responding
   - Ensure the game state is being updated correctly

3. **Mobile Layout Issues**
   - Check for CSS errors in the browser console
   - Verify viewport meta tag is present
   - Test with different screen sizes

4. **Betting Not Working**
   - Verify game settings are loaded from backend
   - Check that betting limits are properly enforced
   - Ensure player balance is sufficient

### Debug Mode

To enable debug mode, open the browser console and look for:

- API request/response logs
- Game state updates
- Timer synchronization events
- Error messages with details

## Performance Testing

1. **Load Testing:**
   - Test with multiple simultaneous players
   - Monitor backend response times
   - Check for memory leaks

2. **Mobile Performance:**
   - Test on actual mobile devices
   - Check for smooth animations
   - Verify touch interactions work properly

## Security Considerations

1. **Input Validation:**
   - All user inputs should be validated on both client and server
   - Check for SQL injection vulnerabilities
   - Verify proper sanitization of card inputs

2. **Authentication:**
   - Currently using mock user IDs
   - Implement proper authentication in production
   - Add role-based access control for admin functions

## Conclusion

This testing guide covers the main functionality of the Andar Bahar game implementation. For a production deployment, additional testing should include:

- Comprehensive security testing
- Performance optimization
- User acceptance testing
- Cross-browser compatibility testing

If you encounter any issues during testing, please refer to the browser console for detailed error messages and check the backend logs for any server-side errors.
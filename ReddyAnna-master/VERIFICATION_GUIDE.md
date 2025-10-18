# Step-by-Step Verification Guide

## Step 1: Verify Backend WebSocket Implementation
**File to check**: `backend/src/websocket.js`

**What to verify**:
1. The file should include these broadcast functions:
   - `broadcastToGame(gameId, message)`
   - `broadcastTimerUpdate(gameId, timer, phase)`
   - `broadcastCardDealt(gameId, card, side, position)`
   - `broadcastBettingStats(gameId, andarBets, baharBets)`
   - `broadcastGameComplete(gameId, winner, winningCard, totalCards)`
   - `broadcastPhaseChange(gameId, phase, message)`

2. The `syncGameState` function should fetch from database and send complete game state

## Step 2: Verify Backend API Endpoints
**File to check**: `backend/src/routes/gameSettings.js`

**What to verify**:
1. `/update-timer` endpoint (around line 537):
   - Should accept `game_id` parameter
   - Should broadcast timer update using `broadcastTimerUpdate`

2. `/submit-bets` endpoint (around line 690):
   - Should accept `game_id` parameter
   - Should broadcast betting stats using `broadcastBettingStats`

3. `/deal-card` endpoint (around line 752):
   - Should accept `game_id` parameter
   - Should broadcast card dealt using `broadcastCardDealt`

## Step 3: Verify Frontend User Interface
**File to check**: `start-game.html`

**What to verify**:
1. WebSocket connection (around line 1126):
   - Should use `currentGameId = 'default-game'`

2. WebSocket message handling (around line 1187):
   - Should handle `timer_update`, `card_dealt`, `betting_stats`, `game_complete`, `phase_change` messages

3. Game state sync function (around line 1370):
   - Should update all game state properties from sync data

## Step 4: Verify Admin Synchronization Module
**File to check**: `admin-game-sync.js`

**What to verify**:
1. Global variables (around line 5):
   - Should use `currentGameId = 'default-game'`

2. API functions (around line 147):
   - `updateTimerInBackend` should include `game_id: currentGameId`
   - `updateBettingAmountsInBackend` should include `game_id: currentGameId`

## Step 5: Verify Admin Interface Integration
**File to check**: `game-admin.html`

**What to verify**:
1. Script reference (around line 2123203):
   - Should include `<script src="admin-game-sync.js"></script>`

## Step 6: Verification Test Procedure

**To test the implementation**:

1. **Start the backend server**:
   ```
   node backend/server.js
   ```

2. **Open the admin interface**:
   - Open `game-admin.html` in a browser
   - Check browser console for WebSocket connection messages

3. **Open the user interface**:
   - Open `start-game.html` in another browser tab
   - Check browser console for WebSocket connection messages

4. **Test timer synchronization**:
   - In admin interface, change the timer
   - Verify the timer updates in real-time on the user interface

5. **Test betting synchronization**:
   - In admin interface, update betting amounts
   - Verify the betting amounts update in real-time on the user interface

6. **Test card dealing synchronization**:
   - In admin interface, deal a card
   - Verify the card appears in real-time on the user interface

7. **Run the test script**:
   ```
   node test-realtime-sync-simple.js
   ```
   - Verify WebSocket connection and message handling

## Step 7: Common Issues to Check

1. **Game ID Mismatch**:
   - Ensure both admin and user interfaces use 'default-game'
   - Check that API calls include the correct game_id

2. **WebSocket Connection**:
   - Verify WebSocket server is running on port 4000
   - Check for any firewall issues blocking WebSocket connections

3. **Database Connection**:
   - Verify database connection details in `.env` file
   - Check that required tables exist in the database

4. **CORS Issues**:
   - Verify CORS is properly configured in the backend
   - Check that frontend can make API calls to the backend
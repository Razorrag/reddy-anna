# Requirements Document

## Introduction

This spec addresses a critical issue where game completion works correctly on the backend (payouts are processed, database is updated, balances are correct), but the frontend UI for both admin and players fails to show the completion state. Specifically:

- Admin panel doesn't show the "Start New Game" button after a game completes
- Players don't see the winner celebration overlay with payout information
- The game appears "stuck" in the dealing phase even though the backend has completed the game

## Glossary

- **Game Completion Flow**: The sequence of events from card match detection → payout processing → database updates → WebSocket broadcasts → frontend UI updates
- **Admin Panel**: The admin interface at `/admin/game` that controls the game
- **Player Interface**: The player game page at `/player-game` where players view the stream and place bets
- **WebSocket Context**: The React context (`WebSocketContext.tsx`) that manages WebSocket message handling
- **Game State Context**: The React context (`GameStateContext.tsx`) that manages game state
- **completeGame Function**: The server-side function in `server/game.ts` that processes game completion
- **game_complete Event**: The WebSocket event broadcast to all clients when a game completes

## Requirements

### Requirement 1: Admin Panel Must Show Start New Game Button

**User Story:** As an admin, I want to see a "Start New Game" button immediately after a game completes, so that I can start the next game without confusion.

#### Acceptance Criteria

1. WHEN a winning card is dealt, THE Admin Panel SHALL display the game completion screen within 2 seconds
2. WHEN the game completion screen is displayed, THE Admin Panel SHALL show the winner information (winning side, winning card, round number)
3. WHEN the game completion screen is displayed, THE Admin Panel SHALL show a prominent "Start New Game" button
4. WHEN the admin clicks "Start New Game", THE System SHALL reset the game state and return to the opening card selection phase
5. WHILE the game is in complete phase, THE Admin Panel SHALL maintain the completion UI until the admin explicitly starts a new game

### Requirement 2: Players Must See Winner Celebration

**User Story:** As a player, I want to see a celebration overlay showing the winner and my payout immediately after a game completes, so that I know the result and my winnings.

#### Acceptance Criteria

1. WHEN a winning card is dealt, THE Player Interface SHALL display a celebration overlay within 2 seconds
2. WHEN the celebration overlay is displayed, THE Player Interface SHALL show the winning side with appropriate visual styling
3. WHEN the celebration overlay is displayed and the player had bets, THE Player Interface SHALL show the player's payout amount, total bet, and net profit/loss
4. WHEN the celebration overlay is displayed and the player had no bets, THE Player Interface SHALL show "No bets placed" message
5. WHILE the celebration overlay is shown, THE Player Interface SHALL allow the player to dismiss it or wait for auto-dismiss after 10 seconds

### Requirement 3: WebSocket Event Flow Must Be Reliable

**User Story:** As a system, I want to ensure game_complete events are properly broadcast and received, so that all clients update their UI correctly.

#### Acceptance Criteria

1. WHEN completeGame function finishes processing payouts, THE Server SHALL broadcast a game_complete event to all connected clients
2. WHEN a game_complete event is broadcast, THE Event SHALL include winner, winningCard, round, and userPayout data
3. WHEN a client receives a game_complete event, THE WebSocket Context SHALL update the game state to phase='complete'
4. WHEN the WebSocket Context updates to phase='complete', THE Game State Context SHALL trigger UI re-renders
5. IF a game_complete event fails to be received by a client, THE Client SHALL request game state sync within 5 seconds

### Requirement 4: Game State Synchronization Must Be Consistent

**User Story:** As a system, I want to ensure game state is consistent between server and all clients, so that UI displays match the actual game state.

#### Acceptance Criteria

1. WHEN the server completes a game, THE Server SHALL set gameState.phase to 'complete' before broadcasting
2. WHEN a client receives game_complete event, THE Client SHALL set local gameState.phase to 'complete'
3. WHEN gameState.phase is 'complete', THE Admin Panel SHALL render the completion UI with "Start New Game" button
4. WHEN gameState.phase is 'complete', THE Player Interface SHALL render the celebration overlay
5. WHILE gameState.phase is 'complete', THE System SHALL prevent new bets from being placed

### Requirement 5: Celebration Data Must Be Complete

**User Story:** As a player, I want to see accurate payout information in the celebration overlay, so that I can verify my winnings match my bets.

#### Acceptance Criteria

1. WHEN the server calculates payouts, THE Server SHALL include userPayout data in the game_complete event for each player
2. WHEN userPayout data is included, THE Data SHALL contain amount, totalBet, netProfit, and result fields
3. WHEN a player receives game_complete with userPayout, THE Player Interface SHALL display all payout fields accurately
4. WHEN a player had no bets, THE game_complete event SHALL include userPayout with amount=0 and result='no_bet'
5. WHEN payout calculation fails, THE Server SHALL log the error and send game_complete with error flag

### Requirement 6: UI Must Handle Edge Cases

**User Story:** As a system, I want to handle edge cases gracefully, so that the UI doesn't get stuck in invalid states.

#### Acceptance Criteria

1. IF a client misses the game_complete event, THE Client SHALL detect phase mismatch and request game state sync
2. IF the server crashes during game completion, THE System SHALL recover game state from database on restart
3. IF a client disconnects during game completion, THE Client SHALL receive the completion state on reconnect
4. IF the admin starts a new game before all clients receive game_complete, THE Server SHALL broadcast game_reset to force all clients to sync
5. WHEN a client receives conflicting state updates, THE Client SHALL prioritize the most recent server state

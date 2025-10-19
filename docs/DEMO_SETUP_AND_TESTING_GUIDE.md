# Demo Setup and Testing Steps (Revised):

Here's how to run the demo with the corrected codebase:

## 1. Start the Application:
* Open your terminal in the project root.
* Run `npm run dev`.

## 2. Create Admin User:
* Open a browser tab to `http://localhost:5173/signup`.
* Sign up: Username `admin`, Password `adminpass`.
* Close this tab (you were likely redirected to the player game page `/`).

## 3. Create Player A:
* Open a **new Incognito Window** to `http://localhost:5173/signup`.
* Sign up: Username `PlayerA`, Password `test`.
* You should be logged in and redirected to `/`. Verify wallet: `₹50,00,000`. Keep open.

## 4. Create Player B:
* Open **another new Incognito Window** to `http://localhost:5173/signup`.
* Sign up: Username `PlayerB`, Password `test`.
* You should be logged in and redirected to `/`. Verify wallet: `₹50,00,000`. Keep open.

## 5. Log in as Admin:
* Open a **new browser tab** (non-incognito) to `http://localhost:5173/admin-login`.
* Log in: Username `admin`, Password `adminpass`.
* You should be redirected to `/admin-game`.

## 6. Run the Test Scenario (e.g., Round 2 - Andar Wins):
* **Admin:** Select **`7♥️`** as Opening Card. Click **"Start New Game"**.
* **Players:** See `7♥️`, 30s timer starts (`BETTING_R1`).
* **Player A:** Bet ₹100,000 on **Andar**.
* **Player B:** Bet ₹200,000 on **Bahar**.
* **Admin:** Check Betting Report updates.
* **(Timer Ends)** Players see betting disabled (`DEALING_R1`).
* **Admin:** Deal `J♠️` to Bahar.
* **Admin:** Deal `4♣️` to Andar. (No winner).
* **System:** Backend (`GameLoopService`) detects no winner in R1, transitions state.
* **Players:** Should receive WebSocket update. Phase becomes `BETTING_R2`. New 30s timer starts. "Round 1 Locked Bets" UI should appear (A: Andar 1L, B: Bahar 2L).
* **Player A:** Bet ₹50,000 *more* on **Andar**.
* **Player B:** Bet ₹100,000 *more* on **Bahar**.
* **Admin:** Check Betting Report updates (R1 locked, R2 updates, Totals update).
* **(Timer Ends)** Players see betting disabled (`DEALING_R2`).
* **Admin:** Deal `9♦️` to Bahar.
* **Admin:** Deal **`7♠️`** to Andar. (MATCH!)
* **System:** Backend detects winner (`Andar`, `Round 2`). Phase: `COMPLETE`. Calculates mixed payout.
* **Players:** See "WINNER: ANDAR" message. Verify wallets:
    * Player A (Won R1@1:1, R2@1:1): Started 50L. Bet 1L(R1)+50k(R2)=1.5L. Won 1L(R1)+50k(R2)=1.5L profit. End: 50L - 1.5L + (1.5L * 2) = **51,50,000**. *(Correction from previous calculation - payout adds stake back + profit)*
    * Player B (Lost R1, Lost R2): Started 50L. Bet 2L(R1)+1L(R2)=3L. Lost 3L. End: 50L - 3L = **47,00,000**.
* **Admin:** Can reset for the next game.

## Expected Features Working:
1. ✅ Admin can select opening card and start game
2. ✅ Timer starts immediately and syncs to all players
3. ✅ Players can place bets with visual feedback
4. ✅ Mock betting activity from other players
5. ✅ Round progression (R1 → R2 → Complete)
6. ✅ Real-time synchronization via WebSocket
7. ✅ Winner determination and payout calculation
8. ✅ Game reset functionality

## Troubleshooting:
- If timer doesn't start: Check browser console for WebSocket errors
- If bets don't appear: Ensure all tabs are on correct pages
- If sync issues: Refresh all tabs and restart the game
- If admin can't access: Check ProtectedRoute component settings

This detailed plan, combined with the corrected codebase, should allow you to successfully execute the multi-round Andar Bahar demo.

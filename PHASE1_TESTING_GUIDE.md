# Phase 1 Testing Guide

**Quick reference for testing all Phase 1 fixes**

---

## 🧪 Test #1: Bet Undo → Admin Panel Update

### Setup
1. Open two browser windows:
   - Window 1: Admin panel (`/admin`)
   - Window 2: Player game (`/game`)

### Steps
1. **Admin**: Start a new game
2. **Player**: Place bet: ₹5000 on Andar
3. **Admin**: Verify bet shows in "Live Bet Monitoring" section
   - Should show: Andar ₹5000, Bahar ₹0
4. **Player**: Click "Undo Last Bet" button
5. **Admin**: Check "Live Bet Monitoring" section

### Expected Results
✅ Admin panel immediately updates to show:
- Andar: ₹0
- Bahar: ₹0
- Total Bets: ₹0

✅ Player balance is refunded

### If Test Fails
- Check browser console for `admin_bet_update` WebSocket message
- Check server logs for "Admin bet totals updated after undo"
- Verify `getBettingTotals()` function exists in storage-supabase.ts

---

## 🧪 Test #2: Analytics Tables Auto-Update

### Setup
1. Access to database (Supabase dashboard or SQL client)
2. Admin and player accounts

### Steps
1. **Admin**: Start a new game
2. **Player**: Place multiple bets (e.g., ₹5000 Andar, ₹3000 Bahar)
3. **Admin**: Deal cards until winner is found
4. Wait for game to complete (10 second auto-reset)
5. **Database**: Run verification queries

### Verification Queries

```sql
-- 1. Check game_statistics (per-game data)
SELECT 
  game_id,
  total_bets,
  total_payouts,
  profit_loss,
  unique_players,
  created_at
FROM game_statistics 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. Check daily_game_statistics (today's aggregate)
SELECT 
  date,
  total_games,
  total_bets,
  total_payouts,
  profit_loss,
  unique_players
FROM daily_game_statistics 
WHERE date = CURRENT_DATE;

-- 3. Check monthly_game_statistics (current month)
SELECT 
  month_year,
  total_games,
  total_bets,
  total_payouts,
  profit_loss,
  unique_players
FROM monthly_game_statistics 
WHERE month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');

-- 4. Check yearly_game_statistics (current year)
SELECT 
  year,
  total_games,
  total_bets,
  total_payouts,
  profit_loss,
  unique_players
FROM yearly_game_statistics 
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE);
```

### Expected Results
✅ All 4 queries return rows with non-zero values

✅ Calculations are correct:
- `profit_loss = total_bets - total_payouts`
- `profit_loss_percentage = (profit_loss / total_bets) * 100`

✅ `unique_players` count matches actual players

### If Test Fails
- Check server logs for "📊 Updating analytics tables..."
- Check for errors in `completeGame()` function
- Verify analytics functions exist in storage-supabase.ts
- Check database table schemas match expected structure

---

## 🧪 Test #3: Balance Update Priority

### Setup
1. Open browser with DevTools console
2. Player account with balance

### Steps
1. **Player**: Join game
2. **Player**: Place a bet (e.g., ₹1000)
3. **Console**: Watch for balance update messages
4. **Player**: Refresh the page
5. **Console**: Watch for balance fetch from API

### Expected Console Output
```
💰 Balance updated: ₹X (source: websocket, reason: bet)
⚠️ Ignoring api balance update - WebSocket update too recent (XXXms ago)
```

### Expected Results
✅ Balance updates immediately after bet (WebSocket)

✅ API updates are ignored if WebSocket updated recently

✅ No balance flickering or multiple rapid updates

✅ Balance is consistent across page refreshes

### If Test Fails
- Check BalanceContext.tsx for priority logic
- Verify `lastWebSocketUpdate` timestamp is being set
- Check for race conditions in balance update flow

---

## 🧪 Test #4: GameId Validation

### Test 4A: No Active Game
1. **Player**: Open game page BEFORE admin starts game
2. **Player**: Try to place a bet
3. **Expected**: Error message "Game session not ready. Please wait for admin to start the game."

### Test 4B: Valid Game Session
1. **Admin**: Start a new game
2. **Player**: Place a bet during betting phase
3. **Expected**: Bet is accepted successfully

### Test 4C: Betting Phase Ended
1. **Admin**: Start game, wait for timer to expire
2. **Player**: Try to place bet after timer expires
3. **Expected**: Error message "Betting period has ended"

### Test 4D: Stale GameId (Advanced)
1. **Player**: Open game in two tabs
2. **Tab 1**: Join game A
3. **Admin**: Complete game A, start game B
4. **Tab 1**: Try to place bet (still has gameId for game A)
5. **Expected**: Error message "Game session mismatch. Please refresh the page."

### Expected Results
✅ All invalid bet attempts are rejected with clear error messages

✅ No database errors in server logs

✅ No foreign key constraint violations

✅ Server logs show gameId validation warnings

### If Test Fails
- Check game-handlers.ts for gameId validation logic
- Verify server uses `currentGameState.gameId` (not client's gameId)
- Check WebSocket error messages in browser console

---

## 📊 Complete Test Run Checklist

Run all tests in sequence:

- [ ] Test #1: Bet Undo → Admin Panel Update
- [ ] Test #2: Analytics Tables Auto-Update
- [ ] Test #3: Balance Update Priority
- [ ] Test #4A: GameId Validation - No Active Game
- [ ] Test #4B: GameId Validation - Valid Game
- [ ] Test #4C: GameId Validation - Betting Ended
- [ ] Test #4D: GameId Validation - Stale GameId

### Success Criteria
✅ All tests pass without errors

✅ No console errors in browser

✅ No server errors in logs

✅ Database tables update correctly

✅ User experience is smooth

---

## 🐛 Common Issues & Solutions

### Issue: Admin panel doesn't update after bet undo
**Solution**: 
- Check WebSocket connection is active
- Verify `broadcastToRole()` function is working
- Check admin client is subscribed to `admin_bet_update` messages

### Issue: Analytics tables are empty
**Solution**:
- Verify game completed successfully
- Check server logs for analytics update errors
- Ensure database tables exist with correct schema
- Check for snake_case vs camelCase field mismatches

### Issue: Balance flickering
**Solution**:
- Check BalanceContext priority logic
- Verify WebSocket updates are being received
- Check for multiple balance update sources firing simultaneously

### Issue: Foreign key constraint violations
**Solution**:
- Verify server is using `currentGameState.gameId`
- Check client isn't sending stale gameIds
- Ensure game session exists before accepting bets

---

## 📝 Test Report Template

```markdown
# Phase 1 Testing Report

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Development/Staging/Production]

## Test Results

### Test #1: Bet Undo → Admin Panel Update
- Status: [ ] Pass [ ] Fail
- Notes: 

### Test #2: Analytics Tables Auto-Update
- Status: [ ] Pass [ ] Fail
- Notes:

### Test #3: Balance Update Priority
- Status: [ ] Pass [ ] Fail
- Notes:

### Test #4: GameId Validation
- Status: [ ] Pass [ ] Fail
- Notes:

## Issues Found
1. [Description]
   - Severity: [Critical/High/Medium/Low]
   - Steps to reproduce:
   - Expected vs Actual:

## Overall Status
[ ] All tests passed - Ready for Phase 2
[ ] Some tests failed - Fixes needed
[ ] Major issues found - Review required

## Recommendations
[Your recommendations here]
```

---

**Last Updated**: November 8, 2025  
**Version**: 1.0  
**Status**: Ready for Testing

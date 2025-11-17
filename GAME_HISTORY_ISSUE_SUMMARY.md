# Game History Not Showing in Profile - Fix Summary

## 🐛 Issue

Game history tab in profile page shows "No games found" even though user has played games.

## 🔍 Root Cause

The backend uses a PostgreSQL RPC function `get_user_game_history()` that may not be installed in your database.

## ✅ Solution

Run the SQL script to create the required database function.

### **Step 1: Run SQL Script**

```bash
psql -U your_user -d your_database -f FIX_GAME_HISTORY_PROFILE.sql
```

Or copy the contents of `FIX_GAME_HISTORY_PROFILE.sql` and run in your database client.

### **Step 2: Verify Function Exists**

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'get_user_game_history';
```

**Expected:** Should return 1 row showing the function exists.

### **Step 3: Test with Your User ID**

```sql
-- Replace 'YOUR_USER_ID' with actual user ID (phone number)
SELECT * FROM get_user_game_history('YOUR_USER_ID', 10);
```

**Expected:** Should return game history records if user has played games.

### **Step 4: Refresh Profile Page**

1. Log in to your account
2. Go to Profile page
3. Click "Game History" tab
4. Should now show your games

---

## 🔍 Troubleshooting

### **Issue: Still showing "No games found"**

#### Check 1: Do you have completed games?
```sql
SELECT COUNT(*) as completed_games 
FROM games 
WHERE status = 'completed';
```

If `0`, you need to play and complete some games first.

#### Check 2: Have you placed any bets?
```sql
SELECT COUNT(*) as total_bets FROM bets;
```

If `0`, game history will be empty (you need to place bets).

#### Check 3: Check your user ID
```sql
-- Find your user ID
SELECT id, phone, full_name FROM users WHERE phone = 'YOUR_PHONE_NUMBER';
```

#### Check 4: Test the function with your ID
```sql
SELECT * FROM get_user_game_history('YOUR_USER_ID', 10);
```

If this returns data but profile doesn't show it:
- Check browser console for errors (F12)
- Check network tab for API response
- Verify you're logged in

#### Check 5: Verify API endpoint works
```bash
# Test the API endpoint (replace TOKEN with your auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/user/game-history?limit=10
```

---

## 📊 What the Function Does

The `get_user_game_history()` function:

1. **Fetches completed games** where user placed bets
2. **Aggregates all bets** for each game
3. **Calculates totals:**
   - Total bet amount
   - Total payout received
   - Net profit/loss
4. **Determines result:** win/loss/no_bet
5. **Includes game details:**
   - Opening card
   - Winner (Andar/Bahar)
   - Winning card
   - All dealt cards
   - Timestamp

---

## 🎯 Expected Data Format

```json
{
  "success": true,
  "data": {
    "games": [
      {
        "id": "game_123",
        "gameId": "game_123",
        "openingCard": "A♠",
        "winner": "andar",
        "winningCard": "A♥",
        "yourBets": [
          {
            "id": "bet_456",
            "side": "andar",
            "amount": 1000,
            "round": 1,
            "payout": 1950
          }
        ],
        "yourTotalBet": 1000,
        "yourTotalPayout": 1950,
        "yourNetProfit": 950,
        "result": "win",
        "totalCards": 5,
        "round": 1,
        "createdAt": "2024-11-18T00:00:00Z"
      }
    ],
    "total": 1,
    "hasMore": false
  }
}
```

---

## 🔧 Files Involved

### Backend
- `server/routes.ts` - API endpoint `/api/user/game-history`
- `server/storage-supabase.ts` - Calls RPC function
- Database - RPC function `get_user_game_history()`

### Frontend
- `client/src/pages/profile.tsx` - Profile page with game history tab
- `client/src/contexts/UserProfileContext.tsx` - Fetches game history

---

## 📝 Quick Test Checklist

- [ ] SQL function created successfully
- [ ] Function returns data when tested directly
- [ ] User has completed games in database
- [ ] User has placed bets
- [ ] API endpoint returns data (test with curl/Postman)
- [ ] Profile page shows game history tab
- [ ] Game history displays correctly

---

## 🚀 After Fix

Once the SQL function is installed:

1. ✅ Game history tab will show all your games
2. ✅ Each game shows:
   - Win/Loss indicator (green/red dot)
   - Opening card
   - Your bets (side and amount)
   - Payout received
   - Net profit/loss
   - Game timestamp
3. ✅ "Load More" button for pagination
4. ✅ Real-time updates when new games complete

---

## 💡 Why This Happened

The RPC function is a database-level function that needs to be created separately. It's not automatically created by migrations. This is a one-time setup required for the game history feature to work.

---

**Status:** Ready to fix
**Difficulty:** Easy (just run SQL script)
**Time:** < 1 minute

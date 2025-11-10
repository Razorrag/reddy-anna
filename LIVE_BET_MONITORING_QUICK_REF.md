# Live Bet Monitoring - Quick Reference Card

## 🎯 Where Is It?

**Admin Dashboard:** `/admin`
- Shows live bet monitoring table
- Edit/cancel bets here
- Real-time updates

**Game Control:** `/admin/game`
- Shows totals only
- NO monitoring table
- NO edit controls

---

## 🔑 Key Endpoints

### Get Live Bets
```
GET /api/admin/bets/live-grouped
Auth: Admin JWT required
Returns: Per-player cumulative bets for current game
```

### Edit Bet
```
PATCH /api/admin/bets/:betId
Body: { side: 'andar'|'bahar', amount: number, round: '1'|'2' }
Auth: Admin JWT required
Allowed: During 'betting' or 'dealing' phase
```

### Cancel Bet
```
DELETE /api/admin/bets/:betId
Auth: Admin JWT required
Allowed: During 'betting' phase only
```

### Undo Last Bet (Player)
```
DELETE /api/user/undo-last-bet
Auth: User JWT required
Allowed: During 'betting' phase only
```

---

## 📡 WebSocket Events

### Backend Broadcasts
```typescript
// On bet edit, undo, cancel, or new bet
{
  type: 'admin_bet_update',
  data: {
    gameId: string,
    userId: string,
    round: number,
    side: 'andar' | 'bahar',
    amount: number,
    // ... other fields
  }
}
```

### Frontend Listens
```typescript
// WebSocketContext dispatches window event
window.addEventListener('admin_bet_update', (event) => {
  const betData = event.detail;
  // Refresh UI
});
```

---

## 🔄 Data Flow

```
User Action (edit/undo/cancel)
  ↓
Backend API (validates, updates DB)
  ↓
Broadcast admin_bet_update
  ↓
WebSocket → window.dispatchEvent()
  ↓
Components refresh (LiveBetMonitoring, GamePanel, etc.)
  ↓
UI shows updated data
```

---

## ✅ Quick Checks

### Is monitoring working?
1. Open `/admin` dashboard
2. Look for "🧭 Live Bet Monitoring" section
3. Should show table with players and bets

### Is WebSocket working?
1. Open browser console
2. Edit a bet
3. Look for: "📨 Received admin_bet_update"
4. Table should update instantly

### Is polling working?
1. Disable WebSocket
2. Edit a bet
3. Wait 3 seconds
4. Table should update

---

## 🐛 Troubleshooting

### No bets showing
- Check: Is game started?
- Check: Are bets placed for current gameId?
- Check: Browser console for errors

### Edits not saving
- Check: Game phase (must be 'betting' or 'dealing')
- Check: Admin authentication
- Check: Network tab for 403/401 errors

### UI not updating
- Check: WebSocket connection status
- Check: Console for "📨 Received admin_bet_update"
- Check: Polling fallback (3s delay)

---

## 🚫 Don'ts

- ❌ Don't add LiveBetMonitoring to game control page
- ❌ Don't edit bets during 'complete' phase
- ❌ Don't compute totals on client (use API)
- ❌ Don't bypass phase validation

---

## ✅ Do's

- ✅ Use `/admin` dashboard for monitoring
- ✅ Always fetch from `/live-grouped` endpoint
- ✅ Trust DB as source of truth
- ✅ Let WebSocket handle instant updates
- ✅ Rely on 3s polling as fallback

---

## 📊 Component Locations

```
Frontend:
├── pages/admin.tsx (renders LiveBetMonitoring)
├── pages/admin-game.tsx (NO monitoring)
├── components/LiveBetMonitoring.tsx (main component)
├── components/AdminGamePanel/ (totals only)
└── contexts/WebSocketContext.tsx (event bridge)

Backend:
├── routes.ts:4643 (GET /live-grouped)
├── routes.ts:4478 (PATCH /bets/:betId)
├── routes.ts:4774 (DELETE /undo-last-bet)
├── routes.ts:4968 (DELETE /bets/:betId)
└── socket/game-handlers.ts (broadcasts)
```

---

## 🎯 Testing Checklist

- [ ] Open `/admin` - see monitoring table
- [ ] Edit bet - see instant update
- [ ] Undo bet - see table refresh
- [ ] Cancel bet - see bet removed
- [ ] Check console - see WebSocket logs
- [ ] Disable WS - polling still works
- [ ] Try edit in 'complete' phase - rejected

---

**Quick Reference Version:** 1.0  
**Last Updated:** November 10, 2025  
**For Full Details:** See LIVE_BET_MONITORING_SYSTEM_DEEP_DIVE.md

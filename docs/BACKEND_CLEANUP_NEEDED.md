# Backend Cleanup Required

## Remaining Task: Remove Pre-Selection Logic from Backend

The frontend has been completely updated to remove pre-selection logic. The backend still has references to `preSelectedBaharCard` and `preSelectedAndarCard` that need to be removed.

### Lines to Remove/Update in `server/routes.ts`:

1. **Line 478-542**: Remove auto-reveal logic after timer in Round 1
   - Remove check for `currentGameState.preSelectedBaharCard`
   - Remove check for `currentGameState.preSelectedAndarCard`
   - Remove auto-dealing of pre-selected cards
   - Keep the phase change and broadcast logic

2. **Line 691-698**: Remove `save_cards` WebSocket message handler
   - Delete entire case block for 'save_cards'

3. **Line 931**: Remove from game reset
   - Remove `preSelectedBaharCard: null`
   - Remove `preSelectedAndarCard: null`

4. **Line 2438-2443**: Remove from Round 2 transition
   - Remove clearing of pre-selected cards

5. **Line 2491-2556**: Remove auto-reveal logic in Round 2
   - Similar to Round 1, remove pre-selection checks and auto-dealing

6. **Line 2821-2822**: Remove from game complete reset
   - Remove pre-selected card clearing

### What to Keep:
- Phase transitions
- Timer logic
- Direct card dealing via `deal_card` message
- Round transitions
- Winner detection

### New Flow (Already Implemented in Frontend):
1. Timer ends → Phase changes to 'dealing'
2. Admin selects cards (frontend only)
3. Admin clicks "Deal Cards" button
4. Frontend sends `deal_card` messages directly
5. Backend receives and broadcasts cards
6. Winner detection happens automatically

### Status:
- ✅ Frontend: Complete
- ⚠️ Backend: Needs cleanup (non-critical - old code paths not used)
- ✅ Functionality: Working correctly with new flow

The game will work correctly even without this cleanup because the new flow doesn't use the pre-selection code paths. However, removing the dead code will improve maintainability.

# Chip and Round Display Fixes TODO

## Issues to Fix:
1. Chip representation must use local images from `/public/coins/` folder
2. Remove round money display and "above andar bahar" text

## Implementation Steps:

### Phase 1: Update Chip Selector to use images
- [ ] Modify ChipSelector component to display coin images instead of colored circles
- [ ] Update bet amounts to match available coin images (2500, 5000, 10000, 20000, 30000, 40000, 50000, 100000)
- [ ] Ensure proper styling for image-based chips

### Phase 2: Remove round display elements
- [ ] Remove round indicator from VideoArea component
- [ ] Remove any "above andar bahar" text if found
- [ ] Clean up unnecessary round-related UI elements

### Phase 3: Update player game configuration
- [ ] Update betAmounts array in player-game.tsx to match available coin denominations
- [ ] Test the changes to ensure proper functionality

## Files to Modify:
1. `reddy-anna/client/src/components/MobileGameLayout/ChipSelector.tsx`
2. `reddy-anna/client/src/components/MobileGameLayout/VideoArea.tsx`
3. `reddy-anna/client/src/pages/player-game.tsx`

## Available Coin Images:
- 2500.png
- 5000.png
- 10000.png
- 20000.png
- 30000.png
- 40000.png
- 50000.png
- 100000.png
- Select Coins.png

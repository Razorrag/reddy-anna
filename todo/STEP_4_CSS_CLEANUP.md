# Step 4: CSS Cleanup and Configuration

## Goal
Clean up all legacy CSS files and configure Tailwind CSS properly for the application.

## Current State
- Multiple legacy CSS files scattered throughout the application
- Old CSS imports need to be removed from components
- Tailwind configuration needs to be updated with custom utilities
- Global CSS file needs to be updated

## Target State
- All legacy CSS files deleted
- Tailwind CSS properly configured with custom casino-themed utilities
- Global CSS updated with proper font imports and Tailwind directives
- No more CSS import statements in components

## Files to Modify/Remove
- Delete: `client/src/player-game.css`
- Delete: `client/src/components/BettingStats/AdvancedBettingStats.css`
- Delete: `client/src/components/BettingStats/BettingStats.css`
- Delete: `client/src/components/CardGrid/CardGrid.css`
- Delete: `client/src/components/GameAdmin/GameAdmin.css`
- Delete: `client/src/components/LiveStreamSimulation/LiveStreamSimulation.css`
- Delete: `client/src/components/MockBettingSimulation/MockBettingSimulation.css`
- Delete: `client/src/components/NotificationSystem/NotificationSystem.css`
- Delete: `client/src/components/SettingsModal/SettingsModal.css`
- Delete: `client/src/components/CountdownTimer/CountdownTimer.css`
- Delete: `client/src/components/CircularTimer/CircularTimer.css`
- Delete: `client/src/components/PlayingCard/PlayingCard.css`
- Delete: `client/src/components/GameHistoryModal/GameHistoryModal.css`
- Update: `client/src/index.css`
- Update: `tailwind.config.ts`

## Detailed Changes

### 1. Delete all legacy CSS files

Delete the following CSS files:
```
client/src/player-game.css
client/src/components/BettingStats/AdvancedBettingStats.css
client/src/components/BettingStats/BettingStats.css
client/src/components/CardGrid/CardGrid.css
client/src/components/GameAdmin/GameAdmin.css
client/src/components/LiveStreamSimulation/LiveStreamSimulation.css
client/src/components/MockBettingSimulation/MockBettingSimulation.css
client/src/components/NotificationSystem/NotificationSystem.css
client/src/components/SettingsModal/SettingsModal.css
client/src/components/CountdownTimer/CountdownTimer.css
client/src/components/CircularTimer/CircularTimer.css
client/src/components/PlayingCard/PlayingCard.css
client/src/components/GameHistoryModal/GameHistoryModal.css
```

### 2. Update index.css

Replace the content of `client/src/index.css` with:
```css
@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Global font family override - ensure Poppins is used everywhere */
* {
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
}

/* Ensure buttons and inputs inherit font */
button, input, select, textarea {
  font-family: inherit;
}
```

### 3. Update Tailwind Configuration

Update `tailwind.config.ts` with custom utilities for the casino game:
```js
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: '#FFD700',
      },
      // Custom shadow utilities for casino-themed effects
      boxShadow: {
        'gold-glow': '0 0 15px rgba(255, 215, 0, 0.3)',
        'card-shadow': '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 2px 8px rgba(255, 255, 255, 0.3)',
        'card-shadow-hover': '0 8px 32px rgba(255, 215, 0, 0.5), inset 0 2px 8px rgba(255, 255, 255, 0.3)',
        'timer-shadow': '0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.3)',
      },
      // Custom gradient utilities
      backgroundImage: {
        'card-gradient': 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
        'gold-gradient': 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
        'andar-gradient': 'linear-gradient(135deg, #A52A2A 0%, #8B0000 100%)',
        'bahar-gradient': 'linear-gradient(135deg, #01073b 0%, #1E3A8A 100%)',
        'admin-gradient': 'linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%)',
        'modal-gradient': 'linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%)',
      },
      // Custom transition utilities
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'transform-opacity': 'transform, opacity',
      },
      // Custom animation utilities for real-time sync
      animation: {
        'pulse-gold': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-live': 'pulseLive 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'pulse-win': 'pulseWin 1s ease-in-out infinite',
        'win-glow': 'winGlow 1s ease-in-out infinite',
      },
      keyframes: {
        pulseLive: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          from: { transform: 'translateY(100%)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pulseWin: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 215, 0, 0.9)' },
          '50%': { boxShadow: '0 0 30px rgba(255, 215, 0, 1)' },
        },
        winGlow: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 20px rgba(255, 215, 0, 0.9)' },
          '50%': { transform: 'scale(1.1)', boxShadow: '0 0 30px rgba(255, 215, 0, 1)' },
        },
      },
      // Custom spacing scale for casino game elements
      spacing: {
        '1.25': '0.3125rem', // 5px
        '2.5': '0.625rem',   // 10px
        '3.75': '0.9375rem', // 15px
        '7.5': '1.875rem',   // 30px
        '8.75': '2.1875rem', // 35px
        '10': '2.5rem',      // 40px
        '11.25': '2.8125rem',// 45px
        '12.5': '3.125rem',  // 50px
        '13.75': '3.4375rem',// 55px
        '15': '3.75rem',     // 60px
        '16.25': '4.0625rem',// 65px
        '17.5': '4.375rem',  // 70px
        '18.75': '4.6875rem',// 75px
        '20': '5rem',        // 80px
        '22.5': '5.625rem',  // 90px
        '25': '6.25rem',     // 100px
        '30': '7.5rem',      // 120px
        '35': '8.75rem',     // 140px
        '40': '10rem',       // 160px
        '50': '12.5rem',     // 200px
      },
      // Custom border width for casino game elements
      borderWidth: {
        '3': '3px',
        '5': '5px',
        '8': '8px',
      },
      // Custom z-index for game elements
      zIndex: {
        '100': '100',
        '500': '500',
        '1000': '1000',
      }
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography")
  ],
} satisfies Config;
```

## Verification Steps
1. Delete all legacy CSS files from the client/src directory and subdirectories
2. Update index.css with Tailwind directives and Poppins font import
3. Update tailwind.config.ts with all custom casino-themed utilities
4. Verify no components have CSS import statements anymore
5. Test that all styling appears correctly after the migration
# CSS Changes Required to Match Legacy HTML Design

## Overview
This document details the specific CSS changes needed to make the React component visually identical to the legacy HTML design.

## Current CSS vs Legacy CSS Comparison

### 1. Root/Container Styles

**Legacy CSS (from start-game.html):**
```css
/* Reset and Base Styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    /* Theme Colors */
    --primary-black: #0a0a0a;
    --gold-primary: #ffd700;
    --red-primary: #dc143c;
    --white: #ffffff;

    /* Typography */
    --font-primary: 'Poppins', sans-serif;
}

html, body {
    height: 100%;
    margin: 0;
    font-family: var(--font-primary);
    background-color: var(--primary-black);
    color: var(--white);
    overflow: hidden; /* Prevent scrolling of the whole page */
}

body {
    display: flex;
    flex-direction: column;
}

.game-body {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    position: relative;
}
```

**Current React Component:**
- Uses Tailwind CSS with `fixed inset-0 flex flex-col bg-black`

**Required Change:**
Replace Tailwind with exact legacy CSS properties

### 2. Video Section Styles

**Legacy CSS:**
```css
.video-section {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #000;
}

.video-section video {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.header {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 100;
    background: transparent;
    padding: 10px 15px;
}

.nav-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
}

.logo h1 {
    font-size: 16px;
    font-weight: 500;
    color: var(--white);
}

.wallet-display {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid var(--gold-primary);
    border-radius: 20px;
    padding: 6px 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.wallet-display i {
    color: var(--gold-primary);
}

.wallet-amount-display {
    font-size: 14px;
    font-weight: 600;
    color: var(--white);
}

.video-overlay-content {
    position: absolute;
    top: 50px;
    left: 15px;
    right: 15px;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.game-info-left {
    display: flex;
    align-items: center;
    gap: 10px;
}

.live-indicator {
    display: flex;
    align-items: center;
    gap: 5px;
    background: var(--red-primary);
    color: white;
    padding: 5px 10px;
    border-radius: 15px;
    font-size: 12px;
    font-weight: 500;
}

.live-dot {
    width: 8px;
    height: 8px;
    background: var(--white);
    border-radius: 50%;
    animation: pulse 1.5s infinite;
}

.game-title-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--white);
}

.view-count {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.5);
    color: white;
    padding: 5px 10px;
    border-radius: 15px;
    font-size: 12px;
    font-weight: 500;
}

.view-count i {
    color: var(--gold-primary);
}
```

**Current React Component:**
Uses Tailwind classes like `absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent`

**Required Change:**
Replace with exact legacy CSS

### 3. Circular Timer Styles

**Legacy CSS:**
```css
.timer-overlay {
    position: absolute;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10;
}

.circular-timer {
    position: relative;
    width: 200px;
    height: 200px;
    border: 8px solid var(--gold-primary);
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transition: all 0.5s ease;
    background: radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 100%);
    opacity: 1;
}

.timer-value {
    font-size: 64px;
    font-weight: 700;
    color: var(--white);
    line-height: 1;
}

.round-info {
    font-size: 18px;
    color: var(--white);
    font-weight: 500;
}

.timer-hidden {
    opacity: 0;
    transform: scale(0.8);
    pointer-events: none;
}
```

**Current React Component:**
Uses Tailwind like `w-40 h-40 md:w-48 md:h-48 border-8 border-gold ...`

**Required Change:**
Replace with exact legacy CSS dimensions (200px width/height, 64px font size, etc.)

### 4. Betting Area Styles

**Legacy CSS:**
```css
.main-betting-areas {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 10px 5px;
    gap: 5px;
}

.betting-zone {
    height: 80px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    padding: 5px;
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
}

.betting-zone:hover {
    transform: scale(1.02);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
}

.andar-zone {
    background-color: #A52A2A; /* Red color */
    justify-content: space-between;
}

.bahar-zone {
    background-color: #01073b; /* Blue color */
    justify-content: space-between;
}

.bet-info {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 5px;
    text-align: left;
}

.bahar-zone .bet-info {
    text-align: right;
    align-items: flex-end;
}

.bet-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 20px;
    font-weight: 700;
    color: var(--gold-primary);
}

.chip-placeholder {
    width: 30px;
    height: 30px;
    background-color: var(--white);
    border-radius: 50%;
    position: relative;
    bottom: -15px; /* Position to show half in the box and half outside */
    border: 2px solid var(--gold-primary);
}

.bet-amount {
    font-size: 14px;
    font-weight: 700;
    color: var(--gold-primary);
}

.card-representation {
    width: 50px;
    height: 70px;
    background-color: var(--white);
    border-radius: 5px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.card-rank {
    font-size: 32px;
    font-weight: 700;
    color: #02A8DD; /* Blue from image */
    line-height: 1;
}

.card-suit {
    font-size: 24px;
    color: #02A8DD; /* Blue from image */
}

.central-card-area {
    display: flex;
    align-items: center;
    justify-content: center;
}

.opening-card {
    width: 60px;
    height: 80px;
    background-color: var(--white);
    border: 3px solid var(--gold-primary);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.7);
    position: relative;
    z-index: 5;
}
```

**Current React Component:**
Uses Tailwind like `bg-[#A52A2A] border-2 border-[#A52A2A] rounded-lg p-3 md:p-4`

**Required Change:**
Replace with exact legacy dimensions (80px height, 50x70px card representation, etc.)

### 5. Card Sequence Display Styles

**Legacy CSS:**
```css
.card-sequence-container {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    background: rgba(0, 0, 0, 0.8);
    border-top: 1px solid var(--gold-primary);
    max-height: 120px;
    overflow-x: auto;
}

.sequence-section {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.sequence-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--gold-primary);
    margin-bottom: 5px;
}

.card-sequence {
    display: flex;
    gap: 5px;
    overflow-x: auto;
    padding: 5px 0;
    max-width: 100%;
}

.sequence-card {
    min-width: 40px;
    height: 55px;
    background-color: var(--white);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    position: relative;
}

.sequence-card .card-rank {
    font-size: 16px;
    font-weight: 700;
    line-height: 1;
}

.sequence-card .card-suit {
    font-size: 12px;
    margin-top: 2px;
}

.sequence-card.winning {
    border: 2px solid var(--gold-primary);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
}

/* Hide scrollbar for card sequence */
.card-sequence::-webkit-scrollbar {
    height: 4px;
}
.card-sequence::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
}
.card-sequence::-webkit-scrollbar-thumb {
    background: var(--gold-primary);
    border-radius: 2px;
}
```

**Required Change:**
Apply exact legacy CSS for card sequence display

### 6. Game Controls Styles

**Legacy CSS:**
```css
.game-controls {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 10px;
}

.control-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 8px;
    padding: 8px;
    color: var(--white);
    cursor: pointer;
    width: 60px;
    font-size: 12px;
    transition: all 0.2s ease;
}

.control-btn:hover {
    background: rgba(255, 215, 0, 0.1);
    transform: translateY(-2px);
}

.control-btn i {
    font-size: 20px;
    color: var(--gold-primary);
}

.select-chip-btn {
    background: var(--gold-primary);
    color: var(--primary-black);
    border: none;
    border-radius: 20px;
    padding: 12px 20px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.select-chip-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
}
```

**Required Change:**
Replace Tailwind grid layout with legacy flex layout

### 7. Chip Selection Panel Styles

**Legacy CSS:**
```css
.chip-selection {
    display: none;
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    padding: 10px;
    background: rgba(0, 0, 0, 0.8);
    border-top: 1px solid var(--gold-primary);
    scrollbar-width: thin;
    scrollbar-color: var(--gold-primary) rgba(255, 255, 255, 0.1);
    -webkit-overflow-scrolling: touch;
}

.chip-selection::-webkit-scrollbar {
    height: 6px;
}

.chip-selection::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}

.chip-selection::-webkit-scrollbar-thumb {
    background: var(--gold-primary);
    border-radius: 3px;
}

.chip-selection::-webkit-scrollbar-thumb:hover {
    background: var(--gold-secondary);
}

.chip-container {
    display: inline-flex;
    gap: 10px;
    padding-bottom: 5px;
    min-width: max-content;
}

.chip-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 5px;
    border-radius: 8px;
}

.chip-btn:hover {
    background: rgba(255, 215, 0, 0.1);
}

.chip-image {
    width: 60px;
    height: 60px;
    object-fit: contain;
    transition: all 0.3s ease;
}

.chip-amount {
    color: var(--white);
    font-size: 10px;
    font-weight: 500;
}

.chip-btn.active .chip-image {
    transform: scale(1.1);
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
}
```

**Required Change:**
Apply exact legacy CSS for chip selection panel

### 8. Recent Results Styles

**Legacy CSS:**
```css
.recent-results-container {
    padding: 8px 10px;
    cursor: pointer;
    position: relative;
}

.recent-results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
    padding: 0 5px;
}

.history-title {
    font-size: 12px;
    color: var(--gold-primary);
    font-weight: 500;
}

.history-expand {
    font-size: 10px;
    color: var(--white);
    opacity: 0.7;
}

.recent-results-bottom {
    display: flex;
    gap: 5px;
    overflow-x: auto;
    scrollbar-width: none;
    padding: 5px 0;
}
.recent-results-bottom::-webkit-scrollbar {
    display: none;
}

.result-chip {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
    color: var(--white);
    position: relative;
    transition: transform 0.2s ease;
}

.result-chip:hover {
    transform: scale(1.1);
    z-index: 10;
}

.result-chip.red { background-color: var(--red-primary); }
.result-chip.blue { background-color: #4169E1; }

.results-progress-bar {
    width: 100%;
    height: 4px;
    background-color: var(--gold-primary);
    border-radius: 2px;
    margin-top: 5px;
}
```

**Required Change:**
Apply exact legacy CSS for recent results display

### 9. History Modal Styles

**Legacy CSS:**
```css
.history-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    overflow-y: auto;
}

.history-content {
    max-width: 500px;
    margin: 50px auto;
    background: #1a1a1a;
    border: 1px solid var(--gold-primary);
    border-radius: 10px;
    padding: 20px;
}

.history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--gold-primary);
}

.history-title-large {
    font-size: 18px;
    color: var(--gold-primary);
    font-weight: 600;
}

.close-history {
    background: none;
    border: none;
    color: var(--white);
    font-size: 24px;
    cursor: pointer;
}

.history-grid {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 10px;
    margin-bottom: 20px;
}

.history-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
}

.history-round {
    font-size: 10px;
    color: #f8f9fa;
}

.history-result-chip {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 16px;
    color: var(--white);
}

.history-stats {
    display: flex;
    justify-content: space-around;
    padding: 15px 0;
    border-top: 1px solid #2a2a2a;
}

.stat-item {
    text-align: center;
}

.stat-label {
    font-size: 12px;
    color: #f8f9fa;
    margin-bottom: 5px;
}

.stat-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--gold-primary);
}
```

**Required Change:**
Apply exact legacy CSS for history modal

### 10. Notification System Styles

**Legacy CSS:**
```css
.notification-container {
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.notification {
    background: #2a2a2a;
    border-left: 5px solid var(--gold-primary);
    border-radius: 10px;
    padding: 15px 20px;
    color: var(--white);
    min-width: 250px;
    max-width: 350px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    transform: translateX(120%);
    opacity: 0;
    transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55);
}

.notification.show {
    transform: translateX(0);
    opacity: 1;
}

.notification-success { border-color: #27ae60; }
.notification-error { border-color: #e74c3c; }
.notification-warning { border-color: #f39c12; }
.notification-info { border-color: var(--gold-primary); }
```

**Required Change:**
Apply exact legacy CSS for notifications

### 11. Mobile Responsiveness

**Legacy CSS:**
```css
/* Mobile Responsiveness */
@media (max-width: 768px) {
    .header {
        padding: 8px 10px;
    }
    
    .logo h1 {
        font-size: 14px;
    }
    
    .wallet-amount-display {
        font-size: 12px;
    }
    
    .game-info-left {
        gap: 8px;
    }
    
    .live-indicator, .view-count {
        padding: 4px 8px;
        font-size: 11px;
    }
    
    .game-title-text {
        font-size: 14px;
    }
    
    .circular-timer {
        width: 160px;
        height: 160px;
        background: radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 100%);
        opacity: 1;
    }
    
    .timer-value {
        font-size: 48px;
    }
    
    .round-info {
        font-size: 16px;
    }
    
    .main-betting-areas {
        gap: 3px;
        padding: 8px 3px;
    }
    
    .betting-zone {
        height: 70px;
    }
    
    .bet-title {
        font-size: 16px;
    }
    
    .bet-amount {
        font-size: 12px;
    }
    
    .card-representation {
        width: 45px;
        height: 65px;
    }
    
    .card-rank {
        font-size: 28px;
    }
    
    .card-suit {
        font-size: 20px;
    }
    
    .opening-card {
        width: 50px;
        height: 70px;
    }
    
    .control-btn {
        width: 50px;
        padding: 6px;
    }
    
    .control-btn i {
        font-size: 16px;
    }
    
    .control-btn span {
        font-size: 10px;
    }
    
    .select-chip-btn {
        padding: 10px 16px;
        font-size: 12px;
    }
    
    .result-chip {
        width: 24px;
        height: 24px;
        font-size: 12px;
    }

    .history-title {
        font-size: 11px;
    }

    .history-expand {
        font-size: 9px;
    }
    
    .chip-image {
        width: 50px;
        height: 50px;
    }
}
```

**Required Change:**
Ensure responsive styles match legacy exactly

### 12. Recommended Implementation Approach

1. **Remove all Tailwind classes** and replace with custom CSS classes that match the legacy HTML
2. **Create a dedicated CSS file** with all the legacy CSS styles
3. **Update the React component** to use the legacy class names
4. **Ensure all dimensions, colors, and spacing** match the legacy design exactly
5. **Test on different screen sizes** to ensure responsive behavior matches
6. **Verify all interactive elements** (hover effects, transitions) work as in legacy
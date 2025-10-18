# Prompt 2: Player Interface Basic Structure for Andar Bahar Game

## Objective
Create the basic HTML and CSS structure for the player interface (start-game.html) with all visual elements, layout, and styling but without JavaScript functionality. Focus on creating the exact visual layout and design of the original game interface.

## Files to Create

### 1. start-game.html (Basic Structure)
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Andar Bahar - Start Game | Reddy Anna Kossu</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.11/dist/hls.min.js"></script>
    <script src="config.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="game-body">
        <!-- Video Stream Section -->
        <div class="video-section" id="videoSection">
            <!-- Video player for video files -->
            <video id="liveStream" autoplay muted loop playsinline style="display: block;">
                <source src="hero images/uhd_30fps.mp4" type="video/mp4">
            </video>
            
            <!-- Container for embed codes (YouTube, Twitch, etc.) -->
            <div id="embedContainer" style="display: none; width: 100%; height: 100%; position: relative;">
                <iframe id="embedFrame" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe>
            </div>
            
            <!-- Container for RTMP streams (will use HLS.js or similar) -->
            <video id="rtmpStream" autoplay muted controls playsinline style="display: none;"></video>

            <!-- Header elements over video -->
            <header class="header">
                <nav class="navbar">
                    <div class="nav-container">
                        <div class="logo">
                            <h1 id="userIdDisplay">1308544430</h1>
                        </div>
                        <div class="wallet-display">
                            <i class="fas fa-wallet"></i>
                            <div class="wallet-amount-display" id="walletBalance">₹44,20,423.90</div>
                        </div>
                    </div>
                </nav>
            </header>
            
            <!-- Other overlay elements -->
            <div class="video-overlay-content">
                <div class="game-info-left">
                    <div class="live-indicator">
                        <div class="live-dot"></div>
                        <span>LIVE</span>
                    </div>
                    <span class="game-title-text">Andar Bahar</span>
                </div>
                <div class="view-count">
                    <i class="fas fa-eye"></i>
                    <span id="viewerCount">1,234</span>
                </div>
            </div>

            <!-- Centered Timer Overlay -->
            <div class="timer-overlay">
                <div class="circular-timer">
                    <div class="timer-value" id="gameTimer">30</div>
                    <div class="round-info" id="roundInfo">Round 1</div>
                </div>
            </div>
        </div>

        <!-- Game Interface Section -->
        <div class="game-interface">
            <!-- Main Betting Area -->
            <div class="main-betting-areas">
                <!-- ANDAR ZONE -->
                <div class="betting-zone andar-zone" id="andarZone">
                    <div class="bet-info">
                        <div class="bet-title">
                            <span>ANDAR 1:1</span>
                        </div>
                        <div class="bet-amount" id="andarBet">₹ 0</div>
                    </div>
                    <div class="card-representation">
                        <span class="card-rank" id="andarCardRank"></span>
                        <span class="card-suit" id="andarCardSuit"></span>
                    </div>
                </div>

                <!-- CENTRAL CARD AREA -->
                <div class="central-card-area">
                    <div class="opening-card" id="openingCard">
                        <span class="card-rank" id="openingCardRank"></span>
                        <span class="card-suit" id="openingCardSuit"></span>
                    </div>
               </div>

                <!-- BAHAR ZONE -->
                <div class="betting-zone bahar-zone" id="baharZone">
                    <div class="card-representation">
                        <span class="card-rank" id="baharCardRank"></span>
                        <span class="card-suit" id="baharCardSuit"></span>
                    </div>
                    <div class="bet-info">
                        <div class="bet-title">
                            <span>BAHAR 1:1</span>
                        </div>
                        <div class="bet-amount" id="baharBet">₹ 0</div>
                    </div>
                </div>
            </div>

            <!-- Card Sequence Display -->
            <div class="card-sequence-container" id="cardSequenceContainer" style="display: none;">
                <div class="sequence-section andar-sequence">
                    <div class="sequence-title">ANDAR</div>
                    <div class="card-sequence" id="andarCardSequence"></div>
                </div>
                <div class="sequence-section bahar-sequence">
                    <div class="sequence-title">BAHAR</div>
                    <div class="card-sequence" id="baharCardSequence"></div>
                </div>
            </div>

            <!-- Game Controls -->
            <div class="game-controls">
                <button class="control-btn" onclick="showHistory()">
                    <i class="fas fa-history"></i>
                    <span>History</span>
                </button>
                <button class="control-btn" onclick="undoBet()">
                    <i class="fas fa-undo"></i>
                    <span>Undo</span>
                </button>
                <button class="select-chip-btn" id="selectedChipDisplay" onclick="toggleChipPanel()">
                    Select Chip
                </button>
                <button class="control-btn" onclick="rebet()">
                    <i class="fas fa-redo"></i>
                    <span>Rebet</span>
                </button>
            </div>

            <!-- Chip Selection Panel -->
            <div class="chip-selection" id="chipSelectionPanel">
                <div class="chip-container">
                    <button class="chip-btn" data-amount="100000">
                        <img src="coins/100000.png" alt="₹100k" class="chip-image">
                        <div class="chip-amount">₹100k</div>
                    </button>
                    <button class="chip-btn" data-amount="50000">
                        <img src="coins/50000.png" alt="₹50k" class="chip-image">
                        <div class="chip-amount">₹50k</div>
                    </button>
                    <button class="chip-btn" data-amount="40000">
                        <img src="coins/40000.png" alt="₹40k" class="chip-image">
                        <div class="chip-amount">₹40k</div>
                    </button>
                    <button class="chip-btn" data-amount="30000">
                        <img src="coins/30000.png" alt="₹30k" class="chip-image">
                        <div class="chip-amount">₹30k</div>
                    </button>
                    <button class="chip-btn" data-amount="20000">
                        <img src="coins/20000.png" alt="₹20k" class="chip-image">
                        <div class="chip-amount">₹20k</div>
                    </button>
                    <button class="chip-btn" data-amount="10000">
                        <img src="coins/10000.png" alt="₹10k" class="chip-image">
                        <div class="chip-amount">₹10k</div>
                    </button>
                    <button class="chip-btn" data-amount="5000">
                        <img src="coins/5000.png" alt="₹5k" class="chip-image">
                        <div class="chip-amount">₹5k</div>
                    </button>
                    <button class="chip-btn" data-amount="2500">
                        <img src="coins/2500.png" alt="₹2.5k" class="chip-image">
                        <div class="chip-amount">₹2.5k</div>
                    </button>
                </div>
            </div>

            <!-- Recent Results - Card History -->
            <div class="recent-results-container" onclick="showFullHistory()">
                <div class="recent-results-header">
                    <div class="history-title">Card History</div>
                    <div class="history-expand">Click for more →</div>
                </div>
                <div class="recent-results-bottom" id="recentResults">
                    <div class="result-chip red">A</div>
                    <div class="result-chip red">A</div>
                    <div class="result-chip blue">B</div>
                    <div class="result-chip blue">B</div>
                    <div class="result-chip blue">B</div>
                    <div class="result-chip red">A</div>
                </div>
                <div class="results-progress-bar"></div>
            </div>
        </div>
    </div>
    
    <!-- History Modal -->
    <div id="historyModal" class="history-modal">
        <div class="history-content">
            <div class="history-header">
                <div class="history-title-large">Game History</div>
                <button class="close-history" onclick="closeHistory()">&times;</button>
            </div>
            <div class="history-grid" id="historyGrid">
                <!-- History items will be populated here -->
            </div>
            <div class="history-stats">
                <div class="stat-item">
                    <div class="stat-label">Total Games</div>
                    <div class="stat-value" id="totalGames">0</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Andar Wins</div>
                    <div class="stat-value" id="andarWins">0</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">Bahar Wins</div>
                    <div class="stat-value" id="baharWins">0</div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Notification Container -->
    <div id="notificationContainer" class="notification-container"></div>
</body>
</html>
```

### 2. styles.css (Complete Styling for Player Interface)
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

/* Header Styles */
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

/* Main Game Body */
.game-body {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    position: relative;
}

/* Video Stream Section */
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

/* Timer Overlay */
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

/* Game Interface - Main container at the bottom */
.game-interface {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    background: #000;
    display: flex;
    flex-direction: column;
}

/* Main Betting Area - NEW DESIGN */
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

/* Game Controls */
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

/* Chip Selection Panel */
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

/* Recent Results - Card History */
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

/* History Modal */
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

/* Notification System */
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

@keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
}

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

/* Card Sequence Display Styles */
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

### 3. config.js (Basic Configuration)
```javascript
// Configuration for different environments
const CONFIG = {
  // Development environment (localhost)
  development: {
    API_BASE_URL: 'http://localhost:4001'
  },
  
  // Production environment
  production: {
    API_BASE_URL: 'https://your-production-url.com'
  }
};

// Force development environment for now
const environment = 'development';

// Set global API_BASE_URL for backward compatibility
window.API_BASE_URL = CONFIG[environment].API_BASE_URL;

// Export the appropriate configuration
window.API_CONFIG = CONFIG[environment];
```

This creates the complete visual structure of the player interface with:
- Responsive three-column betting layout (Andar-Center-Bahar)
- Video stream section with overlay elements
- Circular timer display
- Card representation areas
- Chip selection panel with horizontal scrolling
- Recent results history
- Game controls (History, Undo, Chip selection, Rebet)
- History modal
- Notification system
- Mobile-responsive design
- All proper CSS variables and styling
- Golden/black theme with proper Poppins font
- Asset directories referenced (hero images/, coins/) for future implementation
# Prompt 5: Admin Interface Functionality for Andar Bahar Game

## Objective
Add complete JavaScript functionality to the admin interface (game-admin.html), including WebSocket integration for admin controls, card selection, game state management, timer control, stream settings, and all interactive elements.

## Files to Update

### 1. Update game-admin.html with JavaScript functionality and admin-sync-override.js functionality
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Game Admin - Reddy Anna Kossu</title>
    <link rel="stylesheet" href="styles.css">
    <script src="config.js"></script>
    <style>
        .game-admin-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%);
            min-height: 100vh;
        }
        .game-admin-header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px 0;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .game-admin-title {
            font-family: 'Poppins', sans-serif;
            font-size: 2.5rem;
            font-weight: normal;
            color: #ffd700;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }
        .game-admin-subtitle {
            font-family: 'Poppins', sans-serif;
            font-size: 1.1rem;
            color: #ffffff;
            opacity: 0.9;
        }
        .game-section {
            background: rgba(0, 0, 0, 0.4);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            backdrop-filter: blur(10px);
        }
        .section-title {
            font-family: 'Poppins', sans-serif;
            font-size: 1.8rem;
            color: #ffd700;
            margin-bottom: 25px;
            text-align: center;
        }
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(13, 1fr);
            gap: 10px;
            margin: 30px 0;
            padding: 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 15px;
        }
        .card-btn {
            background: linear-gradient(45deg, #ffffff, #f0f0f0);
            color: #1a1a1a;
            border: 2px solid #ffd700;
            border-radius: 8px;
            padding: 15px 8px;
            font-family: 'Poppins', sans-serif;
            font-weight: normal;
            cursor: pointer;
            transition: all 0.3s ease;
            text-align: center;
            font-size: 0.9rem;
        }
        .card-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
        }
        .card-btn.selected {
            background: linear-gradient(45deg, #ffd700, #ffed4e);
            color: #1a1a1a;
            border-color: #ffed4e;
        }
        .game-controls {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin: 30px 0;
            flex-wrap: wrap;
        }
        .control-btn {
            background: linear-gradient(45deg, #ffd700, #ffed4e);
            color: #1a1a1a;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-family: 'Poppins', sans-serif;
            font-weight: normal;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .control-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
        }
        .control-btn.danger {
            background: linear-gradient(45deg, #8b0000, #ff6b6b);
            color: white;
        }
        .selected-cards {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin: 30px 0;
            flex-wrap: wrap;
        }
        .selected-card {
            background: linear-gradient(45deg, #ffd700, #ffed4e);
            color: #1a1a1a;
            padding: 20px;
            width: fit-content;
            border-radius: 15px;
            text-align: center;
            min-width: 120px;
        }
        .selected-card-label {
            font-family: 'Poppins', sans-serif;
            font-size: 1rem;
            margin-bottom: 10px;
        }
        .selected-card-value {
            font-family: 'Poppins', sans-serif;
            font-size: 1.5rem;
            font-weight: normal;
        }
        .countdown-display {
            background: linear-gradient(45deg, #ffd700, #ffed4e);
            color: #1a1a1a;
            font-family: 'Poppins', sans-serif;
            font-size: 2rem;
            font-weight: normal;
            text-align: center;
            padding: 15px;
            border-radius: 10px;
            border: 2px solid #ffd700;
            min-height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
        }
        .betting-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .bet-stat-card {
            background: rgba(0, 0, 0, 0.3);
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            border: 2px solid #ffd700;
        }
        .bet-stat-number {
            font-family: 'Poppins', sans-serif;
            font-size: 2.5rem;
            color: #ffd700;
            font-weight: normal;
            margin-bottom: 10px;
        }
        .bet-stat-label {
            font-family: 'Poppins', sans-serif;
            color: #ffffff;
            font-size: 1.1rem;
        }
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 10px;
            color: white;
            font-family: 'Poppins', sans-serif;
            z-index: 1000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        }
        .notification.show {
            transform: translateX(0);
        }
        .notification.success {
            background: linear-gradient(45deg, #28a745, #20c997);
        }
        .notification.error {
            background: linear-gradient(45deg, #dc3545, #fd7e14);
        }
        .notification.info {
            background: linear-gradient(45deg, #17a2b8, #20c997);
        }
        .start-game-popup {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .start-game-popup-content {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%);
            border-radius: 15px;
            padding: 40px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            border: 2px solid #ffd700;
        }
        .start-game-popup h3 {
            color: #ffd700;
            font-family: 'Poppins', sans-serif;
            font-size: 2rem;
            margin-bottom: 20px;
        }
        .start-game-popup p {
            color: #ffffff;
            font-family: 'Poppins', sans-serif;
            margin-bottom: 30px;
            font-size: 1.2rem;
        }
        .start-game-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .start-game-btn {
            background: linear-gradient(45deg, #ffd700, #ffed4e);
            color: #1a1a1a;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-family: 'Poppins', sans-serif;
            font-weight: normal;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 200px;
        }
        .start-game-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
        }
        .start-game-btn.secondary {
            background: linear-gradient(45deg, #6c757d, #adb5bd);
            color: #ffffff;
        }
        .start-game-btn.secondary:hover {
            box-shadow: 0 5px 15px rgba(108, 117, 125, 0.4);
        }
        .round-popup {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .round-popup-content {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%);
            border-radius: 15px;
            padding: 30px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            border: 2px solid #ffd700;
        }
        .round-popup h3 {
            color: #ffd700;
            font-family: 'Poppins', sans-serif;
            font-size: 1.8rem;
            margin-bottom: 20px;
        }
        .round-popup p {
            color: #ffffff;
            font-family: 'Poppins', sans-serif;
            margin-bottom: 25px;
            font-size: 1.1rem;
        }
        .round-popup-input {
            width: 100%;
            padding: 15px;
            border: 2px solid #ffd700;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.3);
            color: #ffffff;
            font-family: 'Poppins', sans-serif;
            font-size: 1.2rem;
            text-align: center;
            margin-bottom: 25px;
        }
        .round-popup-input:focus {
            outline: none;
            border-color: #ffed4e;
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
        }
        .round-popup-btn {
            background: linear-gradient(45deg, #ffd700, #ffed4e);
            color: #1a1a1a;
            border: none;
            padding: 15px 30px;
            border-radius: 25px;
            font-family: 'Poppins', sans-serif;
            font-weight: normal;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
        }
        .round-popup-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
        }
        @media (max-width: 768px) {
            .game-admin-container {
                padding: 10px;
            }
            .game-admin-title {
                font-size: 2rem;
            }
            .cards-grid {
                grid-template-columns: repeat(7, 1fr);
                gap: 8px;
                padding: 15px;
            }
            .card-btn {
                padding: 10px 5px;
                font-size: 0.8rem;
            }
            .game-controls {
                flex-direction: column;
                align-items: center;
            }
            .control-btn {
                width: 100%;
                max-width: 300px;
            }
            .betting-stats {
                grid-template-columns: 1fr;
            }
            .selected-cards {
                flex-direction: column;
                align-items: center;
            }
        }
        
        /* Modal Styles */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 3000;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .modal-content {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d1b69 50%, #8b0000 100%);
            border-radius: 15px;
            padding: 30px;
            max-width: 800px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            border: 2px solid #ffd700;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid rgba(255, 215, 0, 0.3);
        }
        
        .modal-header h3 {
            color: #ffd700;
            font-family: 'Poppins', sans-serif;
            font-size: 1.8rem;
            margin: 0;
        }
        
        .close-modal {
            background: none;
            border: none;
            color: #ffd700;
            font-size: 2rem;
            cursor: pointer;
            padding: 0;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s ease;
        }
        
        .close-modal:hover {
            background: rgba(255, 215, 0, 0.2);
            transform: rotate(90deg);
        }
        
        .modal-body {
            color: #ffffff;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        .form-row {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            color: #ffd700;
            font-family: 'Poppins', sans-serif;
            font-size: 1.1rem;
            margin-bottom: 8px;
        }
        
        .form-input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #ffd700;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.3);
            color: #ffffff;
            font-family: 'Poppins', sans-serif;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        .form-input:focus {
            outline: none;
            border-color: #ffed4e;
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
        }
        
        .form-textarea {
            min-height: 100px;
            resize: vertical;
        }
        
        .save-btn {
            background: linear-gradient(45deg, #ffd700, #ffed4e);
            color: #1a1a1a;
            border: none;
            padding: 12px 25px;
            border-radius: 25px;
            font-family: 'Poppins', sans-serif;
            font-weight: normal;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 10px;
        }
        
        .save-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
        }
        
        .settings-icon-btn {
            background: none;
            border: none;
            color: #ffd700;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .settings-icon-btn:hover {
            background: rgba(255, 215, 0, 0.2);
            transform: rotate(90deg);
        }
        
        @media (max-width: 768px) {
            .form-row {
                flex-direction: column;
                gap: 15px;
            }
            
            .modal-content {
                padding: 20px;
                margin: 20px;
            }
            
            .modal-header h3 {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="game-admin-container">
        <div class="game-admin-header">
            <h1 class="game-admin-title">Game Admin</h1>
            <div style="display: flex; align-items: center; justify-content: center; gap: 15px;">
                <p class="game-admin-subtitle">Manual Andar Bahar Game Control</p>
                <button class="settings-icon-btn" onclick="openSettingsModal()" title="Game Settings">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97L2.46 14.6c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.31.61.22l2.49-1c.52.39 1.06.73 1.69.98l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.25 1.17-.59 1.69-.98l2.49 1c.22.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Opening Card Selection -->
        <div id="openingCardSection" class="game-section">
            <h2 class="section-title">Select Opening Card</h2>
            <div class="cards-grid" id="openingCardsGrid">
                <!-- Cards will be generated by JavaScript -->
            </div>
            <div class="selected-cards">
                <div class="selected-card">
                    <div class="selected-card-label">Selected Card</div>
                    <div class="selected-card-value" id="selectedOpeningCard">None</div>
                </div>
            </div>
            <div class="game-controls">
                <button class="control-btn" onclick="startGame()">Start Game</button>
                <button class="control-btn danger" onclick="resetGame()">Reset Game</button>
            </div>
        </div>

        <!-- Andar Bahar Card Selection -->
        <div id="andarBaharSection" class="game-section" style="display: none;">
            <h2 class="section-title">Andar Bahar Card Selection</h2>
            <div class="cards-grid" id="andarBaharCardsGrid">
                <!-- Cards will be generated by JavaScript -->
            </div>
            <div class="selected-cards">
                <div class="selected-card">
                    <div class="selected-card-label">Opening Card</div>
                    <div class="selected-card-value" id="displayOpeningCard">None</div>
                </div>
                <div class="selected-card">
                    <div class="selected-card-label">Countdown Timer</div>
                    <div class="countdown-display" id="andarBaharCountdown">30</div>
                </div>
            </div>
            <div class="betting-stats" id="bettingStatsContainer">
                <!-- Betting stats will be dynamically generated -->
            </div>
        </div>
    </div>

    <div id="notification" class="notification"></div>

    <!-- Settings Modal -->
    <div id="settingsModal" class="modal-overlay" style="display: none;">
        <div class="modal-content" style="max-width: 1000px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3>Game Settings</h3>
                <button class="close-modal" onclick="closeSettingsModal()">&times;</button>
            </div>
            <div class="modal-body">
                <!-- Game Settings Section -->
                <div class="form-group">
                    <h3 style="color: #ffd700; font-family: 'Poppins', sans-serif; margin-bottom: 20px;">Game Settings</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label" for="settingsMaxBetAmount">Max Bet Amount (₹)</label>
                            <input type="number" id="settingsMaxBetAmount" class="form-input" value="50000" placeholder="Enter max bet amount">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="settingsMinBetAmount">Min Bet Amount (₹)</label>
                            <input type="number" id="settingsMinBetAmount" class="form-input" value="1000" placeholder="Enter min bet amount">
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="gameTimer">Game Timer (seconds)</label>
                        <input type="number" id="gameTimer" class="form-input" value="30" placeholder="Enter game timer">
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="openingCard">Opening Card</label>
                        <select id="openingCard" class="form-input">
                            <option value="A♠">A♠</option>
                            <option value="2♠">2♠</option>
                            <option value="3♠">3♠</option>
                            <option value="4♠">4♠</option>
                            <option value="5♠">5♠</option>
                            <option value="6♠">6♠</option>
                            <option value="7♠">7♠</option>
                            <option value="8♠">8♠</option>
                            <option value="9♠">9♠</option>
                            <option value="10♠">10♠</option>
                            <option value="J♠">J♠</option>
                            <option value="Q♠">Q♠</option>
                            <option value="K♠">K♠</option>
                            <option value="A♥">A♥</option>
                            <option value="2♥">2♥</option>
                            <option value="3♥">3♥</option>
                            <option value="4♥">4♥</option>
                            <option value="5♥">5♥</option>
                            <option value="6♥">6♥</option>
                            <option value="7♥">7♥</option>
                            <option value="8♥">8♥</option>
                            <option value="9♥">9♥</option>
                            <option value="10♥">10♥</option>
                            <option value="J♥">J♥</option>
                            <option value="Q♥">Q♥</option>
                            <option value="K♥">K♥</option>
                            <option value="A♦">A♦</option>
                            <option value="2♦">2♦</option>
                            <option value="3♦">3♦</option>
                            <option value="4♦">4♦</option>
                            <option value="5♦">5♦</option>
                            <option value="6♦">6♦</option>
                            <option value="7♦">7♦</option>
                            <option value="8♦">8♦</option>
                            <option value="9♦">9♦</option>
                            <option value="10♦">10♦</option>
                            <option value="J♦">J♦</option>
                            <option value="Q♦">Q♦</option>
                            <option value="K♦">K♦</option>
                            <option value="A♣">A♣</option>
                            <option value="2♣">2♣</option>
                            <option value="3♣">3♣</option>
                            <option value="4♣">4♣</option>
                            <option value="5♣">5♣</option>
                            <option value="6♣">6♣</option>
                            <option value="7♣">7♣</option>
                            <option value="8♣">8♣</option>
                            <option value="9♣">9♣</option>
                            <option value="10♣">10♣</option>
                            <option value="J♣">J♣</option>
                            <option value="Q♣">Q♣</option>
                            <option value="K♣">K♣</option>
                        </select>
                    </div>
                    <button type="button" class="save-btn" onclick="saveGameSettings()">Save Game Settings</button>
                </div>

                <!-- Live Stream Section -->
                <div class="form-group">
                    <h3 style="color: #ffd700; font-family: 'Poppins', sans-serif; margin-bottom: 20px;">Live Stream Management</h3>
                    <form id="streamForm">
                        <div class="form-group">
                            <label class="form-label" for="streamType">Stream Type</label>
                            <select id="streamType" class="form-input">
                                <option value="video">Video File</option>
                                <option value="embed">Embed URL (YouTube, etc.)</option>
                                <option value="rtmp">RTMP Stream</option>
                            </select>
                        </div>
                        <div class="form-group" id="streamUrlGroup">
                            <label class="form-label" for="streamUrl">Live Stream URL</label>
                            <input type="url" id="streamUrl" class="form-input" placeholder="https://www.youtube.com/embed/VIDEO_ID or local video path" value="hero images/uhd_30fps.mp4">
                        </div>
                        <div class="form-group" id="rtmpUrlGroup" style="display: none;">
                            <label class="form-label" for="rtmpUrl">RTMP Server URL</label>
                            <input type="url" id="rtmpUrl" class="form-input" placeholder="rtmps://live.restream.io:1937/live" value="rtmps://live.restream.io:1937/live">
                        </div>
                        <div class="form-group" id="rtmpStreamKeyGroup" style="display: none;">
                            <label class="form-label" for="rtmpStreamKey">RTMP Stream Key</label>
                            <input type="text" id="rtmpStreamKey" class="form-input" placeholder="Stream key" value="re_10541509_eventd4960ba1734c49369fc0d114295801a0">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="streamTitle">Stream Title</label>
                                <input type="text" id="streamTitle" class="form-input" placeholder="Enter stream title" value="Andar Bahar Live Game">
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="streamStatus">Stream Status</label>
                                <select id="streamStatus" class="form-input">
                                    <option value="live">Live</option>
                                    <option value="offline">Offline</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="streamDescription">Stream Description</label>
                            <textarea id="streamDescription" class="form-input form-textarea" placeholder="Enter stream description">Watch live Andar Bahar games with real-time betting and instant results.</textarea>
                        </div>
                        <button type="button" class="save-btn" onclick="saveStreamSettings()">Save Stream Settings</button>
                    </form>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Admin Sync Override Module -->
    <script>
        // Admin Synchronization Override Module
        // This module overrides the existing functions in game-admin.html to add real-time synchronization

        // Global variables for synchronization
        let currentGameId = 'default-game'; // Use consistent game ID
        let websocketConnection = null;

        // Initialize WebSocket connection for admin
        function initializeAdminWebSocket() {
            // Ensure API_BASE_URL is defined
            if (!window.API_BASE_URL) {
                window.API_BASE_URL = 'http://localhost:4001';
            }
            
            const wsUrl = `${window.API_BASE_URL.replace('http', 'ws')}`;
            console.log('Admin connecting to WebSocket at:', wsUrl);
            
            try {
                websocketConnection = new WebSocket(wsUrl);
                
                websocketConnection.onopen = function(event) {
                    console.log('Admin WebSocket connection established');
                    
                    // Authenticate as admin
                    websocketConnection.send(JSON.stringify({
                        type: 'authenticate',
                        data: { userId: 'admin', isAdmin: true }
                    }));
                    
                    // Subscribe to game updates
                    websocketConnection.send(JSON.stringify({
                        type: 'subscribe_game',
                        data: { gameId: currentGameId }
                    }));
                    
                    // Request current game state
                    setTimeout(() => {
                        requestGameStateSync();
                    }, 1000);
                };
                
                websocketConnection.onmessage = function(event) {
                    try {
                        const message = JSON.parse(event.data);
                        handleAdminWebSocketMessage(message);
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };
                
                websocketConnection.onclose = function(event) {
                    console.log('Admin WebSocket connection closed:', event.code, event.reason);
                    
                    // Attempt to reconnect after 3 seconds
                    setTimeout(initializeAdminWebSocket, 3000);
                };
                
                websocketConnection.onerror = function(error) {
                    console.error('Admin WebSocket error:', error);
                };
            } catch (error) {
                console.error('Failed to initialize admin WebSocket:', error);
            }
        }

        // Handle WebSocket messages for admin
        function handleAdminWebSocketMessage(message) {
            console.log('Admin received WebSocket message:', message);
            
            switch (message.type) {
                case 'connection':
                    console.log('Admin connected with client ID:', message.data.clientId);
                    break;
                    
                case 'authenticated':
                    console.log('Admin authenticated');
                    break;
                    
                case 'subscribed':
                    console.log('Admin subscribed to game:', message.data.gameId);
                    break;
                    
                case 'sync_game_state':
                    handleAdminSyncGameState(message.data.gameState);
                    break;
                    
                case 'game_state_update':
                    handleAdminGameStateUpdate(message.data.gameState);
                    break;
                    
                case 'timer_update':
                    handleAdminTimerUpdate(message.data.timer, message.data.phase);
                    break;
                    
                case 'card_dealt':
                    handleAdminCardDealt(message.data.card, message.data.side, message.data.position);
                    break;
                    
                case 'game_complete':
                    handleAdminGameComplete(message.data.winner, message.data.winningCard, message.data.totalCards);
                    break;
                    
                case 'bet_placed':
                    handleAdminBetPlaced(message.data.userId, message.data.side, message.data.amount, message.data.round);
                    break;
                    
                case 'betting_stats':
                    handleAdminBettingStats(message.data.andarBets, message.data.baharBets, message.data.totalBets);
                    break;
                    
                case 'phase_change':
                    handleAdminPhaseChange(message.data.phase, message.data.message);
                    break;
                    
                default:
                    console.log('Unknown message type:', message.type);
            }
        }

        // Function to request game state synchronization
        function requestGameStateSync() {
            if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
                websocketConnection.send(JSON.stringify({
                    type: 'sync_request',
                    data: { gameId: currentGameId }
                }));
            }
        }

        // Handle game state synchronization for admin
        function handleAdminSyncGameState(gameStateData) {
            console.log('Admin syncing game state:', gameStateData);
            
            if (gameStateData) {
                // Update admin UI if needed
                updateAdminUI();
            }
        }

        // Handle game state update for admin
        function handleAdminGameStateUpdate(receivedGameState) {
            console.log('Admin game state updated:', receivedGameState);
            
            // Update opening card if provided
            if (receivedGameState.openingCard) {
                updateAdminOpeningCard(receivedGameState.openingCard);
            }
            
            // Update game phase if provided
            if (receivedGameState.phase) {
                updateAdminGamePhase(receivedGameState.phase);
            }
        }

        // Handle timer update for admin
        function handleAdminTimerUpdate(timer, phase) {
            console.log('Admin timer update:', timer, phase);
            
            // Try to access global gameState to ensure it's in scope
            let globalGameState = window.gameState;
            
            // If gameState is not directly available, try to get it from the main window context
            if (!globalGameState && typeof gameState !== 'undefined') {
                globalGameState = gameState;
            }
            
            // Only update if timer is different to avoid conflicts
            if (globalGameState && globalGameState.countdownTimer !== timer) {
                // Update local timer
                globalGameState.countdownTimer = timer;
            } else if (!globalGameState) {
                // If gameState is still not available, try to update from DOM state
                console.warn('Global game state not available, updating timer display only');
            }
            
            // Update timer display regardless
            const timerDisplay = document.getElementById('andarBaharCountdown');
            if (timerDisplay) {
                timerDisplay.textContent = timer;
            }
        }

        // Handle card dealt for admin
        function handleAdminCardDealt(card, side, position) {
            console.log('Admin card dealt:', card, side, position);
            
            // Access global gameState to ensure it's in scope
            const globalGameState = window.gameState;
            if (!globalGameState) {
                console.error('Game state not available for card dealing');
                return;
            }
            
            // Update game state
            if (side === 'andar') {
                globalGameState.andarCards.push(card);
            } else if (side === 'bahar') {
                globalGameState.baharCards.push(card);
            }
            
            // Update UI if needed
            updateAdminUI();
        }

        // Handle game complete for admin
        function handleAdminGameComplete(winner, winningCard, totalCards) {
            console.log('Admin game complete:', winner, winningCard, totalCards);
            
            // Access global gameState to ensure it's in scope
            const globalGameState = window.gameState;
            if (!globalGameState) {
                console.error('Game state not available for game completion');
                return;
            }
            
            // Update game state
            globalGameState.winner = winner;
            globalGameState.winningCard = winningCard;
            globalGameState.phase = 'complete';
            
            // Show notification
            showNotification(`Game complete! ${winner.toUpperCase()} wins with ${winningCard.rank}${winningCard.suit}!`, 'success');
        }

        // Handle bet placed for admin
        function handleAdminBetPlaced(userId, side, amount, round) {
            console.log('Admin bet placed:', userId, side, amount, round);
            
            // Show notification for user bets
            showNotification(`User bet ₹${amount} on ${side}`, 'info');
        }

        // Handle betting stats for admin
        function handleAdminBettingStats(andarBets, baharBets, totalBets) {
            console.log('Admin betting stats:', andarBets, baharBets, totalBets);
            
            // Update betting stats display if it exists
            const andarBetElement = document.getElementById('andarTotalBet');
            const baharBetElement = document.getElementById('baharTotalBet');
            
            if (andarBetElement) {
                andarBetElement.textContent = `₹ ${andarBets.toLocaleString('en-IN')}`;
            }
            
            if (baharBetElement) {
                baharBetElement.textContent = `₹ ${baharBets.toLocaleString('en-IN')}`;
            }
        }

        // Handle phase change for admin
        function handleAdminPhaseChange(phase, message) {
            console.log('Admin phase change:', phase, message);
            
            // Update game phase
            updateAdminGamePhase(phase);
            
            // Show notification about phase change
            if (message) {
                showNotification(message, 'info');
            }
        }

        // Update opening card for admin
        function updateAdminOpeningCard(card) {
            if (card && card.rank && card.suit) {
                gameState.openingCard = card;
                const displayElement = document.getElementById('displayOpeningCard');
                if (displayElement) {
                    displayElement.textContent = `${card.rank}${card.suit}`;
                }
            }
        }

        // Update game phase for admin
        function updateAdminGamePhase(phase) {
            gameState.phase = phase;
            // Update any UI elements that show the phase
        }

        // Update admin UI elements
        function updateAdminUI() {
            // Access global gameState to ensure it's in scope
            const globalGameState = window.gameState;
            
            // Update timer display if it exists
            const timerDisplay = document.getElementById('andarBaharCountdown');
            if (timerDisplay && globalGameState && globalGameState.countdownTimer !== undefined) {
                timerDisplay.textContent = globalGameState.countdownTimer;
            }
        }

        // Override the updateTimerInBackend function to include game_id and broadcast via WebSocket
        async function updateTimerInBackend(timer, phase) {
            try {
                // Access the global gameState to ensure we have the current phase
                const globalGameState = window.gameState;
                const currentPhase = phase || (globalGameState ? globalGameState.phase : 'betting');
                
                const response = await fetch(`${window.API_BASE_URL}/api/game/update-timer`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        timer: timer,
                        game_id: currentGameId,
                        phase: currentPhase
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    console.log('Timer updated successfully:', result);
                    
                    // Broadcast timer update directly via WebSocket for immediate sync
                    if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
                        const timerMessage = {
                            type: 'timer_update',
                            data: {
                                timer: timer,
                                phase: currentPhase
                            }
                        };
                        websocketConnection.send(JSON.stringify(timerMessage));
                        console.log('Timer update broadcast via WebSocket:', timerMessage);
                    }
                } else {
                    console.error('Failed to update timer:', result.message);
                }
            } catch (error) {
                console.error('Error updating timer in backend:', error);
            }
        }

        // Override the updateBettingAmountsInBackend function to include game_id
        async function updateBettingAmountsInBackend() {
            try {
                // Access gameState from window to ensure it's in scope
                const globalGameState = window.gameState;
                if (!globalGameState) {
                    console.error('Game state not available for betting updates');
                    return;
                }
                
                const round = globalGameState.phase;
                const andarTotal = globalGameState.roundBets[round]?.andar || 0;
                const baharTotal = globalGameState.roundBets[round]?.bahar || 0;

                const response = await fetch(`${window.API_BASE_URL}/api/game/submit-bets`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        andarBets: andarTotal,
                        baharBets: baharTotal,
                        game_id: currentGameId  // ADD THIS!
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    console.log('Betting amounts updated successfully:', result);
                } else {
                    console.error('Failed to update betting amounts:', result.message);
                }
            } catch (error) {
                console.error('Error updating betting amounts in backend:', error);
            }
        }

        // Override the selectAndarBaharCard function to broadcast card deals
        const originalSelectAndarBaharCard = window.selectAndarBaharCard;
        window.selectAndarBaharCard = async function(card, index) {
            // Call the original function first to update the gameState
            const result = await originalSelectAndarBaharCard.call(this, card, index);
            
            // Count the number of cards in each side by checking the UI or by accessing the gameState if available
            // Since gameState may not be available in this scope, we need to count differently
            // For now, let's assume we can access the global gameState variable from window
            const globalGameState = window.gameState || this.gameState;
            let position;
            let side;
            
            if (globalGameState) {
                // Determine side and position based on total cards dealt
                const totalCardsSelected = globalGameState.andarCards.length + globalGameState.baharCards.length;
                position = totalCardsSelected;
                const isOddSelection = position % 2 === 1;
                side = isOddSelection ? 'bahar' : 'andar';
            } else {
                // Fallback: Calculate position by counting elements in the UI
                const andarCardCount = document.querySelectorAll('#andarCardSequence .sequence-card').length;
                const baharCardCount = document.querySelectorAll('#baharCardSequence .sequence-card').length;
                const totalCardsDealt = andarCardCount + baharCardCount + 1; // +1 for this card
                position = totalCardsDealt;
                const isOddSelection = totalCardsDealt % 2 === 1;
                side = isOddSelection ? 'bahar' : 'andar';
            }
            
            // Broadcast card deal directly via WebSocket for immediate sync
            if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
                const cardMessage = {
                    type: 'card_dealt',
                    data: {
                        card: {
                            rank: card.display[0],
                            suit: card.display[1]
                        },
                        side: side,
                        position: position
                    }
                };
                websocketConnection.send(JSON.stringify(cardMessage));
                console.log('Card deal broadcast via WebSocket:', cardMessage);
            }
            
            // Also store in backend for persistence
            try {
                const response = await fetch(`${window.API_BASE_URL}/api/game/deal-card`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        card: card.display,
                        side: side,
                        position: position,
                        game_id: currentGameId
                    })
                });
                
                const dealResult = await response.json();
                if (dealResult.success) {
                    console.log('Card dealt successfully to backend:', dealResult);
                } else {
                    console.error('Failed to deal card in backend:', dealResult.message);
                }
            } catch (error) {
                console.error('Error dealing card in backend:', error);
            }
            
            return result;
        };

        // Override the start1stRound function to set opening card and start timer
        const originalStart1stRound = window.start1stRound;
        window.start1stRound = async function() {
            // Call the original function first
            await originalStart1stRound.call(this);
            
            // Get the opening card from the UI since gameState may not be accessible
            const openingCardDisplay = document.getElementById('displayOpeningCard').textContent;
            if (openingCardDisplay && openingCardDisplay !== 'None') {
                // Broadcast game state update to all users
                if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
                    const gameStateMessage = {
                        type: 'game_state_update',
                        data: {
                            gameState: {
                                openingCard: {
                                    rank: openingCardDisplay[0],
                                    suit: openingCardDisplay[1]
                                },
                                phase: 'betting'
                            }
                        }
                    };
                    websocketConnection.send(JSON.stringify(gameStateMessage));
                    console.log('Game state broadcast via WebSocket:', gameStateMessage);
                }
            }
        };

        // Override the resetGame function to reset with game_id
        const originalResetGame = window.resetGame;
        window.resetGame = async function() {
            // Call the original function first
            await originalResetGame.call(this);
            
            // Reset game in backend
            try {
                await fetch(`${window.API_BASE_URL}/api/game/reset-game`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('Game reset in backend');
            } catch (error) {
                console.error('Error resetting game in backend:', error);
            }
        };

        // Override the saveStreamSettings function to broadcast via WebSocket
        const originalSaveStreamSettings = window.saveStreamSettings;
        window.saveStreamSettings = async function() {
            // Get the form values
            const streamType = document.getElementById('streamType').value;
            let streamUrl = '';
            let rtmpUrl = '';
            let rtmpStreamKey = '';
            let fullStreamUrl = '';
            
            if (streamType === 'rtmp') {
                rtmpUrl = document.getElementById('rtmpUrl').value;
                rtmpStreamKey = document.getElementById('rtmpStreamKey').value;
                // Combine RTMP URL and stream key
                fullStreamUrl = rtmpUrl + '/' + rtmpStreamKey;
                streamUrl = fullStreamUrl;
            } else {
                streamUrl = document.getElementById('streamUrl').value;
            }
            
            const streamTitle = document.getElementById('streamTitle').value;
            const streamStatus = document.getElementById('streamStatus').value;
            const streamDescription = document.getElementById('streamDescription').value;

            // Basic validation
            if ((!streamUrl || !streamTitle) && streamType !== 'rtmp') {
                showNotification('Please fill in stream URL and title!', 'error');
                return;
            }

            // Create settings object
            const settings = {
                stream_type: {value: streamType},
                stream_url: {value: streamUrl},
                stream_status: {value: streamStatus},
                stream_title: {value: streamTitle},
                stream_description: {value: streamDescription},
                rtmp_url: {value: rtmpUrl},
                rtmp_stream_key: {value: rtmpStreamKey}
            };

            // Save to localStorage as fallback
            localStorage.setItem('streamSettings', JSON.stringify(settings));
            
            // Broadcast stream settings update via WebSocket to all connected clients
            if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
                const streamUpdateMessage = {
                    type: 'stream_status_update',
                    data: {
                        streamType: streamType,
                        streamUrl: streamUrl,
                        streamStatus: streamStatus,
                        streamTitle: streamTitle,
                        rtmpUrl: rtmpUrl,
                        rtmpStreamKey: rtmpStreamKey
                    }
                };
                websocketConnection.send(JSON.stringify(streamUpdateMessage));
                console.log('Stream settings broadcast via WebSocket:', streamUpdateMessage);
            } else {
                console.log('WebSocket not available, stream settings will update when page refreshes');
            }
            
            // Call the original save function for any additional processing
            if (originalSaveStreamSettings) {
                await originalSaveStreamSettings.call(this);
            } else {
                // Fallback: try to save to backend, but don't fail if API is not available
                fetch(`${window.API_BASE_URL}/api/game/update-stream-settings`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        stream_type: streamType,
                        streamUrl: streamUrl, // Full combined URL for RTMP
                        stream_url: streamUrl, // For compatibility
                        rtmp_url: rtmpUrl,
                        rtmp_stream_key: rtmpStreamKey,
                        streamTitle: streamTitle,
                        streamStatus: streamStatus,
                        streamDescription: streamDescription,
                        game_id: 'default-game'
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        // If response is not OK, it's likely a 404 or other error
                        // Don't try to parse as JSON, just use localStorage
                        console.log('Backend API not available, using localStorage');
                        showNotification('Stream settings saved locally (backend unavailable)', 'success');
                        closeSettingsModal();
                        return; // Exit early, don't try to parse response
                    }
                    return response.json();
                })
                .then(data => {
                    if (data && data.success) {
                        showNotification('Stream settings saved successfully!', 'success');
                        closeSettingsModal();
                    } else if (data) {
                        // If backend fails but localStorage worked, still show success
                        console.log('Backend save failed, using localStorage fallback');
                        showNotification('Stream settings saved (using fallback)!', 'success');
                        closeSettingsModal();
                    } else {
                        // Response was OK but data is null (likely because we returned early for error response)
                        showNotification('Stream settings saved locally (backend unavailable)', 'success');
                        closeSettingsModal();
                    }
                })
                .catch(error => {
                    console.error('Error saving stream settings to backend:', error);
                    // If backend fails, we'll use localStorage which was already saved
                    showNotification('Stream settings saved locally (backend unavailable)', 'success');
                    closeSettingsModal();
                });
            }
        };

        // Initialize admin game sync when DOM is loaded
        document.addEventListener('DOMContentLoaded', function() {
            // Wait a bit for the original game to initialize
            setTimeout(() => {
                // Initialize WebSocket connection
                initializeAdminWebSocket();
                
                // Add event listener for stream type change if the element exists
                const streamTypeElement = document.getElementById('streamType');
                if (streamTypeElement) {
                    streamTypeElement.addEventListener('change', toggleStreamFields);
                }
                
                console.log('Admin synchronization module loaded');
            }, 2000);
        });

        // Broadcast complete game state to all users
        function broadcastGameState() {
            if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
                // Access gameState from the window object to ensure it's in scope
                const globalGameState = window.gameState;
                if (!globalGameState) {
                    console.error('Game state not available for broadcast');
                    return;
                }
                
                const gameStateMessage = {
                    type: 'game_state_update',
                    data: {
                        gameState: {
                            phase: globalGameState.phase,
                            openingCard: globalGameState.selectedOpeningCard ? {
                                rank: globalGameState.selectedOpeningCard.display[0],
                                suit: globalGameState.selectedOpeningCard.display[1]
                            } : null,
                            andarCards: globalGameState.andarCards.map(card => ({
                                rank: card.display[0],
                                suit: card.display[1]
                            })),
                            baharCards: globalGameState.baharCards.map(card => ({
                                rank: card.display[0],
                                suit: card.display[1]
                            })),
                            currentTimer: globalGameState.countdownTimer,
                            winner: globalGameState.winner,
                            winningCard: globalGameState.winningCard ? {
                                rank: globalGameState.winningCard.display[0],
                                suit: globalGameState.winningCard.display[1]
                            } : null
                        }
                    }
                };
                websocketConnection.send(JSON.stringify(gameStateMessage));
                console.log('Complete game state broadcast via WebSocket:', gameStateMessage);
            }
        }

        // Broadcast phase change to all users
        function broadcastPhaseChange(phase, message) {
            if (websocketConnection && websocketConnection.readyState === WebSocket.OPEN) {
                const phaseMessage = {
                    type: 'phase_change',
                    data: {
                        phase: phase,
                        message: message
                    }
                };
                websocketConnection.send(JSON.stringify(phaseMessage));
                console.log('Phase change broadcast via WebSocket:', phaseMessage);
            }
        }
    </script>
    
    <script>
        // Game state
        let gameState = {
            phase: 'opening',
            selectedOpeningCard: null,
            andarCards: [],
            baharCards: [],
            currentRound: 1,
            timer: 30,
            timerInterval: null,
            andarTotalBet: 0,
            baharTotalBet: 0,
            countdownTimer: 30,
            countdownInterval: null,
            roundBets: {
                round1: { andar: 0, bahar: 0 },
                round2: { andar: 0, bahar: 0 },
                round3: { andar: 0, bahar: 0 }
            }
        };
        
        // Make game state globally available for sync overrides
        window.gameState = gameState;

        // Card suits and values
        const cardSuits = ['♠', '♥', '♦', '♣'];
        const cardValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const allCards = [];

        // Generate all cards
        cardSuits.forEach(suit => {
            cardValues.forEach(value => {
                allCards.push({ suit, value, display: `${value}${suit}` });
            });
        });

        // Show notification
        function showNotification(message, type = 'success') {
            const notification = document.getElementById('notification');
            notification.textContent = message;
            notification.className = `notification ${type} show`;
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }

        // Initialize game
        function initializeGame() {
            generateOpeningCards();
        }

        // Generate opening cards grid
        function generateOpeningCards() {
            const grid = document.getElementById('openingCardsGrid');
            grid.innerHTML = '';
            allCards.forEach((card, index) => {
                const cardBtn = document.createElement('button');
                cardBtn.className = 'card-btn';
                cardBtn.textContent = card.display;
                cardBtn.onclick = () => selectOpeningCard(card, index);
                grid.appendChild(cardBtn);
            });
        }

        // Generate Andar Bahar cards grid
        function generateAndarBaharCards() {
            const grid = document.getElementById('andarBaharCardsGrid');
            grid.innerHTML = '';
            allCards.forEach((card, index) => {
                const cardBtn = document.createElement('button');
                cardBtn.className = 'card-btn';
                cardBtn.textContent = card.display;
                cardBtn.onclick = () => selectAndarBaharCard(card, index);
                grid.appendChild(cardBtn);
            });
        }

        // Select opening card
        function selectOpeningCard(card, index) {
            // Remove previous selection
            document.querySelectorAll('#openingCardsGrid .card-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Select new card
            document.querySelectorAll('#openingCardsGrid .card-btn')[index].classList.add('selected');
            gameState.selectedOpeningCard = card;
            document.getElementById('selectedOpeningCard').textContent = card.display;
            
            showNotification(`Opening card selected: ${card.display}`, 'info');
        }

        // Select Andar Bahar card
        async function selectAndarBaharCard(card, index) {
            // Remove previous selection
            document.querySelectorAll('#andarBaharCardsGrid .card-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Select new card
            document.querySelectorAll('#andarBaharCardsGrid .card-btn')[index].classList.add('selected');
            
            // Determine if it's Andar or Bahar based on pattern
            // In Andar Bahar, the first card after opening goes to Bahar, then alternates
            const totalCardsSelected = gameState.andarCards.length + gameState.baharCards.length;
            const nextCardNumber = totalCardsSelected + 1;
            const isOddSelection = nextCardNumber % 2 === 1;
            
            let side = '';
            if (isOddSelection) {
                gameState.baharCards.push(card);
                side = 'bahar';
                showNotification(`Bahar card selected: ${card.display}`, 'info');
            } else {
                gameState.andarCards.push(card);
                side = 'andar';
                showNotification(`Andar card selected: ${card.display}`, 'info');
            }
            
            // Store the card in backend with proper side and position
            try {
                const response = await fetch(`${window.API_BASE_URL}/api/game/deal-card`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        card: card.display,
                        side: side,
                        position: nextCardNumber,
                        game_id: 'default-game'
                    })
                });

                const result = await response.json();
                if (result.success) {
                    console.log('Card dealt successfully:', result);
                    
                    // Check if this was the winning card
                    if (result.data.isWinningCard) {
                        showNotification(`Game complete! ${side.toUpperCase()} wins with ${card.display}!`, 'success');
                        
                        // Update UI to show winner
                        setTimeout(() => {
                            if (confirm(`Game complete! ${side.toUpperCase()} wins with ${card.display}! Start new game?`)) {
                                resetGame();
                            }
                        }, 2000);
                    }
                } else {
                    console.error('Failed to deal card:', result.message);
                    showNotification('Failed to deal card in backend', 'error');
                }
            } catch (error) {
                console.error('Error dealing card:', error);
                showNotification('Error dealing card', 'error');
            }
            
            // Update cards display
            updateCardsDisplay();
        }

        // Update cards display
        function updateCardsDisplay() {
            // Create or update the betting stats display
            const bettingStatsContainer = document.getElementById('bettingStatsContainer');
            
            if (!bettingStatsContainer) {
                console.error('bettingStatsContainer not found');
                return;
            }
            
            // Clear existing content
            bettingStatsContainer.innerHTML = '';
            
            // Create stats display
            const statsHTML = `
                <div class="bet-stat-card">
                    <div class="bet-stat-number">${gameState.andarCards.length}</div>
                    <div class="bet-stat-label">Andar Cards</div>
                </div>
                <div class="bet-stat-card">
                    <div class="bet-stat-number">${gameState.baharCards.length}</div>
                    <div class="bet-stat-label">Bahar Cards</div>
                </div>
                <div class="bet-stat-card">
                    <div class="bet-stat-number">${gameState.andarCards.length + gameState.baharCards.length}</div>
                    <div class="bet-stat-label">Total Cards</div>
                </div>
            `;
            
            bettingStatsContainer.innerHTML = statsHTML;
            
            console.log('Cards selected:', gameState.andarCards, gameState.baharCards);
        }

        // Start game
        function startGame() {
            if (!gameState.selectedOpeningCard) {
                showNotification('Please select an opening card first!', 'error');
                return;
            }
            
            // Show start game popup
            showStartGamePopup();
        }

        // Show start game popup
        function showStartGamePopup() {
            const popup = document.createElement('div');
            popup.className = 'start-game-popup';
            popup.innerHTML = `
                <div class="start-game-popup-content">
                    <h3>Continue Andar Bahar Cards</h3>
                    <p>Opening card selected: ${gameState.selectedOpeningCard.display}</p>
                    <div style="margin: 20px 0;">
                        <label style="color: #ffd700; font-family: 'Poppins', sans-serif; font-size: 1.1rem; display: block; margin-bottom: 10px;">Custom Time (seconds)</label>
                        <input type="number" id="popupCustomTime" class="round-popup-input" value="30" min="10" max="300" style="text-align: center; font-size: 1.2rem; padding: 10px; width: 100%; max-width: 200px;">
                    </div>
                    <div class="start-game-buttons">
                        <button class="start-game-btn" onclick="start1stRound()">Start 1st Round</button>
                        <button class="start-game-btn secondary" onclick="closeStartGamePopup()">Cancel</button>
                    </div>
                </div>
            `;
            document.body.appendChild(popup);
            
            // Focus on input
            setTimeout(() => {
                document.getElementById('popupCustomTime').focus();
            }, 100);
        }

        // Close start game popup
        function closeStartGamePopup() {
            const popup = document.querySelector('.start-game-popup');
            if (popup) {
                popup.remove();
            }
        }

        // Start 1st round
        async function start1stRound() {
            const customTimeElement = document.getElementById('popupCustomTime');
            const customTime = parseInt(customTimeElement.value) || 30;
            
            // Validate time
            if (customTime < 10 || customTime > 300) {
                showNotification('Please enter a valid time (10-300 seconds)!', 'error');
                return;
            }
            
            // Close popup
            closeStartGamePopup();
            
            // Update UI
            document.getElementById('openingCardSection').style.display = 'none';
            document.getElementById('andarBaharSection').style.display = 'block';
            document.getElementById('displayOpeningCard').textContent = gameState.selectedOpeningCard.display;
            
            generateAndarBaharCards();
            
            // SET OPENING CARD IN BACKEND
            try {
                const response = await fetch(`${window.API_BASE_URL}/api/game/set-opening-card`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        card: gameState.selectedOpeningCard.display,
                        game_id: 'default-game'
                    })
                });

                const result = await response.json();
                if (result.success) {
                    console.log('Opening card set in backend:', result);
                    showNotification(`Opening card ${gameState.selectedOpeningCard.display} set successfully!`, 'success');
                } else {
                    console.error('Failed to set opening card:', result.message);
                    showNotification('Failed to set opening card in backend', 'error');
                }
            } catch (error) {
                console.error('Error setting opening card:', error);
                showNotification('Error setting opening card', 'error');
            }

            // START TIMER IN BACKEND
            try {
                const response = await fetch(`${window.API_BASE_URL}/api/game/start-timer`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        duration: customTime,
                        phase: 'betting',
                        game_id: 'default-game'
                    })
                });

                const result = await response.json();
                if (result.success) {
                    console.log('Timer started in backend:', result);
                    showNotification(`1st Round started with ${customTime} seconds!`, 'success');
                    
                    // Start local countdown after backend confirms
                    startCountdown(customTime);
                } else {
                    console.error('Failed to start timer:', result.message);
                    showNotification('Failed to start timer in backend', 'error');
                }
            } catch (error) {
                console.error('Error starting timer:', error);
                showNotification('Error starting timer', 'error');
            }
        }

        // Start countdown timer
        function startCountdown(duration) {
            gameState.countdownTimer = duration;
            
            if (gameState.countdownInterval) {
                clearInterval(gameState.countdownInterval);
            }
            
            updateCountdownDisplay();
            
            gameState.countdownInterval = setInterval(() => {
                gameState.countdownTimer--;
                updateCountdownDisplay();
                
                // Update timer in backend with proper phase information
                // This will broadcast the timer update to all users
                updateTimerInBackend(gameState.countdownTimer, 'betting');
                
                if (gameState.countdownTimer <= 0) {
                    clearInterval(gameState.countdownInterval);
                    showNotification('Betting time is up!', 'warning');
                    
                    // Update backend to indicate betting is closed
                    updateTimerInBackend(0, 'closed');
                }
            }, 1000);
        }

        // Update countdown display
        function updateCountdownDisplay() {
            const countdownElement = document.getElementById('andarBaharCountdown');
            countdownElement.textContent = gameState.countdownTimer;
        }

        // Reset game
        async function resetGame() {
            if (confirm('Are you sure you want to reset the game?')) {
                // Stop countdown timer
                if (gameState.countdownInterval) {
                    clearInterval(gameState.countdownInterval);
                }
                
                // Reset game state
                gameState = {
                    phase: 'opening',
                    selectedOpeningCard: null,
                    andarCards: [],
                    baharCards: [],
                    currentRound: 1,
                    timer: 30,
                    timerInterval: null,
                    andarTotalBet: 0,
                    baharTotalBet: 0,
                    countdownTimer: 30,
                    countdownInterval: null,
                    roundBets: {
                        round1: { andar: 0, bahar: 0 },
                        round2: { andar: 0, bahar: 0 },
                        round3: { andar: 0, bahar: 0 }
                    }
                };
                
                // Update global reference
                window.gameState = gameState;
                
                // Reset UI
                document.getElementById('openingCardSection').style.display = 'block';
                document.getElementById('andarBaharSection').style.display = 'none';
                document.getElementById('selectedOpeningCard').textContent = 'None';
                document.getElementById('andarBaharCountdown').textContent = '30';
                
                generateOpeningCards();
                showNotification('Game reset successfully!', 'success');
            }
        }

        // Update timer in backend (will be overridden by admin-sync-override.js)
        async function updateTimerInBackend(timer, phase) {
            try {
                await fetch(`${window.API_BASE_URL}/api/game/update-timer`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        timer: timer,
                        phase: phase || 'betting'
                    })
                });
            } catch (error) {
                console.error('Error updating timer in backend:', error);
            }
        }

        // Settings Modal Functions
        function openSettingsModal() {
            document.getElementById('settingsModal').style.display = 'flex';
            loadCurrentSettings();
        }

        function closeSettingsModal() {
            document.getElementById('settingsModal').style.display = 'none';
        }
        
        function toggleStreamFields() {
            const streamType = document.getElementById('streamType').value;
            const streamUrlGroup = document.getElementById('streamUrlGroup');
            const rtmpUrlGroup = document.getElementById('rtmpUrlGroup');
            const rtmpStreamKeyGroup = document.getElementById('rtmpStreamKeyGroup');
            
            // Hide all groups first
            streamUrlGroup.style.display = 'none';
            rtmpUrlGroup.style.display = 'none';
            rtmpStreamKeyGroup.style.display = 'none';
            
            if (streamType === 'rtmp') {
                rtmpUrlGroup.style.display = 'block';
                rtmpStreamKeyGroup.style.display = 'block';
            } else {
                streamUrlGroup.style.display = 'block';
            }
        }

        function loadCurrentSettings() {
            // Load current game settings
            document.getElementById('settingsMaxBetAmount').value = '50000';
            document.getElementById('settingsMinBetAmount').value = '1000';
            document.getElementById('gameTimer').value = '30';
            
            // Load current stream settings
            document.getElementById('streamUrl').value = 'hero images/uhd_30fps.mp4';
            document.getElementById('rtmpUrl').value = 'rtmps://live.restream.io:1937/live';
            document.getElementById('rtmpStreamKey').value = 're_10541509_eventd4960ba1734c49369fc0d114295801a0';
            document.getElementById('streamType').value = 'video'; // Default to video
            document.getElementById('streamTitle').value = 'Andar Bahar Live Game';
            document.getElementById('streamStatus').value = 'live';
            document.getElementById('streamDescription').value = 'Watch live Andar Bahar games with real-time betting and instant results.';
            
            // Show/hide appropriate fields based on stream type
            toggleStreamFields();
        }

        function saveGameSettings() {
            const maxBet = document.getElementById('settingsMaxBetAmount').value;
            const minBet = document.getElementById('settingsMinBetAmount').value;
            const timer = document.getElementById('gameTimer').value;
            const openingCard = document.getElementById('openingCard').value;

            // Basic validation
            if (!maxBet || !minBet || !timer) {
                showNotification('Please fill in all game settings!', 'error');
                return;
            }

            if (parseInt(maxBet) <= parseInt(minBet)) {
                showNotification('Max bet must be greater than min bet!', 'error');
                return;
            }

            // Save to localStorage as fallback for game settings too
            const gameSettings = {
                maxBetAmount: maxBet,
                minBetAmount: minBet,
                timer: timer,
                openingCard: openingCard
            };
            localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
            
            // Try to save to backend, but don't fail if API is not available
            fetch(`${window.API_BASE_URL}/api/game/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    maxBetAmount: maxBet,
                    minBetAmount: minBet,
                    timer: timer,
                    openingCard: openingCard,
                    game_id: 'default-game'
                })
            })
            .then(response => {
                if (!response.ok) {
                    // If response is not OK, it's likely a 400 or other error
                    console.log('Game settings backend API not available, using localStorage');
                    showNotification('Game settings saved locally (backend unavailable)', 'success');
                    closeSettingsModal();
                    return; // Exit early, don't try to parse response
                }
                return response.json();
            })
            .then(data => {
                if (data && data.success) {
                    showNotification('Game settings saved successfully!', 'success');
                    closeSettingsModal();
                } else if (data) {
                    // If backend fails but localStorage worked, still show success
                    console.log('Game settings backend save failed, using localStorage fallback');
                    showNotification('Game settings saved (using fallback)!', 'success');
                    closeSettingsModal();
                } else {
                    // Response was OK but data is null (likely because we returned early for error response)
                    showNotification('Game settings saved locally (backend unavailable)', 'success');
                    closeSettingsModal();
                }
            })
            .catch(error => {
                console.error('Error saving game settings to backend:', error);
                // If backend fails, we'll use localStorage which was already saved
                showNotification('Game settings saved locally (backend unavailable)', 'success');
                closeSettingsModal();
            });
        }

        function saveStreamSettings() {
            const streamType = document.getElementById('streamType').value;
            let streamUrl = '';
            let rtmpUrl = '';
            let rtmpStreamKey = '';
            let fullStreamUrl = '';
            
            if (streamType === 'rtmp') {
                rtmpUrl = document.getElementById('rtmpUrl').value;
                rtmpStreamKey = document.getElementById('rtmpStreamKey').value;
                // Combine RTMP URL and stream key
                fullStreamUrl = rtmpUrl + '/' + rtmpStreamKey;
                streamUrl = fullStreamUrl;
            } else {
                streamUrl = document.getElementById('streamUrl').value;
            }
            
            const streamTitle = document.getElementById('streamTitle').value;
            const streamStatus = document.getElementById('streamStatus').value;
            const streamDescription = document.getElementById('streamDescription').value;

            // Basic validation
            if ((!streamUrl || !streamTitle) && streamType !== 'rtmp') {
                showNotification('Please fill in stream URL and title!', 'error');
                return;
            }

            // Create settings object
            const settings = {
                stream_type: {value: streamType},
                stream_url: {value: streamUrl},
                stream_status: {value: streamStatus},
                stream_title: {value: streamTitle},
                stream_description: {value: streamDescription},
                rtmp_url: {value: rtmpUrl},
                rtmp_stream_key: {value: rtmpStreamKey}
            };

            // Save to localStorage as fallback
            localStorage.setItem('streamSettings', JSON.stringify(settings));
            
            // Try to save to backend, but don't fail if API is not available
            fetch(`${window.API_BASE_URL}/api/game/update-stream-settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    stream_type: streamType,
                    streamUrl: streamUrl, // Full combined URL for RTMP
                    stream_url: streamUrl, // For compatibility
                    rtmp_url: rtmpUrl,
                    rtmp_stream_key: rtmpStreamKey,
                    streamTitle: streamTitle,
                    streamStatus: streamStatus,
                    streamDescription: streamDescription,
                    game_id: 'default-game'
                })
            })
            .then(response => {
                if (!response.ok) {
                    // If response is not OK, it's likely a 404 or other error
                    // Don't try to parse as JSON, just use localStorage
                    console.log('Backend API not available, using localStorage');
                    showNotification('Stream settings saved locally (backend unavailable)', 'success');
                    closeSettingsModal();
                    return; // Exit early, don't try to parse response
                }
                return response.json();
            })
            .then(data => {
                if (data && data.success) {
                    showNotification('Stream settings saved successfully!', 'success');
                    closeSettingsModal();
                } else if (data) {
                    // If backend fails but localStorage worked, still show success
                    console.log('Backend save failed, using localStorage fallback');
                    showNotification('Stream settings saved (using fallback)!', 'success');
                    closeSettingsModal();
                } else {
                    // Response was OK but data is null (likely because we returned early for error response)
                    showNotification('Stream settings saved locally (backend unavailable)', 'success');
                    closeSettingsModal();
                }
            })
            .catch(error => {
                console.error('Error saving stream settings to backend:', error);
                // If backend fails, we'll use localStorage which was already saved
                showNotification('Stream settings saved locally (backend unavailable)', 'success');
                closeSettingsModal();
            });
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('settingsModal');
            if (event.target === modal) {
                closeSettingsModal();
            }
        }

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function() {
            initializeGame();
            showNotification('Game Admin Panel loaded!', 'info');
        });
    </script>
</body>
</html>
```

This adds complete functionality to the admin interface including:
- WebSocket integration for real-time game control
- Card selection for opening card and game cards
- Timer control with custom duration setting
- Game state management and broadcasting
- Stream settings management with different stream types
- Real-time synchronization with player clients
- Game reset functionality
- Betting statistics display
- Settings modal with game and stream configuration
- Proper error handling and validation
- Admin-specific broadcasting functions
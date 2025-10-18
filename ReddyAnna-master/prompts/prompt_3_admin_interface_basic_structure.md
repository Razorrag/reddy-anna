# Prompt 3: Admin Interface Basic Structure for Andar Bahar Game

## Objective
Create the basic HTML and CSS structure for the admin interface (game-admin.html) with all visual elements, layout, and styling but without JavaScript functionality. Focus on creating the exact visual layout and design of the original admin interface.

## Files to Create

### 1. game-admin.html (Basic Structure)
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
</body>
</html>
```

This creates the complete visual structure of the admin interface with:
- Gradient background with purple/red theme
- Header with title and settings icon
- Opening card selection section with 52-card grid
- Selected card display
- Game controls (Start Game, Reset Game buttons)
- Andar Bahar card selection section (initially hidden)
- Countdown timer display
- Betting statistics area
- Settings modal with game and stream settings
- Responsive design for different screen sizes
- Notification system
- Start game popup
- Golden/black color scheme with Poppins font
- All proper CSS variables and styling
- Asset directories referenced (hero images/) for future implementation
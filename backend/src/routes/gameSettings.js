import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// Get all game settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await query('SELECT setting_key, setting_value, description FROM game_settings');
    
    // Convert array to object for easier access
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description
      };
    });
    
    res.json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    console.error('Error fetching game settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch game settings'
    });
  }
});

// Update game settings
router.put('/settings', async (req, res) => {
  try {
    const { max_bet_amount, min_bet_amount, game_timer, opening_card } = req.body;
    
    // Validate input
    if (!max_bet_amount || !min_bet_amount || !game_timer) {
      return res.status(400).json({
        success: false,
        message: 'All settings are required'
      });
    }
    
    // Validate numeric values
    const maxBet = parseInt(max_bet_amount);
    const minBet = parseInt(min_bet_amount);
    const gameTimer = parseInt(game_timer);
    
    if (isNaN(maxBet) || isNaN(minBet) || isNaN(gameTimer)) {
      return res.status(400).json({
        success: false,
        message: 'All values must be valid numbers'
      });
    }
    
    if (minBet >= maxBet) {
      return res.status(400).json({
        success: false,
        message: 'Minimum bet must be less than maximum bet'
      });
    }
    
    if (gameTimer < 10 || gameTimer > 300) {
      return res.status(400).json({
        success: false,
        message: 'Game timer must be between 10 and 300 seconds'
      });
    }
    
    // Update settings in database using ON DUPLICATE KEY UPDATE
    const settings = [
      { key: 'max_bet_amount', value: maxBet.toString() },
      { key: 'min_bet_amount', value: minBet.toString() },
      { key: 'game_timer', value: gameTimer.toString() }
    ];
    
    // Add opening card if provided
    if (opening_card) {
      settings.push({ key: 'opening_card', value: opening_card });
    }
    
    for (const setting of settings) {
      await query(
        'INSERT INTO game_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP',
        [setting.key, setting.value]
      );
    }
    
    res.json({
      success: true,
      message: 'Game settings updated successfully',
      data: {
        max_bet_amount: maxBet,
        min_bet_amount: minBet,
        game_timer: gameTimer,
        opening_card: opening_card || 'A♠'
      }
    });
  } catch (error) {
    console.error('Error updating game settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update game settings'
    });
  }
});

// Get specific setting
router.get('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const result = await query(
      'SELECT setting_key, setting_value, description FROM game_settings WHERE setting_key = $1',
      [key]
    );
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        key: result[0].setting_key,
        value: result[0].setting_value,
        description: result[0].description
      }
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch setting'
    });
  }
});

// Get all stream settings
router.get('/stream-settings', async (req, res) => {
  try {
    const settings = await query('SELECT setting_key, setting_value, description FROM stream_settings');
    
    // Convert array to object for easier access
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description
      };
    });
    
    res.json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    console.error('Error fetching stream settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stream settings'
    });
  }
});

// Update stream settings
router.put('/stream-settings', async (req, res) => {
  try {
    const { 
      stream_url, 
      stream_title, 
      stream_status, 
      stream_description, 
      stream_quality, 
      stream_delay, 
      backup_stream_url, 
      stream_embed_code 
    } = req.body;
    
    // Validate required fields
    if (!stream_url || !stream_title || !stream_status) {
      return res.status(400).json({
        success: false,
        message: 'Stream URL, title, and status are required'
      });
    }
    
    // Validate stream status
    if (!['live', 'offline', 'maintenance'].includes(stream_status)) {
      return res.status(400).json({
        success: false,
        message: 'Stream status must be live, offline, or maintenance'
      });
    }
    
    // Update settings in database using ON DUPLICATE KEY UPDATE
    const settings = [
      { key: 'stream_url', value: stream_url },
      { key: 'stream_title', value: stream_title },
      { key: 'stream_status', value: stream_status },
      { key: 'stream_description', value: stream_description || '' },
      { key: 'stream_quality', value: stream_quality || '720p' },
      { key: 'stream_delay', value: stream_delay || '0' },
      { key: 'backup_stream_url', value: backup_stream_url || '' },
      { key: 'stream_embed_code', value: stream_embed_code || '' }
    ];
    
    for (const setting of settings) {
      await query(
        'INSERT INTO stream_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP',
        [setting.key, setting.value]
      );
    }
    
    res.json({
      success: true,
      message: 'Stream settings updated successfully',
      data: {
        stream_url,
        stream_title,
        stream_status,
        stream_description,
        stream_quality,
        stream_delay,
        backup_stream_url,
        stream_embed_code
      }
    });
  } catch (error) {
    console.error('Error updating stream settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stream settings'
    });
  }
});

// Game state management endpoints
let gameState = {
  phase: 'waiting', // waiting, round1, round2, completed
  openingCard: null,
  currentTimer: 0,
  round1Bets: { andar: 0, bahar: 0 },
  round2Bets: { andar: 0, bahar: 0 },
  selectedCards: { andar: [], bahar: [] },
  winner: null,
  gameId: null,
  bettingOpen: false,
  currentRound: 0
};

// Get current game state
router.get('/game-state', async (req, res) => {
  try {
    res.json({
      success: true,
      data: gameState
    });
  } catch (error) {
    console.error('Error fetching game state:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch game state'
    });
  }
});

// Get current betting amounts
router.get('/betting-amounts', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        round1Bets: gameState.round1Bets,
        round2Bets: gameState.round2Bets,
        currentRound: gameState.currentRound,
        phase: gameState.phase
      }
    });
  } catch (error) {
    console.error('Error fetching betting amounts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch betting amounts'
    });
  }
});

// Update opening card
router.post('/set-opening-card', async (req, res) => {
  try {
    const { card } = req.body;
    
    if (!card) {
      return res.status(400).json({
        success: false,
        message: 'Card is required'
      });
    }
    
    // Clear previous game state when setting new opening card
    gameState = {
      phase: 'waiting',
      openingCard: card,
      currentTimer: 0,
      round1Bets: { andar: 0, bahar: 0 },
      round2Bets: { andar: 0, bahar: 0 },
      selectedCards: { andar: [], bahar: [] },
      winner: null,
      gameId: null,
      bettingOpen: false,
      currentRound: 0
    };
    
    // Update database
    await query(
      'INSERT INTO game_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP',
      ['opening_card', card]
    );
    
    res.json({
      success: true,
      message: 'Opening card set successfully - Previous game state cleared',
      data: { 
        openingCard: card,
        gameState: gameState
      }
    });
  } catch (error) {
    console.error('Error setting opening card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set opening card'
    });
  }
});

// Start timer for a round
router.post('/start-timer', async (req, res) => {
  try {
    const { round, duration } = req.body;
    
    if (!round || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Round and duration are required'
      });
    }
    
    if (duration < 10 || duration > 300) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 10 and 300 seconds'
      });
    }
    
    // Clear previous round data when starting new round
    if (round === 'round1') {
      // Clear all previous game data for new game
      gameState.round1Bets = { andar: 0, bahar: 0 };
      gameState.round2Bets = { andar: 0, bahar: 0 };
      gameState.selectedCards = { andar: [], bahar: [] };
      gameState.winner = null;
    } else if (round === 'round2') {
      // Clear only Round 2 data, keep Round 1 data
      gameState.round2Bets = { andar: 0, bahar: 0 };
      // Keep selected cards from Round 1
    }
    
    gameState.phase = round;
    gameState.currentTimer = duration;
    gameState.gameId = Date.now().toString();
    gameState.bettingOpen = true;
    gameState.currentRound = round === 'round1' ? 1 : 2;
    
    res.json({
      success: true,
      message: `Timer started for ${round} - Previous ${round} data cleared`,
      data: { 
        phase: gameState.phase,
        timer: gameState.currentTimer,
        gameId: gameState.gameId,
        bettingOpen: gameState.bettingOpen,
        currentRound: gameState.currentRound,
        gameState: gameState
      }
    });
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start timer'
    });
  }
});

// Update timer countdown
router.post('/update-timer', async (req, res) => {
  try {
    const { timer } = req.body;
    
    if (timer === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Timer value is required'
      });
    }
    
    gameState.currentTimer = timer;
    
    // If timer reaches 0, stop betting
    if (timer <= 0) {
      gameState.bettingOpen = false;
    }
    
    res.json({
      success: true,
      message: 'Timer updated',
      data: { 
        timer: gameState.currentTimer,
        bettingOpen: gameState.bettingOpen
      }
    });
  } catch (error) {
    console.error('Error updating timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update timer'
    });
  }
});

// Submit betting totals
router.post('/submit-bets', async (req, res) => {
  try {
    const { round, andarTotal, baharTotal } = req.body;
    
    if (!round || andarTotal === undefined || baharTotal === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Round, andar total, and bahar total are required'
      });
    }
    
    if (round === 'round1') {
      gameState.round1Bets = { andar: andarTotal, bahar: baharTotal };
    } else if (round === 'round2') {
      gameState.round2Bets = { andar: andarTotal, bahar: baharTotal };
    }
    
    res.json({
      success: true,
      message: `Bets submitted for ${round}`,
      data: { 
        round,
        andarTotal,
        baharTotal
      }
    });
  } catch (error) {
    console.error('Error submitting bets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit bets'
    });
  }
});

// Select cards for a round
router.post('/select-cards', async (req, res) => {
  try {
    const { round, side, cards } = req.body;
    
    if (!round || !side || !cards) {
      return res.status(400).json({
        success: false,
        message: 'Round, side, and cards are required'
      });
    }
    
    if (!['andar', 'bahar'].includes(side)) {
      return res.status(400).json({
        success: false,
        message: 'Side must be andar or bahar'
      });
    }
    
    gameState.selectedCards[side] = cards;
    
    // Check for winner
    const winner = checkWinner(gameState.openingCard, gameState.selectedCards);
    if (winner) {
      gameState.winner = winner;
      gameState.phase = 'completed';
    }
    
    res.json({
      success: true,
      message: `Cards selected for ${side}`,
      data: { 
        round,
        side,
        cards,
        winner: gameState.winner,
        phase: gameState.phase
      }
    });
  } catch (error) {
    console.error('Error selecting cards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select cards'
    });
  }
});

// Reset game state
router.post('/reset-game', async (req, res) => {
  try {
    gameState = {
      phase: 'waiting',
      openingCard: null,
      currentTimer: 0,
      round1Bets: { andar: 0, bahar: 0 },
      round2Bets: { andar: 0, bahar: 0 },
      selectedCards: { andar: [], bahar: [] },
      winner: null,
      gameId: null,
      bettingOpen: false,
      currentRound: 0
    };
    
    res.json({
      success: true,
      message: 'Game reset successfully',
      data: gameState
    });
  } catch (error) {
    console.error('Error resetting game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset game'
    });
  }
});

// Helper function to check winner
function checkWinner(openingCard, selectedCards) {
  if (!openingCard) return null;
  
  const openingRank = getCardRank(openingCard);
  
  // Check Andar cards
  for (const card of selectedCards.andar) {
    if (getCardRank(card) === openingRank) {
      return 'andar';
    }
  }
  
  // Check Bahar cards
  for (const card of selectedCards.bahar) {
    if (getCardRank(card) === openingRank) {
      return 'bahar';
    }
  }
  
  return null;
}

// Helper function to get card rank (ignoring suit)
function getCardRank(card) {
  if (!card) return null;
  
  // Remove suit symbols and get the rank
  const rank = card.replace(/[♠♥♦♣]/g, '').trim();
  
  // Handle face cards
  if (rank === 'A') return 'A';
  if (rank === 'K') return 'K';
  if (rank === 'Q') return 'Q';
  if (rank === 'J') return 'J';
  
  return rank;
}

export default router;

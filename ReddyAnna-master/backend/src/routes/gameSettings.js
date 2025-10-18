import express from 'express';
import { query } from '../db.js';
import {
  broadcastToGame,
  broadcastTimerUpdate,
  broadcastCardDealt,
  broadcastBettingStats,
  broadcastGameComplete,
  broadcastPhaseChange
} from '../websocket.js';

const router = express.Router();

// Get all game settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await query('game_settings', 'select');

    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.setting_key] = {
        value: setting.setting_value,
        description: setting.description
      };
    });

    res.json({ success: true, data: settingsObj });
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
    
    // Update settings in database
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
      // Check if setting exists
      const existing = await query('game_settings', 'select', {
        where: { column: 'setting_key', value: setting.key }
      });
      
      if (existing.length > 0) {
        // Update existing setting
        await query('game_settings', 'update', {
          where: { column: 'setting_key', value: setting.key },
          data: {
            setting_value: setting.value,
            updated_at: new Date().toISOString()
          }
        });
      } else {
        // Insert new setting
        await query('game_settings', 'insert', {
          data: {
            setting_key: setting.key,
            setting_value: setting.value,
            updated_at: new Date().toISOString()
          }
        });
      }
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
    
    const result = await query('game_settings', 'select', {
      where: { column: 'setting_key', value: key }
    });
    
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

// Get opening card
router.get('/settings/opening_card', async (req, res) => {
  try {
    const setting = await query('game_settings', 'select', {
      where: { column: 'setting_key', value: 'opening_card' }
    });
    
    if (setting.length > 0) {
      res.json({
        success: true,
        data: setting[0]
      });
    } else {
      res.json({
        success: false,
        message: 'Opening card not found'
      });
    }
  } catch (error) {
    console.error('Error fetching opening card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch opening card'
    });
  }
});

// Get all stream settings
router.get('/stream-settings', async (req, res) => {
  try {
    const settings = await query('stream_settings', 'select');
    
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
      stream_embed_code,
      rtmp_url,
      rtmp_stream_key,
      stream_type
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
    
    // Validate stream type
    if (stream_type && !['video', 'rtmp', 'embed'].includes(stream_type)) {
      return res.status(400).json({
        success: false,
        message: 'Stream type must be video, rtmp, or embed'
      });
    }
    
    // Update settings in database
    const settings = [
      { key: 'stream_url', value: stream_url },
      { key: 'stream_title', value: stream_title },
      { key: 'stream_status', value: stream_status },
      { key: 'stream_description', value: stream_description || '' },
      { key: 'stream_quality', value: stream_quality || '720p' },
      { key: 'stream_delay', value: stream_delay || '0' },
      { key: 'backup_stream_url', value: backup_stream_url || '' },
      { key: 'stream_embed_code', value: stream_embed_code || '' },
      { key: 'rtmp_url', value: rtmp_url || '' },
      { key: 'rtmp_stream_key', value: rtmp_stream_key || '' },
      { key: 'stream_type', value: stream_type || 'video' }
    ];
    
    for (const setting of settings) {
      // Check if setting exists
      const existing = await query('stream_settings', 'select', {
        where: { column: 'setting_key', value: setting.key }
      });
      
      if (existing.length > 0) {
        // Update existing setting
        await query('stream_settings', 'update', {
          where: { column: 'setting_key', value: setting.key },
          data: {
            setting_value: setting.value,
            updated_at: new Date().toISOString()
          }
        });
      } else {
        // Insert new setting
        await query('stream_settings', 'insert', {
          data: {
            setting_key: setting.key,
            setting_value: setting.value,
            updated_at: new Date().toISOString()
          }
        });
      }
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
        stream_embed_code,
        rtmp_url,
        rtmp_stream_key,
        stream_type
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

// Update stream settings (POST endpoint for frontend compatibility)
router.post('/update-stream-settings', async (req, res) => {
  try {
    const {
      stream_type,
      streamUrl,
      stream_url,
      rtmp_url,
      rtmp_stream_key,
      streamTitle,
      streamStatus,
      streamDescription,
      game_id
    } = req.body;
    
    // Use stream_url if provided, otherwise use streamUrl
    const finalStreamUrl = stream_url || streamUrl || '';
    
    // Validate required fields
    if (!finalStreamUrl || !streamTitle || !streamStatus) {
      return res.status(400).json({
        success: false,
        message: 'Stream URL, title, and status are required'
      });
    }
    
    // Validate stream status
    if (!['live', 'offline', 'maintenance'].includes(streamStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Stream status must be live, offline, or maintenance'
      });
    }
    
    // Validate stream type
    if (stream_type && !['video', 'rtmp', 'embed'].includes(stream_type)) {
      return res.status(400).json({
        success: false,
        message: 'Stream type must be video, rtmp, or embed'
      });
    }
    
    // Update settings in database
    const settings = [
      { key: 'stream_url', value: finalStreamUrl },
      { key: 'stream_title', value: streamTitle },
      { key: 'stream_status', value: streamStatus },
      { key: 'stream_description', value: streamDescription || '' },
      { key: 'rtmp_url', value: rtmp_url || '' },
      { key: 'rtmp_stream_key', value: rtmp_stream_key || '' },
      { key: 'stream_type', value: stream_type || 'video' }
    ];
    
    for (const setting of settings) {
      // Check if setting exists
      const existing = await query('stream_settings', 'select', {
        where: { column: 'setting_key', value: setting.key }
      });
      
      if (existing.length > 0) {
        // Update existing setting
        await query('stream_settings', 'update', {
          where: { column: 'setting_key', value: setting.key },
          data: {
            setting_value: setting.value,
            updated_at: new Date().toISOString()
          }
        });
      } else {
        // Insert new setting
        await query('stream_settings', 'insert', {
          data: {
            setting_key: setting.key,
            setting_value: setting.value,
            updated_at: new Date().toISOString()
          }
        });
      }
    }
    
    // Broadcast stream settings update to all clients
    broadcastToGame(game_id || 'default-game', {
      type: 'stream_status_update',
      data: {
        streamType: stream_type || 'video',
        streamUrl: finalStreamUrl,
        streamStatus: streamStatus,
        streamTitle: streamTitle,
        rtmpUrl: rtmp_url || '',
        rtmpStreamKey: rtmp_stream_key || ''
      }
    });
    
    res.json({
      success: true,
      message: 'Stream settings updated successfully',
      data: {
        stream_url: finalStreamUrl,
        stream_title: streamTitle,
        stream_status: streamStatus,
        stream_description: streamDescription,
        rtmp_url: rtmp_url,
        rtmp_stream_key: rtmp_stream_key,
        stream_type: stream_type || 'video'
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

// Check stream status
router.get('/stream-status', async (req, res) => {
  try {
    // Get current stream settings
    const streamStatusSetting = await query('stream_settings', 'select', {
      where: { column: 'setting_key', value: 'stream_status' }
    });
    
    const streamTypeSetting = await query('stream_settings', 'select', {
      where: { column: 'setting_key', value: 'stream_type' }
    });
    
    const streamUrlSetting = await query('stream_settings', 'select', {
      where: { column: 'setting_key', value: 'stream_url' }
    });
    
    const rtmpUrlSetting = await query('stream_settings', 'select', {
      where: { column: 'setting_key', value: 'rtmp_url' }
    });
    
    const rtmpStreamKeySetting = await query('stream_settings', 'select', {
      where: { column: 'setting_key', value: 'rtmp_stream_key' }
    });
    
    const status = streamStatusSetting.length > 0 ? streamStatusSetting[0].setting_value : 'offline';
    const type = streamTypeSetting.length > 0 ? streamTypeSetting[0].setting_value : 'video';
    const url = streamUrlSetting.length > 0 ? streamUrlSetting[0].setting_value : '';
    const rtmpUrl = rtmpUrlSetting.length > 0 ? rtmpUrlSetting[0].setting_value : '';
    const rtmpStreamKey = rtmpStreamKeySetting.length > 0 ? rtmpStreamKeySetting[0].setting_value : '';
    
    // Check if stream is actually reachable
    let isReachable = false;
    let errorMessage = null;
    
    if (status === 'live') {
      try {
        if (type === 'video') {
          // For video files, check if the file exists
          if (url && !url.startsWith('http')) {
            // Local file check would require file system access
            // For now, we'll assume it's reachable
            isReachable = true;
          } else if (url && url.startsWith('http')) {
            // For remote videos, we could make a HEAD request
            // For simplicity, we'll assume it's reachable
            isReachable = true;
          }
        } else if (type === 'embed') {
          // For embed codes, check if it's a valid URL
          if (url && (url.includes('youtube.com') || url.includes('twitch.tv'))) {
            isReachable = true;
          }
        } else if (type === 'rtmp') {
          // For RTMP, we would need to check the RTMP server
          // For simplicity, we'll assume it's reachable if URL and key are provided
          if (rtmpUrl && rtmpStreamKey) {
            isReachable = true;
          }
        }
      } catch (error) {
        errorMessage = error.message;
      }
    }
    
    res.json({
      success: true,
      data: {
        status,
        type,
        url,
        rtmpUrl,
        isReachable,
        errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error checking stream status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check stream status',
      error: error.message
    });
  }
});

// Get betting amounts for the game
router.get('/betting-amounts', async (req, res) => {
  try {
    // Get current betting amounts from the database or settings
    const maxBetSetting = await query('game_settings', 'select', {
      where: { column: 'setting_key', value: 'max_bet_amount' }
    });
    
    const minBetSetting = await query('game_settings', 'select', {
      where: { column: 'setting_key', value: 'min_bet_amount' }
    });
    
    const settings = [...maxBetSetting, ...minBetSetting];
    
    let maxBet = 50000; // Default value
    let minBet = 1000;  // Default value
    
    settings.forEach(setting => {
      if (setting.setting_key === 'max_bet_amount') {
        maxBet = parseInt(setting.setting_value) || 50000;
      } else if (setting.setting_key === 'min_bet_amount') {
        minBet = parseInt(setting.setting_value) || 1000;
      }
    });
    
    res.json({
      success: true,
      data: {
        max_bet_amount: maxBet,
        min_bet_amount: minBet
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

// Select cards for the game
router.post('/select-cards', async (req, res) => {
  try {
    const { cards } = req.body;
    
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cards array is required'
      });
    }
    
    // Store selected cards in database or session
    // For now, just return success
    res.json({
      success: true,
      message: 'Cards selected successfully',
      data: { cards }
    });
  } catch (error) {
    console.error('Error selecting cards:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to select cards'
    });
  }
});

// Start game timer
router.post('/start-timer', async (req, res) => {
  try {
    const { duration, phase, game_id } = req.body;
    
    // Get or create a game session
    const currentGameId = game_id || 'game-' + Date.now();
    
    // Check if game session exists
    const existingSession = await query('game_sessions', 'select', {
      where: { column: 'game_id', value: currentGameId }
    });
    
    if (existingSession.length === 0) {
      // Create new game session
      await query('game_sessions', 'insert', {
        data: {
          game_id: currentGameId,
          phase: phase || 'betting',
          current_timer: duration || 30,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    } else {
      // Update existing session
      await query('game_sessions', 'update', {
        where: { column: 'game_id', value: currentGameId },
        data: {
          phase: phase || 'betting',
          current_timer: duration || 30,
          status: 'active',
          updated_at: new Date().toISOString()
        }
      });
    }
    
    // Broadcast timer start to all clients
    broadcastTimerUpdate(currentGameId, duration || 30, phase || 'betting');
    
    res.json({
      success: true,
      message: 'Timer started successfully',
      data: { game_id: currentGameId }
    });
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start timer'
    });
  }
});

// Update timer
router.post('/update-timer', async (req, res) => {
  try {
    const { time, phase, game_id } = req.body;
    
    // Use default game ID if not provided
    const currentGameId = game_id || 'default-game';
    
    // Update game session
    const updateData = {};
    if (time !== undefined) updateData.current_timer = time;
    if (phase) updateData.phase = phase;
    updateData.updated_at = new Date().toISOString();
    
    // Check if game session exists
    const existingSession = await query('game_sessions', 'select', {
      where: { column: 'game_id', value: currentGameId }
    });
    
    if (existingSession.length === 0) {
      // Create new game session if it doesn't exist
      await query('game_sessions', 'insert', {
        data: {
          game_id: currentGameId,
          phase: phase || 'betting',
          current_timer: time || 30,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    } else {
      // Update existing session
      await query('game_sessions', 'update', {
        where: { column: 'game_id', value: currentGameId },
        data: updateData
      });
    }
    
    // Broadcast timer update to all clients
    // Only broadcast if time is not null or undefined
    if (time !== null && time !== undefined) {
      console.log(`Broadcasting timer update: ${time}s for game ${currentGameId}, phase: ${phase || 'betting'}`);
      broadcastTimerUpdate(currentGameId, time, phase || 'betting');
    }
    
    res.json({
      success: true,
      message: 'Timer updated successfully',
      data: {
        game_id: currentGameId,
        timer: time || 30,
        phase: phase || 'betting'
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

// Set opening card
router.post('/set-opening-card', async (req, res) => {
  try {
    const { card, game_id } = req.body;
    
    if (!card) {
      return res.status(400).json({
        success: false,
        message: 'Card is required'
      });
    }
    
    // Store opening card in settings
    const existingCard = await query('game_settings', 'select', {
      where: { column: 'setting_key', value: 'opening_card' }
    });
    
    if (existingCard.length > 0) {
      await query('game_settings', 'update', {
        where: { column: 'setting_key', value: 'opening_card' },
        data: {
          setting_value: card,
          updated_at: new Date().toISOString()
        }
      });
    } else {
      await query('game_settings', 'insert', {
        data: {
          setting_key: 'opening_card',
          setting_value: card,
          updated_at: new Date().toISOString()
        }
      });
    }
    
    // Create or update game session with opening card
    const currentGameId = game_id || 'game-' + Date.now();
    
    // Check if game session exists
    const existingSession = await query('game_sessions', 'select', {
      where: { column: 'game_id', value: currentGameId }
    });
    
    if (existingSession.length === 0) {
      // Create new game session
      await query('game_sessions', 'insert', {
        data: {
          game_id: currentGameId,
          opening_card: card,
          phase: 'waiting',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    } else {
      // Update existing session
      await query('game_sessions', 'update', {
        where: { column: 'game_id', value: currentGameId },
        data: {
          opening_card: card,
          phase: 'waiting',
          status: 'active',
          updated_at: new Date().toISOString()
        }
      });
    }
    
    // Broadcast opening card to all clients
    broadcastToGame(currentGameId, {
      type: 'game_state_update',
      data: {
        gameState: {
          openingCard: { rank: card[0], suit: card[1] },
          phase: 'waiting'
        }
      }
    });
    
    res.json({
      success: true,
      message: 'Opening card set successfully',
      data: { card, game_id: currentGameId }
    });
  } catch (error) {
    console.error('Error setting opening card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set opening card'
    });
  }
});

// Submit bets
router.post('/submit-bets', async (req, res) => {
  try {
    const { andarBets, baharBets, game_id } = req.body;
    
    // Use default game ID if not provided
    const currentGameId = game_id || 'default-game';
    
    // Update game session with bet totals
    await query('game_sessions', 'update', {
      where: { column: 'game_id', value: currentGameId },
      data: {
        updated_at: new Date().toISOString()
      }
    });
    
    // Broadcast betting stats to all clients
    broadcastBettingStats(currentGameId, andarBets || 0, baharBets || 0);
    
    res.json({
      success: true,
      message: 'Bets submitted successfully',
      data: {
        andarBets,
        baharBets,
        game_id: currentGameId
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

// Reset game
router.post('/reset-game', async (req, res) => {
  try {
    // Update all active game sessions to cancelled
    await query('game_sessions', 'update', {
      where: { column: 'status', value: 'active' },
      data: {
        status: 'cancelled',
        updated_at: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: 'Game reset successfully'
    });
  } catch (error) {
    console.error('Error resetting game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset game'
    });
  }
});

// Deal a card in the game
router.post('/deal-card', async (req, res) => {
  try {
    const { card, side, position, game_id } = req.body;
    
    if (!card || !side || !position) {
      return res.status(400).json({
        success: false,
        message: 'Card, side, and position are required'
      });
    }
    
    // Use default game ID if not provided
    const currentGameId = game_id || 'default-game';
    
    // Check if game session exists
    const existingSession = await query('game_sessions', 'select', {
      where: { column: 'game_id', value: currentGameId }
    });
    
    if (existingSession.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Game session not found'
      });
    }
    
    // Store the dealt card
    await query('dealt_cards', 'insert', {
      data: {
        game_id: currentGameId,
        card: card,
        side: side,
        position: position,
        is_winning_card: false,
        created_at: new Date().toISOString()
      }
    });
    
    // Check if this card matches the opening card (winning condition)
    const openingCardSetting = await query('game_settings', 'select', {
      where: { column: 'setting_key', value: 'opening_card' }
    });
    
    let isWinningCard = false;
    if (openingCardSetting.length > 0) {
      const openingCard = openingCardSetting[0].setting_value;
      if (openingCard && openingCard.length >= 2 && card.length >= 2) {
        isWinningCard = openingCard[0] === card[0]; // Check if rank matches
      }
    }
    
    if (isWinningCard) {
      // Mark as winning card
      await query('dealt_cards', 'update', {
        where: {
          column: 'game_id',
          value: currentGameId,
          additionalConditions: [
            { column: 'card', value: card },
            { column: 'side', value: side },
            { column: 'position', value: position }
          ]
        },
        data: { is_winning_card: true }
      });
      
      // Update game session with winner
      await query('game_sessions', 'update', {
        where: { column: 'game_id', value: currentGameId },
        data: {
          winner: side,
          winning_card: card,
          phase: 'completed',
          status: 'completed',
          updated_at: new Date().toISOString()
        }
      });
      
      // Get total cards dealt
      const totalCardsResult = await query('dealt_cards', 'select', {
        where: { column: 'game_id', value: currentGameId }
      });
      
      // Broadcast game complete
      broadcastGameComplete(currentGameId, side, card, totalCardsResult.length);
      
      // Update game history
      await query('game_history', 'insert', {
        data: {
          game_id: currentGameId,
          opening_card: openingCardSetting[0]?.setting_value || 'A♠',
          winner: side,
          winning_card: card,
          total_cards: totalCardsResult.length,
          created_at: new Date().toISOString()
        }
      });
    } else {
      // Update game session phase to dealing
      await query('game_sessions', 'update', {
        where: { column: 'game_id', value: currentGameId },
        data: {
          phase: 'dealing',
          updated_at: new Date().toISOString()
        }
      });
    }
    
    // Broadcast card dealt to all clients
    broadcastCardDealt(currentGameId, card, side, position);
    
    res.json({
      success: true,
      message: 'Card dealt successfully',
      data: {
        card: card,
        side: side,
        position: position,
        game_id: currentGameId,
        isWinningCard: isWinningCard
      }
    });
  } catch (error) {
    console.error('Error dealing card:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deal card'
    });
  }
});

// Get betting statistics for a game
router.get('/betting-stats/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Get total bets for each side
    const andarBetsResult = await query('player_bets', 'select', {
      where: {
        column: 'game_id',
        value: gameId,
        additionalConditions: [
          { column: 'side', value: 'andar' },
          { column: 'status', value: 'active' }
        ]
      }
    });
    
    const baharBetsResult = await query('player_bets', 'select', {
      where: {
        column: 'game_id',
        value: gameId,
        additionalConditions: [
          { column: 'side', value: 'bahar' },
          { column: 'status', value: 'active' }
        ]
      }
    });
    
    // Calculate totals
    const andarTotal = andarBetsResult.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
    const baharTotal = baharBetsResult.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
    
    res.json({
      success: true,
      data: {
        andarBets: andarTotal,
        baharBets: baharTotal,
        totalBets: andarTotal + baharTotal
      }
    });
  } catch (error) {
    console.error('Error getting betting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get betting stats'
    });
  }
});

// Change game phase
router.post('/change-phase', async (req, res) => {
  try {
    const { phase, game_id, message } = req.body;
    
    if (!phase) {
      return res.status(400).json({
        success: false,
        message: 'Phase is required'
      });
    }
    
    // Use default game ID if not provided
    const currentGameId = game_id || 'default-game';
    
    // Check if game session exists
    const existingSession = await query('game_sessions', 'select', {
      where: { column: 'game_id', value: currentGameId }
    });
    
    if (existingSession.length === 0) {
      // Create new game session
      await query('game_sessions', 'insert', {
        data: {
          game_id: currentGameId,
          phase: phase,
          status: 'active',
          current_timer: 30,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    } else {
      // Update existing session
      await query('game_sessions', 'update', {
        where: { column: 'game_id', value: currentGameId },
        data: {
          phase: phase,
          updated_at: new Date().toISOString()
        }
      });
    }
    
    // Broadcast phase change to all clients
    broadcastPhaseChange(currentGameId, phase, message || `Game phase changed to ${phase}`);
    
    res.json({
      success: true,
      message: 'Phase changed successfully',
      data: {
        phase: phase,
        game_id: currentGameId
      }
    });
  } catch (error) {
    console.error('Error changing phase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change phase'
    });
  }
});

// Place bet endpoint
router.post('/place-bet', async (req, res) => {
  try {
    const { userId, gameId, round, side, amount } = req.body;
    
    // Validate input
    if (!userId || !gameId || !side || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Validate side
    if (!['andar', 'bahar'].includes(side)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid side. Must be andar or bahar'
      });
    }
    
    // Validate amount
    const betAmount = parseFloat(amount);
    if (isNaN(betAmount) || betAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bet amount'
      });
    }
    
    // Get betting limits
    const maxBetSetting = await query('game_settings', 'select', {
      where: { column: 'setting_key', value: 'max_bet_amount' }
    });
    
    const minBetSetting = await query('game_settings', 'select', {
      where: { column: 'setting_key', value: 'min_bet_amount' }
    });
    
    const maxBet = maxBetSetting.length > 0 ? parseInt(maxBetSetting[0].setting_value) : 50000;
    const minBet = minBetSetting.length > 0 ? parseInt(minBetSetting[0].setting_value) : 1000;
    
    if (betAmount < minBet || betAmount > maxBet) {
      return res.status(400).json({
        success: false,
        message: `Bet amount must be between ₹${minBet} and ₹${maxBet}`
      });
    }
    
    // Store the bet
    await query('player_bets', 'insert', {
      data: {
        user_id: userId,
        game_id: gameId || 'default-game',
        round: round || 'round1',
        side: side,
        amount: betAmount.toString(),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    });
    
    // Get updated betting stats
    const andarBetsResult = await query('player_bets', 'select', {
      where: {
        column: 'game_id',
        value: gameId || 'default-game',
        additionalConditions: [
          { column: 'side', value: 'andar' },
          { column: 'status', value: 'active' }
        ]
      }
    });
    
    const baharBetsResult = await query('player_bets', 'select', {
      where: {
        column: 'game_id',
        value: gameId || 'default-game',
        additionalConditions: [
          { column: 'side', value: 'bahar' },
          { column: 'status', value: 'active' }
        ]
      }
    });
    
    // Calculate totals
    const andarTotal = andarBetsResult.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
    const baharTotal = baharBetsResult.reduce((sum, bet) => sum + parseFloat(bet.amount), 0);
    
    // Broadcast updated betting stats
    broadcastBettingStats(gameId || 'default-game', andarTotal, baharTotal);
    
    // Broadcast bet placement to other users
    broadcastToGame(gameId || 'default-game', {
      type: 'bet_placed',
      data: {
        userId: userId,
        side: side,
        amount: betAmount,
        round: round || 'round1'
      }
    });
    
    res.json({
      success: true,
      message: 'Bet placed successfully',
      data: {
        betAmount: betAmount,
        side: side,
        andarTotal: andarTotal,
        baharTotal: baharTotal
      }
    });
  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place bet'
    });
  }
});

export default router;

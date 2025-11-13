/**
 * Stream API Routes
 * 
 * RESTful API endpoints for managing dual streaming (RTMP and WebRTC)
 * Handles configuration, status updates, and session management
 * 
 * NEW: Simple stream configuration for iframe/video embeds
 */

import express, { Router } from 'express';
import { streamStorage } from './stream-storage';
import { requireAuth } from './auth';
import { validateAdminAccess } from './security'; // Import from central security
import jwt from 'jsonwebtoken';
import { supabaseServer } from './lib/supabaseServer';

const router: Router = express.Router();

// Optional authentication middleware - tries to authenticate user but doesn't fail if no token provided
const optionalAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      const secret = process.env.JWT_SECRET as string;
      const decoded = jwt.verify(token, secret) as any;
      
      // Ensure this is an access token, not a refresh token
      if (decoded.type === 'access') {
        req.user = {
          id: decoded.id,
          phone: decoded.phone,
          username: decoded.username,
          role: decoded.role
        };
      }
    } catch (authError) {
      // If token is invalid, continue without user authentication
      console.log('Invalid token provided, proceeding without user context');
    }
  }
  // Always continue to next middleware regardless of authentication status
  next();
};

/**
 * GET /api/stream/config
 * Get current stream configuration
 * Public endpoint - accessible to all authenticated users with role-based data filtering
 */
router.get('/config', optionalAuth, async (req, res) => {
  try {
    const config = await streamStorage.getStreamConfig();
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Stream configuration not found'
      });
    }

    // Hide sensitive data from non-admin users
    if (!req.user || req.user.role !== 'admin') {
      const publicConfig = {
        id: config.id,
        activeMethod: config.activeMethod,
        streamStatus: config.streamStatus,
        streamTitle: config.streamTitle,
        // Only include public player-accessible stream URLs
        rtmpPlayerUrl: config.rtmpPlayerUrl,
        webrtcRoomId: config.webrtcRoomId,
        viewerCount: config.viewerCount,
        totalViews: config.totalViews,
        streamDurationSeconds: config.streamDurationSeconds
      };
      
      return res.json({
        success: true,
        data: publicConfig
      });
    }

    // Admin gets full config
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('❌ Error fetching stream config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stream configuration'
    });
  }
});

/**
 * POST /api/stream/method
 * Switch streaming method (Admin only)
 */
router.post('/method', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const { method } = req.body;

    if (!['rtmp', 'webrtc'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stream method. Must be "rtmp" or "webrtc"'
      });
    }

    const success = await streamStorage.updateStreamMethod(method);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update stream method'
      });
    }

    res.json({
      success: true,
      message: `Stream method switched to ${method}`,
      method
    });
  } catch (error) {
    console.error('❌ Error switching stream method:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch stream method'
    });
  }
});

/**
 * POST /api/stream/rtmp/config
 * Update RTMP configuration (Admin only)
 */
router.post('/rtmp/config', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const { serverUrl, streamKey, playerUrl } = req.body;

    if (!serverUrl && !streamKey && !playerUrl) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (serverUrl, streamKey, or playerUrl) is required'
      });
    }

    const success = await streamStorage.updateRTMPConfig({
      serverUrl,
      streamKey,
      playerUrl
    });

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update RTMP configuration'
      });
    }

    res.json({
      success: true,
      message: 'RTMP configuration updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating RTMP config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update RTMP configuration'
    });
  }
});

/**
 * POST /api/stream/webrtc/config
 * Update WebRTC configuration (Admin only)
 */
router.post('/webrtc/config', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const { quality, resolution, fps, bitrate, audioEnabled, screenSource, roomId } = req.body;

    // Validation
    if (quality && !['low', 'medium', 'high', 'ultra'].includes(quality)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid quality. Must be: low, medium, high, or ultra'
      });
    }

    if (resolution && !['480p', '720p', '1080p'].includes(resolution)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid resolution. Must be: 480p, 720p, or 1080p'
      });
    }

    if (fps && ![15, 24, 30, 60].includes(fps)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid FPS. Must be: 15, 24, 30, or 60'
      });
    }

    if (bitrate && (bitrate < 500 || bitrate > 10000)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bitrate. Must be between 500 and 10000 kbps'
      });
    }

    if (screenSource && !['screen', 'window', 'tab'].includes(screenSource)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid screen source. Must be: screen, window, or tab'
      });
    }

    const success = await streamStorage.updateWebRTCConfig({
      quality,
      resolution,
      fps,
      bitrate,
      audioEnabled,
      screenSource,
      roomId
    });

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update WebRTC configuration'
      });
    }

    res.json({
      success: true,
      message: 'WebRTC configuration updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating WebRTC config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update WebRTC configuration'
    });
  }
});

/**
 * POST /api/stream/status
 * Update stream status (Admin only)
 */
router.post('/status', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const { method, status } = req.body;

    if (!['rtmp', 'webrtc'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stream method'
      });
    }

    if (!['online', 'offline', 'connecting', 'error'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stream status'
      });
    }

    const success = await streamStorage.updateStreamStatus(method, status);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update stream status'
      });
    }

    res.json({
      success: true,
      message: 'Stream status updated successfully',
      method,
      status
    });
  } catch (error) {
    console.error('❌ Error updating stream status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stream status'
    });
  }
});

/**
 * POST /api/stream/title
 * Update stream title (Admin only)
 */
router.post('/title', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Stream title is required'
      });
    }

    const success = await streamStorage.updateStreamTitle(title.trim());

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update stream title'
      });
    }

    res.json({
      success: true,
      message: 'Stream title updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating stream title:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update stream title'
    });
  }
});

/**
 * POST /api/stream/show
 * Toggle stream visibility (Admin only)
 */
router.post('/show', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const { show } = req.body;

    if (typeof show !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid show value. Must be a boolean'
      });
    }

    const success = await streamStorage.updateShowStream(show);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update show stream'
      });
    }

    res.json({
      success: true,
      message: `Stream visibility updated to ${show}`
    });
  } catch (error) {
    console.error('❌ Error updating show stream:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update show stream'
    });
  }
});

/**
 * POST /api/stream/session/start
 * Start stream session tracking (Admin only)
 */
router.post('/session/start', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const { method } = req.body;

    if (!['rtmp', 'webrtc'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stream method'
      });
    }

    const sessionId = await streamStorage.startStreamSession(method, req.user!.id);

    if (!sessionId) {
      return res.status(500).json({
        success: false,
        error: 'Failed to start stream session'
      });
    }

    res.json({
      success: true,
      message: 'Stream session started',
      sessionId
    });
  } catch (error) {
    console.error('❌ Error starting stream session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start stream session'
    });
  }
});

/**
 * POST /api/stream/session/end
 * End stream session (Admin only)
 */
router.post('/session/end', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    const success = await streamStorage.endStreamSession(sessionId);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to end stream session'
      });
    }

    res.json({
      success: true,
      message: 'Stream session ended'
    });
  } catch (error) {
    console.error('❌ Error ending stream session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end stream session'
    });
  }
});

/**
 * POST /api/stream/viewers
 * Update viewer count (Admin only)
 */
router.post('/viewers', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const { count } = req.body;

    if (typeof count !== 'number' || count < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid viewer count. Must be a non-negative number'
      });
    }

    const success = await streamStorage.updateViewerCount(count);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update viewer count'
      });
    }

    res.json({
      success: true,
      message: 'Viewer count updated',
      count
    });
  } catch (error) {
    console.error('❌ Error updating viewer count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update viewer count'
    });
  }
});

/**
 * GET /api/stream/sessions
 * Get recent stream sessions (Admin only)
 */
router.get('/sessions', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const sessions = await streamStorage.getRecentSessions(limit);

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('❌ Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stream sessions'
    });
  }
});

/**
 * POST /api/stream/webrtc/offer
 * Handle WebRTC offer from admin (Screen sharing)
 */
router.post('/webrtc/offer', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const { offer, roomId } = req.body;

    if (!offer) {
      return res.status(400).json({
        success: false,
        error: 'WebRTC offer is required'
      });
    }

    // Update stream status to indicate screen sharing is active
    await streamStorage.updateStreamStatus('webrtc', 'online');

    res.json({
      success: true,
      message: 'WebRTC offer received',
      data: { offer, roomId }
    });
  } catch (error) {
    console.error('❌ Error handling WebRTC offer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to handle WebRTC offer'
    });
  }
});

/**
 * POST /api/stream/webrtc/answer
 * Handle WebRTC answer from viewer (Screen sharing)
 */
router.post('/webrtc/answer', requireAuth, async (req, res) => {
  try {
    const { answer, roomId } = req.body;

    if (!answer) {
      return res.status(400).json({
        success: false,
        error: 'WebRTC answer is required'
      });
    }

    res.json({
      success: true,
      message: 'WebRTC answer received',
      data: { answer, roomId }
    });
  } catch (error) {
    console.error('❌ Error handling WebRTC answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to handle WebRTC answer'
    });
  }
});

/**
 * POST /api/stream/webrtc/ice-candidate
 * Handle WebRTC ICE candidate for connection establishment
 */
router.post('/webrtc/ice-candidate', requireAuth, async (req, res) => {
  try {
    const { candidate, roomId } = req.body;

    if (!candidate) {
      return res.status(400).json({
        success: false,
        error: 'ICE candidate is required'
      });
    }

    res.json({
      success: true,
      message: 'ICE candidate received',
      data: { candidate, roomId }
    });
  } catch (error) {
    console.error('❌ Error handling ICE candidate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to handle ICE candidate'
    });
  }
});

/**
 * ========================================
 * NEW SIMPLE STREAM CONFIGURATION ENDPOINTS
 * ========================================
 */

/**
 * GET /api/stream/simple-config
 * Get simple stream configuration (iframe/video URL)
 * Public endpoint - accessible to all users
 */
router.get('/simple-config', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseServer
      .from('simple_stream_config')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('❌ Error fetching simple stream config:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch stream configuration'
      });
    }

    // Return default config if none exists
    if (!data) {
      return res.json({
        success: true,
        data: {
          streamUrl: '',
          streamType: 'iframe',
          isActive: false,
          streamTitle: 'Live Game Stream',
          autoplay: true,
          muted: true,
          controls: false
        }
      });
    }

    // Map snake_case to camelCase
    const config = {
      streamUrl: data.stream_url || '',
      streamType: data.stream_type || 'iframe',
      isActive: data.is_active || false,
      isPaused: data.is_paused || false,
      streamTitle: data.stream_title || 'Live Game Stream',
      autoplay: data.autoplay !== false,
      muted: data.muted !== false,
      controls: data.controls || false
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('❌ Error in simple-config GET:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stream configuration'
    });
  }
});

/**
 * Helper function to convert YouTube watch URLs to embed URLs
 */
function convertYouTubeUrl(url: string): string {
  try {
    // Check if it's a YouTube watch URL
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    // Check if it's a youtu.be short URL
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    // Return original URL if not YouTube or already in embed format
    return url;
  } catch (error) {
    console.error('Error converting YouTube URL:', error);
    return url;
  }
}

/**
 * POST /api/stream/simple-config
 * Save simple stream configuration (Admin only)
 */
router.post('/simple-config', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    let { streamUrl, streamType, isActive, isPaused, streamTitle, autoplay, muted, controls } = req.body;

    // Validate required fields
    if (!streamUrl || !streamType) {
      return res.status(400).json({
        success: false,
        error: 'streamUrl and streamType are required'
      });
    }

    // ✅ Auto-convert YouTube watch URLs to embed URLs
    streamUrl = convertYouTubeUrl(streamUrl);
    console.log('🔄 Stream URL after conversion:', streamUrl);

    // Validate streamType
    if (!['iframe', 'video', 'custom'].includes(streamType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid streamType. Must be: iframe, video, or custom'
      });
    }

    // Check if config exists
    const { data: existing } = await supabaseServer
      .from('simple_stream_config')
      .select('id')
      .limit(1)
      .single();

    const configData = {
      stream_url: streamUrl,
      stream_type: streamType,
      is_active: isActive !== false,
      is_paused: isPaused || false,
      stream_title: streamTitle || 'Live Game Stream',
      autoplay: autoplay !== false,
      muted: muted !== false,
      controls: controls || false,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existing) {
      // Update existing config
      const { data, error } = await supabaseServer
        .from('simple_stream_config')
        .update(configData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating simple stream config:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to update stream configuration'
        });
      }
      result = data;
    } else {
      // Insert new config
      const { data, error } = await supabaseServer
        .from('simple_stream_config')
        .insert({
          ...configData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error inserting simple stream config:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to save stream configuration'
        });
      }
      result = data;
    }

    console.log('✅ Simple stream config saved:', {
      streamType,
      isActive,
      url: streamUrl.substring(0, 50) + '...'
    });

    res.json({
      success: true,
      message: 'Stream configuration saved successfully',
      data: result
    });
  } catch (error) {
    console.error('❌ Error in simple-config POST:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save stream configuration'
    });
  }
});

/**
 * POST /api/stream/toggle-pause
 * Toggle stream pause/play state (Admin only)
 * Broadcasts state to all connected players via WebSocket
 */
router.post('/toggle-pause', requireAuth, validateAdminAccess, async (req, res) => {
  try {
    const { isPaused } = req.body;

    if (typeof isPaused !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isPaused must be a boolean value'
      });
    }

    // Update pause state in database
    const { data: existing } = await supabaseServer
      .from('simple_stream_config')
      .select('id')
      .limit(1)
      .single();

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Stream configuration not found'
      });
    }

    const { error } = await supabaseServer
      .from('simple_stream_config')
      .update({
        is_paused: isPaused,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    if (error) {
      console.error('❌ Error updating pause state:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update pause state'
      });
    }

    // Broadcast pause/play state to all connected WebSocket clients
    const wss = (req.app as any).get('wss');
    if (wss) {
      const message = JSON.stringify({
        type: 'stream_pause_state',
        data: {
          isPaused,
          timestamp: Date.now()
        }
      });

      wss.clients.forEach((client: any) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      });

      console.log(`📢 Broadcasted stream ${isPaused ? 'PAUSE' : 'PLAY'} to ${wss.clients.size} clients`);
    }

    res.json({
      success: true,
      message: `Stream ${isPaused ? 'paused' : 'playing'}`,
      data: { isPaused }
    });
  } catch (error) {
    console.error('❌ Error toggling pause state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle pause state'
    });
  }
});

export default router;

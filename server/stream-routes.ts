/**
 * Stream API Routes
 * 
 * RESTful API endpoints for managing dual streaming (RTMP and WebRTC)
 * Handles configuration, status updates, and session management
 */

import express, { Router } from 'express';
import { streamStorage } from './stream-storage';
import { requireAuth } from './auth';

const router: Router = express.Router();

/**
 * Middleware to check admin access
 */
const validateAdminAccess = (req: any, res: any, next: any) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

/**
 * GET /api/stream/config
 * Get current stream configuration
 * Public (authenticated users can view, but sensitive data hidden for non-admins)
 */
router.get('/config', async (req, res) => {
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

export default router;

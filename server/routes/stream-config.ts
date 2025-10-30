import { Router } from 'express';
import { supabaseServer } from '../lib/supabaseServer';
import jwt from 'jsonwebtoken';

const router = Router();

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

// GET /api/stream/config - Returns current stream configuration
router.get('/config', optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseServer
      .from('stream_config')
      .select('*')
      .single();

    if (error) {
      console.error('Error fetching stream config:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch stream configuration' 
      });
    }

    // Hide sensitive data from non-admin users
    if (!req.user || req.user.role !== 'admin') {
      // For non-admin users, only return public information
      res.json({
        success: true,
        data: {
          activeMethod: data.active_method,
          streamStatus: data.stream_status,
          rtmpEnabled: data.rtmp_enabled,
          webrtcEnabled: data.webrtc_enabled,
          showStream: data.show_stream,
          streamTitle: data.stream_title,
          viewerCount: data.viewer_count,
          // Don't expose sensitive information like stream keys
          streamWidth: data.stream_width,
          streamHeight: data.stream_height,
          // RTMP specific - only expose public player URL
          rtmpServerUrl: data.rtmp_enabled ? data.rtmp_server_url : undefined,
          // Don't expose stream key to players
          // WebRTC specific
          webrtcResolution: data.webrtc_resolution,
          webrtcFps: data.webrtc_fps,
          webrtcBitrate: data.webrtc_bitrate
        }
      });
    } else {
      // Admin gets full config
      res.json({
        success: true,
        data: {
          activeMethod: data.active_method,
          streamStatus: data.stream_status,
          rtmpEnabled: data.rtmp_enabled,
          webrtcEnabled: data.webrtc_enabled,
          streamWidth: data.stream_width,
          streamHeight: data.stream_height,
          showStream: data.show_stream,
          streamTitle: data.stream_title,
          viewerCount: data.viewer_count,
          // RTMP specific
          rtmpServerUrl: data.rtmp_server_url,
          rtmpStreamKey: data.rtmp_stream_key, // Only for admin
          // WebRTC specific
          webrtcResolution: data.webrtc_resolution,
          webrtcFps: data.webrtc_fps,
          webrtcBitrate: data.webrtc_bitrate
        }
      });
    }
  } catch (error) {
    console.error('Error in get stream config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /api/stream/config - Updates stream configuration
router.post('/config', optionalAuth, async (req, res) => {
  // Check if user is authenticated and has admin role
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  const {
    method,
    width,
    height,
    showStream,
    streamTitle,
    // RTMP settings
    rtmpServerUrl,
    rtmpStreamKey,
    // WebRTC settings
    webrtcResolution,
    webrtcFps,
    webrtcBitrate
  } = req.body;

  try {
    const { data, error } = await supabaseServer
      .from('stream_config')
      .update({
        active_method: method,
        stream_width: width,
        stream_height: height,
        show_stream: showStream,
        stream_title: streamTitle,
        rtmp_server_url: rtmpServerUrl,
        rtmp_stream_key: rtmpStreamKey,
        webrtc_resolution: webrtcResolution,
        webrtc_fps: webrtcFps,
        webrtc_bitrate: webrtcBitrate,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'default') // Using default config record
      .select()
      .single();

    if (error) {
      console.error('Error updating stream config:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update stream configuration' 
      });
    }

    res.json({
      success: true,
      message: 'Stream configuration updated successfully'
    });
  } catch (error) {
    console.error('Error in update stream config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /api/stream/status - Updates stream status
router.post('/status', optionalAuth, async (req, res) => {
  // Check if user is authenticated and has admin role
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }

  const { status } = req.body;

  if (!['online', 'offline', 'connecting', 'error'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status value'
    });
  }

  try {
    const { data, error } = await supabaseServer
      .from('stream_config')
      .update({
        stream_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'default')
      .select()
      .single();

    if (error) {
      console.error('Error updating stream status:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update stream status' 
      });
    }

    res.json({
      success: true,
      message: 'Stream status updated successfully'
    });
  } catch (error) {
    console.error('Error in update stream status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

export default router;
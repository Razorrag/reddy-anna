import { Router } from 'express';
import { supabase } from '../lib/supabaseServer';
import { authenticateAdmin } from '../auth';

const router = Router();

// GET /api/stream/config - Returns current stream configuration
router.get('/config', authenticateAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
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
        rtmpStreamKey: data.rtmp_stream_key,
        // WebRTC specific
        webrtcResolution: data.webrtc_resolution,
        webrtcFps: data.webrtc_fps,
        webrtcBitrate: data.webrtc_bitrate
      }
    });
  } catch (error) {
    console.error('Error in get stream config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// POST /api/stream/config - Updates stream configuration
router.post('/config', authenticateAdmin, async (req, res) => {
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
    const { data, error } = await supabase
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
router.post('/status', authenticateAdmin, async (req, res) => {
  const { status } = req.body;

  if (!['online', 'offline', 'connecting', 'error'].includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status value'
    });
  }

  try {
    const { data, error } = await supabase
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
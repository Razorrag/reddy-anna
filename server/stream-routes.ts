/**
 * Stream API Routes - HLS Only
 * 
 * Simple stream configuration for HLS video embeds
 * Supports iframe/video tag streaming with pause/play controls
 */

import express, { Router } from 'express';
import { requireAuth } from './auth';
import { validateAdminAccess } from './security';
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
      console.log('Invalid token provided, proceeding without user context');
    }
  }
  next();
};

/**
 * GET /api/stream/simple-config
 * Get simple stream configuration (HLS URL)
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
      controls: data.controls || false,
      minViewers: data.min_viewers ?? null,
      maxViewers: data.max_viewers ?? null
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
    let { streamUrl, streamType, isActive, isPaused, streamTitle, autoplay, muted, controls, minViewers, maxViewers } = req.body;

    if (!streamUrl || !streamType) {
      return res.status(400).json({
        success: false,
        error: 'streamUrl and streamType are required'
      });
    }

    // Optional: Auto-swap if min > max
    if (minViewers != null && maxViewers != null && minViewers > maxViewers) {
      [minViewers, maxViewers] = [maxViewers, minViewers];
      console.log('⚠️ Swapped min/max viewers:', { minViewers, maxViewers });
    }

    // Auto-convert YouTube watch URLs to embed URLs
    streamUrl = convertYouTubeUrl(streamUrl);

    if (!['iframe', 'video', 'custom'].includes(streamType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid streamType. Must be: iframe, video, or custom'
      });
    }

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
      min_viewers: typeof minViewers === 'number' ? minViewers : null,
      max_viewers: typeof maxViewers === 'number' ? maxViewers : null,
      updated_at: new Date().toISOString()
    };

    let result;
    if (existing) {
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

    console.log('✅ Stream config saved:', {
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
      const pauseMessage = JSON.stringify({
        type: 'stream_pause_state',
        data: {
          isPaused,
          timestamp: Date.now()
        }
      });

      const statusMessage = JSON.stringify({
        type: 'stream_status_updated',
        data: {
          isPaused,
          timestamp: Date.now()
        }
      });

      wss.clients.forEach((client: any) => {
        if (client.readyState === 1) {
          client.send(pauseMessage);
          client.send(statusMessage);
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

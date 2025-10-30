/**
 * Stream Storage Service
 * 
 * Handles all database operations for dual streaming (RTMP and WebRTC)
 * Provides clean interface for stream configuration management
 */

import { supabaseServer } from './lib/supabaseServer';

export interface StreamConfig {
  id: string;
  activeMethod: 'rtmp' | 'webrtc';
  streamStatus: 'online' | 'offline' | 'connecting' | 'error';
  streamTitle: string;
  showStream: boolean;
  
  // RTMP
  rtmpServerUrl: string;
  rtmpStreamKey: string;
  rtmpPlayerUrl: string;
  rtmpStatus: string;
  rtmpLastCheck: string | null;
  
  // WebRTC
  webrtcEnabled: boolean;
  webrtcStatus: string;
  webrtcQuality: 'low' | 'medium' | 'high' | 'ultra';
  webrtcResolution: '480p' | '720p' | '1080p';
  webrtcFps: number;
  webrtcBitrate: number;
  webrtcAudioEnabled: boolean;
  webrtcScreenSource: 'screen' | 'window' | 'tab';
  webrtcRoomId: string;
  webrtcLastCheck: string | null;
  
  viewerCount: number;
  totalViews: number;
  streamDurationSeconds: number;
}

export interface StreamSession {
  id: string;
  streamMethod: 'rtmp' | 'webrtc';
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  peakViewers: number;
  totalViewers: number;
  adminId: string;
  status: 'active' | 'ended' | 'error';
  errorMessage?: string;
}

export class StreamStorage {
  /**
   * Get current stream configuration
   */
  async getStreamConfig(): Promise<StreamConfig | null> {
    try {
      const { data, error } = await supabaseServer
        .from('stream_config')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('❌ Error fetching stream config:', error);
        return null;
      }

      if (!data) {
        console.warn('⚠️ No stream config found');
        return null;
      }

      return this.mapToStreamConfig(data);
    } catch (error) {
      console.error('❌ Exception in getStreamConfig:', error);
      return null;
    }
  }

  /**
   * Update stream method (switch between RTMP and WebRTC)
   */
  async updateStreamMethod(method: 'rtmp' | 'webrtc'): Promise<boolean> {
    try {
      const configId = await this.getConfigId();
      if (!configId) {
        console.error('❌ No config ID found');
        return false;
      }

      const { error } = await supabaseServer
        .from('stream_config')
        .update({
          active_method: method,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId);

      if (error) {
        console.error('❌ Error updating stream method:', error);
        return false;
      }

      console.log(`✅ Stream method updated to: ${method}`);
      return true;
    } catch (error) {
      console.error('❌ Exception in updateStreamMethod:', error);
      return false;
    }
  }

  /**
   * Update RTMP configuration
   */
  async updateRTMPConfig(config: {
    serverUrl?: string;
    streamKey?: string;
    playerUrl?: string;
  }): Promise<boolean> {
    try {
      const configId = await this.getConfigId();
      if (!configId) return false;

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (config.serverUrl) updateData.rtmp_server_url = config.serverUrl;
      if (config.streamKey) updateData.rtmp_stream_key = config.streamKey;
      if (config.playerUrl) updateData.rtmp_player_url = config.playerUrl;

      const { error } = await supabaseServer
        .from('stream_config')
        .update(updateData)
        .eq('id', configId);

      if (error) {
        console.error('❌ Error updating RTMP config:', error);
        return false;
      }

      console.log('✅ RTMP config updated');
      return true;
    } catch (error) {
      console.error('❌ Exception in updateRTMPConfig:', error);
      return false;
    }
  }

  /**
   * Update WebRTC configuration
   */
  async updateWebRTCConfig(config: {
    quality?: 'low' | 'medium' | 'high' | 'ultra';
    resolution?: '480p' | '720p' | '1080p';
    fps?: number;
    bitrate?: number;
    audioEnabled?: boolean;
    screenSource?: 'screen' | 'window' | 'tab';
    roomId?: string;
  }): Promise<boolean> {
    try {
      const configId = await this.getConfigId();
      if (!configId) return false;

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (config.quality) updateData.webrtc_quality = config.quality;
      if (config.resolution) updateData.webrtc_resolution = config.resolution;
      if (config.fps !== undefined) updateData.webrtc_fps = config.fps;
      if (config.bitrate !== undefined) updateData.webrtc_bitrate = config.bitrate;
      if (config.audioEnabled !== undefined) updateData.webrtc_audio_enabled = config.audioEnabled;
      if (config.screenSource) updateData.webrtc_screen_source = config.screenSource;
      if (config.roomId) updateData.webrtc_room_id = config.roomId;

      const { error } = await supabaseServer
        .from('stream_config')
        .update(updateData)
        .eq('id', configId);

      if (error) {
        console.error('❌ Error updating WebRTC config:', error);
        return false;
      }

      console.log('✅ WebRTC config updated');
      return true;
    } catch (error) {
      console.error('❌ Exception in updateWebRTCConfig:', error);
      return false;
    }
  }

  /**
   * Update stream status
   */
  async updateStreamStatus(
    method: 'rtmp' | 'webrtc',
    status: 'online' | 'offline' | 'connecting' | 'error'
  ): Promise<boolean> {
    try {
      const configId = await this.getConfigId();
      if (!configId) return false;

      const updateData: any = {
        stream_status: status,
        updated_at: new Date().toISOString()
      };

      if (method === 'rtmp') {
        updateData.rtmp_status = status;
        updateData.rtmp_last_check = new Date().toISOString();
      } else {
        updateData.webrtc_status = status;
        updateData.webrtc_last_check = new Date().toISOString();
      }

      const { error } = await supabaseServer
        .from('stream_config')
        .update(updateData)
        .eq('id', configId);

      if (error) {
        console.error('❌ Error updating stream status:', error);
        return false;
      }

      console.log(`✅ Stream status updated: ${method} -> ${status}`);
      return true;
    } catch (error) {
      console.error('❌ Exception in updateStreamStatus:', error);
      return false;
    }
  }

  /**
   * Update stream title
   */
  async updateStreamTitle(title: string): Promise<boolean> {
    try {
      const configId = await this.getConfigId();
      if (!configId) return false;

      const { error } = await supabaseServer
        .from('stream_config')
        .update({
          stream_title: title,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId);

      if (error) {
        console.error('❌ Error updating stream title:', error);
        return false;
      }

      console.log('✅ Stream title updated');
      return true;
    } catch (error) {
      console.error('❌ Exception in updateStreamTitle:', error);
      return false;
    }
  }

  /**
   * Start stream session tracking
   */
  async startStreamSession(
    method: 'rtmp' | 'webrtc',
    adminId: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabaseServer
        .from('stream_sessions')
        .insert({
          stream_method: method,
          admin_id: adminId,
          status: 'active',
          start_time: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error starting stream session:', error);
        return null;
      }

      console.log(`✅ Stream session started: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('❌ Exception in startStreamSession:', error);
      return null;
    }
  }

  /**
   * End stream session
   */
  async endStreamSession(sessionId: string): Promise<boolean> {
    try {
      const endTime = new Date();
      
      // Get session start time to calculate duration
      const { data: session } = await supabaseServer
        .from('stream_sessions')
        .select('start_time')
        .eq('id', sessionId)
        .single();

      let durationSeconds = 0;
      if (session && session.start_time) {
        const startTime = new Date(session.start_time);
        durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      }

      const { error } = await supabaseServer
        .from('stream_sessions')
        .update({
          end_time: endTime.toISOString(),
          duration_seconds: durationSeconds,
          status: 'ended'
        })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ Error ending stream session:', error);
        return false;
      }

      console.log(`✅ Stream session ended: ${sessionId} (${durationSeconds}s)`);
      return true;
    } catch (error) {
      console.error('❌ Exception in endStreamSession:', error);
      return false;
    }
  }

  /**
   * Update session error
   */
  async updateSessionError(sessionId: string, errorMessage: string): Promise<boolean> {
    try {
      const { error } = await supabaseServer
        .from('stream_sessions')
        .update({
          status: 'error',
          error_message: errorMessage
        })
        .eq('id', sessionId);

      return !error;
    } catch (error) {
      console.error('❌ Exception in updateSessionError:', error);
      return false;
    }
  }

  /**
   * Update viewer count
   */
  async updateViewerCount(count: number): Promise<boolean> {
    try {
      const configId = await this.getConfigId();
      if (!configId) return false;

      // Also increment total views
      const { data: current } = await supabaseServer
        .from('stream_config')
        .select('viewer_count, total_views')
        .eq('id', configId)
        .single();

      const currentCount = current?.viewer_count || 0;
      const totalViews = current?.total_views || 0;

      // If count increased, add to total views
      const newTotalViews = count > currentCount ? totalViews + (count - currentCount) : totalViews;

      const { error } = await supabaseServer
        .from('stream_config')
        .update({
          viewer_count: count,
          total_views: newTotalViews,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId);

      if (error) {
        console.error('❌ Error updating viewer count:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Exception in updateViewerCount:', error);
      return false;
    }
  }

  /**
   * Get recent stream sessions
   */
  async getRecentSessions(limit: number = 10): Promise<StreamSession[]> {
    try {
      const { data, error } = await supabaseServer
        .from('stream_sessions')
        .select('*')
        .order('start_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching recent sessions:', error);
        return [];
      }

      return (data || []).map(this.mapToStreamSession);
    } catch (error) {
      console.error('❌ Exception in getRecentSessions:', error);
      return [];
    }
  }

  // Helper methods
  private async getConfigId(): Promise<string | null> {
    try {
      const { data } = await supabaseServer
        .from('stream_config')
        .select('id')
        .limit(1)
        .single();
      
      return data?.id || null;
    } catch (error) {
      console.error('❌ Error getting config ID:', error);
      return null;
    }
  }

  private mapToStreamConfig(data: any): StreamConfig {
    return {
      id: data.id,
      activeMethod: data.active_method,
      streamStatus: data.stream_status,
      streamTitle: data.stream_title,
      showStream: data.show_stream !== undefined ? data.show_stream : true, // Default to true if not set
      rtmpServerUrl: data.rtmp_server_url,
      rtmpStreamKey: data.rtmp_stream_key,
      rtmpPlayerUrl: data.rtmp_player_url,
      rtmpStatus: data.rtmp_status,
      rtmpLastCheck: data.rtmp_last_check,
      webrtcEnabled: data.webrtc_enabled,
      webrtcStatus: data.webrtc_status,
      webrtcQuality: data.webrtc_quality,
      webrtcResolution: data.webrtc_resolution,
      webrtcFps: data.webrtc_fps,
      webrtcBitrate: data.webrtc_bitrate,
      webrtcAudioEnabled: data.webrtc_audio_enabled,
      webrtcScreenSource: data.webrtc_screen_source,
      webrtcRoomId: data.webrtc_room_id,
      webrtcLastCheck: data.webrtc_last_check,
      viewerCount: data.viewer_count || 0,
      totalViews: data.total_views || 0,
      streamDurationSeconds: data.stream_duration_seconds || 0
    };
  }

  async updateShowStream(showStream: boolean): Promise<boolean> {
    try {
      const configId = await this.getConfigId();
      if (!configId) return false;

      const { error } = await supabaseServer
        .from('stream_config')
        .update({ show_stream: showStream })
        .eq('id', configId);

      if (error) {
        console.error('❌ Error updating show stream:', error);
        return false;
      }

      console.log(`✅ Show stream updated to: ${showStream}`);
      return true;
    } catch (error) {
      console.error('❌ Exception in updateShowStream:', error);
      return false;
    }
  }

  private mapToStreamSession(data: any): StreamSession {
    return {
      id: data.id,
      streamMethod: data.stream_method,
      startTime: data.start_time,
      endTime: data.end_time,
      durationSeconds: data.duration_seconds,
      peakViewers: data.peak_viewers || 0,
      totalViewers: data.total_viewers || 0,
      adminId: data.admin_id,
      status: data.status,
      errorMessage: data.error_message
    };
  }
}

// Export singleton instance
export const streamStorage = new StreamStorage();

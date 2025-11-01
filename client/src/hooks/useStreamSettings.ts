/**
 * useStreamSettings - Unified hook for loading/saving stream settings
 * 
 * Ensures settings are synced between admin dashboard and admin game control
 * All settings are loaded from and saved to the database
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { useNotification } from '@/contexts/NotificationContext';

export interface StreamSettings {
  resolution: '480p' | '720p' | '1080p';
  fps: 15 | 24 | 30 | 60;
  bitrate: number; // 500-10000
  audioEnabled: boolean;
  screenSource: 'screen' | 'window' | 'tab';
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

const DEFAULT_SETTINGS: StreamSettings = {
  resolution: '720p',
  fps: 30,
  bitrate: 2500,
  audioEnabled: false,
  screenSource: 'screen',
  quality: 'high'
};

export function useStreamSettings() {
  const [settings, setSettings] = useState<StreamSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showNotification } = useNotification();

  // Load settings from database
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/stream/config');
      
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setSettings({
          resolution: data.webrtcResolution || DEFAULT_SETTINGS.resolution,
          fps: data.webrtcFps || DEFAULT_SETTINGS.fps,
          bitrate: data.webrtcBitrate || DEFAULT_SETTINGS.bitrate,
          audioEnabled: data.webrtcAudioEnabled ?? DEFAULT_SETTINGS.audioEnabled,
          screenSource: data.webrtcScreenSource || DEFAULT_SETTINGS.screenSource,
          quality: data.webrtcQuality || DEFAULT_SETTINGS.quality
        });
      }
    } catch (error) {
      console.error('Failed to load stream settings:', error);
      // Use defaults on error
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save settings to database
  const saveSettings = useCallback(async (newSettings: Partial<StreamSettings>) => {
    try {
      setSaving(true);
      const updatedSettings = { ...settings, ...newSettings };
      
      const response = await apiClient.post('/api/stream/webrtc/config', {
        resolution: updatedSettings.resolution,
        fps: updatedSettings.fps,
        bitrate: updatedSettings.bitrate,
        audioEnabled: updatedSettings.audioEnabled,
        screenSource: updatedSettings.screenSource,
        quality: updatedSettings.quality
      });

      if (response.data?.success) {
        setSettings(updatedSettings);
        showNotification('✅ Stream settings saved successfully', 'success');
        return true;
      } else {
        throw new Error(response.data?.error || 'Failed to save settings');
      }
    } catch (error: any) {
      console.error('Failed to save stream settings:', error);
      showNotification(
        `❌ Failed to save settings: ${error.message || 'Unknown error'}`,
        'error'
      );
      return false;
    } finally {
      setSaving(false);
    }
  }, [settings, showNotification]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    saving,
    loadSettings,
    saveSettings,
    updateSettings: setSettings
  };
}







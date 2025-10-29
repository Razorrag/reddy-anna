// Streaming Routes Module
import type { Express, Request, Response } from "express";
import {
  generalLimiter,
  apiLimiter,
  securityMiddleware,
  validateAdminAccess,
  auditLogger
} from '../security';
import { requireAuth } from '../auth';
import { storage } from '../storage-supabase';

export async function registerStreamRoutes(app: Express): Promise<void> {
  // Apply security middleware to stream routes
  app.use("/api/stream/*", securityMiddleware);

  // Get stream settings
  app.get("/api/stream/settings", apiLimiter, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getStreamSettings();
      
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error("Get stream settings error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get stream settings"
      });
    }
  });

  // Update stream setting (Admin only)
  app.patch("/api/stream/settings/:key", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      
      if (!value) {
        return res.status(400).json({
          success: false,
          error: 'Stream setting value is required'
        });
      }
      
      await storage.updateStreamSetting(key, value);
      
      auditLogger('stream_setting_updated', req.user!.id, {
        settingKey: key,
        settingValue: value
      });
      
      res.json({
        success: true,
        message: 'Stream setting updated successfully'
      });
    } catch (error) {
      console.error("Update stream setting error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update stream setting"
      });
    }
  });

  // Get stream configuration
  app.get("/api/stream/config", apiLimiter, async (req: Request, res: Response) => {
    try {
      const config = await storage.getStreamConfig();
      
      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error("Get stream config error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get stream config"
      });
    }
  });

  // Get unified streaming status
  app.get("/api/stream/status", apiLimiter, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getStreamSettings();
      const config = await storage.getStreamConfig();
      
      // Determine overall stream status
      let overallStatus = 'offline';
      if (config && config.streamStatus === 'online') {
        overallStatus = 'online';
      }
      
      res.json({
        success: true,
        data: {
          overallStatus,
          settings,
          config,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Get stream status error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get stream status"
      });
    }
  });

  // Admin: Get stream health metrics
  app.get("/api/admin/stream/health", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getStreamSettings();
      const config = await storage.getStreamConfig();
      
      // Calculate basic health metrics
      const healthMetrics = {
        settingsCount: settings.length,
        hasValidConfig: !!config,
        streamStatus: config?.streamStatus || 'unknown',
        lastCheck: config?.createdAt || null,
        viewerCount: config?.viewerCount || 0,
        bitrate: config?.webrtcBitrate || 0,
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: healthMetrics
      });
    } catch (error) {
      console.error("Get stream health error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get stream health metrics"
      });
    }
  });

  // Admin: Update multiple stream settings
  app.patch("/api/admin/stream/settings/batch", apiLimiter, validateAdminAccess, async (req: Request, res: Response) => {
    try {
      const { settings } = req.body;
      
      if (!settings || !Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          error: 'Settings array is required'
        });
      }
      
      // Update each setting
      for (const setting of settings) {
        if (setting.key && setting.value) {
          await storage.updateStreamSetting(setting.key, setting.value);
        }
      }
      
      auditLogger('stream_settings_batch_updated', req.user!.id, {
        settingsCount: settings.length,
        settings: settings.map(s => ({ key: s.key, value: s.value }))
      });
      
      res.json({
        success: true,
        message: `Successfully updated ${settings.length} stream settings`
      });
    } catch (error) {
      console.error("Batch update stream settings error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to batch update stream settings"
      });
    }
  });
}
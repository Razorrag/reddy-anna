import { useState, useEffect } from 'react';
import { Settings, DollarSign, Percent, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api-client";
import AdminLayout from "@/components/AdminLayout";

interface GameSettingsResponse {
  success: boolean;
  content?: {
    minBet?: number;
    maxBet?: number;
    bettingTimerDuration?: number;
    depositBonusPercent?: number;
    referralBonusPercent?: number;
    conditionalBonusThreshold?: number;
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
  };
  error?: string;
}

export default function BackendSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    minBet: 1000,
    maxBet: 100000,
    timerDuration: 30,
    depositBonusPercent: 5,
    referralBonusPercent: 1,
    conditionalBonusThreshold: 30,
    maintenanceMode: false,
    maintenanceMessage: ''
  });

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await apiClient.get<GameSettingsResponse>('/admin/game-settings');
      if (response.success && response.content) {
        setSettings({
          minBet: response.content.minBet || 1000,
          maxBet: response.content.maxBet || 100000,
          timerDuration: response.content.bettingTimerDuration || 30,
          depositBonusPercent: response.content.depositBonusPercent || 5,
          referralBonusPercent: response.content.referralBonusPercent || 1,
          conditionalBonusThreshold: response.content.conditionalBonusThreshold || 30,
          maintenanceMode: response.content.maintenanceMode || false,
          maintenanceMessage: response.content.maintenanceMessage || ''
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await apiClient.put<GameSettingsResponse>('/admin/game-settings', {
        minBet: settings.minBet,
        maxBet: settings.maxBet,
        bettingTimerDuration: settings.timerDuration,
        depositBonusPercent: settings.depositBonusPercent,
        referralBonusPercent: settings.referralBonusPercent,
        conditionalBonusThreshold: settings.conditionalBonusThreshold,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage
      });

      if (response.success) {
        alert('✅ Settings saved successfully!');
      } else {
        alert('❌ Failed to save settings: ' + (response.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      alert('❌ Failed to save settings: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-yellow-600 bg-clip-text text-transparent drop-shadow-lg mb-2">
              ⚙️ Backend Settings
            </h1>
            <p className="text-gray-400">Configure game settings, bet limits, and system parameters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Betting Limits */}
            <Card className="bg-black/40 border-gold/30 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-6 h-6 text-gold" />
                  <CardTitle className="text-gold">Betting Limits</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Configure minimum and maximum bet amounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Minimum Bet (₹)</label>
                  <input
                    type="number"
                    value={settings.minBet}
                    onChange={(e) => setSettings({...settings, minBet: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Maximum Bet (₹)</label>
                  <input
                    type="number"
                    value={settings.maxBet}
                    onChange={(e) => setSettings({...settings, maxBet: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-gold focus:outline-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Game Settings */}
            <Card className="bg-black/40 border-gold/30 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-gold" />
                  <CardTitle className="text-gold">Game Settings</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Configure game timer and round settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Betting Timer Duration (seconds)</label>
                  <input
                    type="number"
                    value={settings.timerDuration}
                    onChange={(e) => setSettings({...settings, timerDuration: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-gold focus:outline-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bonus Settings */}
            <Card className="bg-black/40 border-gold/30 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Percent className="w-6 h-6 text-gold" />
                  <CardTitle className="text-gold">Bonus Settings</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Configure deposit and referral bonus percentages
                </CardDescription>
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                  <p className="text-sm text-blue-200">
                    ℹ️ <strong>Primary Configuration:</strong> This is the canonical source for bonus settings. 
                    Changes sync with Admin Bonus page automatically.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Deposit Bonus (%)</label>
                  <input
                    type="number"
                    value={settings.depositBonusPercent}
                    onChange={(e) => setSettings({...settings, depositBonusPercent: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Referral Bonus (%)</label>
                  <input
                    type="number"
                    value={settings.referralBonusPercent}
                    onChange={(e) => setSettings({...settings, referralBonusPercent: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Conditional Bonus Threshold (%)</label>
                  <input
                    type="number"
                    value={settings.conditionalBonusThreshold}
                    onChange={(e) => setSettings({...settings, conditionalBonusThreshold: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-gold focus:outline-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Mode */}
            <Card className="bg-black/40 border-gold/30 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-gold" />
                  <CardTitle className="text-gold">Maintenance Mode</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Enable/disable maintenance mode for the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
                    className="w-5 h-5"
                  />
                  <label className="text-white">Enable Maintenance Mode</label>
                </div>
                {settings.maintenanceMode && (
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">Maintenance Message</label>
                    <textarea
                      value={settings.maintenanceMessage}
                      onChange={(e) => setSettings({...settings, maintenanceMessage: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-gold focus:outline-none"
                      rows={3}
                      placeholder="Enter maintenance message for users..."
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          <div className="mt-6">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-8 py-3 bg-gradient-to-r from-gold to-yellow-600 hover:from-yellow-600 hover:to-gold disabled:from-gray-600 disabled:to-gray-700 text-black disabled:text-gray-400 rounded-lg font-bold shadow-lg transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? '⏳ Saving...' : loading ? '⏳ Loading...' : '💾 Save Settings'}
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-300 mb-2">ℹ️ Note:</h4>
            <p className="text-xs text-blue-200">
              These settings affect the entire platform. Changes will be applied immediately after saving.
              For streaming configuration, please use the dedicated <strong>Stream Settings</strong> page.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

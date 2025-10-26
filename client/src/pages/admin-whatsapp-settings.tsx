import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { MessageSquare, Save, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import apiClient from '../lib/apiClient';

export default function AdminWhatsAppSettings() {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [customerSupportEmail, setCustomerSupportEmail] = useState('');
  const [customerSupportPhone, setCustomerSupportPhone] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<any>('/admin/settings');
      
      if (response.success && response.content) {
        setWhatsappNumber(response.content.adminWhatsappNumber || '918686886632');
        setCustomerSupportEmail(response.content.customerSupportEmail || '');
        setCustomerSupportPhone(response.content.customerSupportPhone || '');
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      showNotification('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate WhatsApp number format
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      showNotification('Please enter a valid WhatsApp number (10-15 digits)', 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.put<any>('/admin/settings', {
        adminWhatsappNumber: cleanNumber,
        customerSupportEmail,
        customerSupportPhone
      });

      if (response.success) {
        showNotification('✅ WhatsApp settings saved successfully!', 'success');
        setWhatsappNumber(cleanNumber); // Update with cleaned number
      } else {
        showNotification('Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showNotification('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/[^0-9]/g, '');
    return cleaned;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-8 h-8 text-green-400" />
            <h1 className="text-3xl font-bold text-white">WhatsApp Settings</h1>
          </div>
          <p className="text-purple-200">
            Configure the WhatsApp number where user requests (deposits, withdrawals, support) will be sent
          </p>
        </div>

        {/* Main Settings Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
          {/* Info Alert */}
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-100">
              <p className="font-semibold mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Enter the WhatsApp number with country code (e.g., 918686886632 for India)</li>
                <li>Do not include + or spaces</li>
                <li>This number will receive all user requests from the app</li>
                <li>Make sure this WhatsApp number is active and monitored</li>
              </ul>
            </div>
          </div>

          {/* WhatsApp Number Input */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2 flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-400" />
              Admin WhatsApp Number
            </label>
            <div className="relative">
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(formatPhoneNumber(e.target.value))}
                placeholder="918686886632"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                maxLength={15}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {whatsappNumber.length >= 10 && whatsappNumber.length <= 15 ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                )}
              </div>
            </div>
            <p className="text-purple-300 text-sm mt-2">
              Current: {whatsappNumber || 'Not set'} ({whatsappNumber.length} digits)
            </p>
          </div>

          {/* Customer Support Email */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Customer Support Email
            </label>
            <input
              type="email"
              value={customerSupportEmail}
              onChange={(e) => setCustomerSupportEmail(e.target.value)}
              placeholder="support@example.com"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Customer Support Phone */}
          <div className="mb-8">
            <label className="block text-white font-semibold mb-2">
              Customer Support Phone (Display)
            </label>
            <input
              type="tel"
              value={customerSupportPhone}
              onChange={(e) => setCustomerSupportPhone(e.target.value)}
              placeholder="+91 8686886632"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-purple-300 text-sm mt-2">
              This is displayed to users (can include formatting like +91)
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving || whatsappNumber.length < 10}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save WhatsApp Settings'}
          </button>

          {/* Preview */}
          <div className="mt-8 p-4 bg-green-500/10 border border-green-400/30 rounded-lg">
            <p className="text-green-100 text-sm font-semibold mb-2">Preview:</p>
            <p className="text-green-200 text-sm">
              When users click "Contact Support" or request withdrawals/deposits, they will be redirected to:
            </p>
            <p className="text-white font-mono mt-2 bg-black/20 p-2 rounded">
              https://wa.me/{whatsappNumber}
            </p>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-purple-500/10 backdrop-blur-md rounded-2xl p-6 border border-purple-400/30">
          <h3 className="text-white font-bold text-lg mb-3">How it works:</h3>
          <ul className="text-purple-200 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">1.</span>
              <span>Users click "Deposit", "Withdraw", or "Support" buttons in the app</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">2.</span>
              <span>A pre-filled WhatsApp message is generated with their request details</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">3.</span>
              <span>WhatsApp opens automatically with the message ready to send</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">4.</span>
              <span>The message is sent to the WhatsApp number configured here</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">5.</span>
              <span>You can respond directly from WhatsApp</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

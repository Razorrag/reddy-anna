import React from 'react';
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Breadcrumb from "@/components/Breadcrumb";
import { Settings, GamepadIcon, Users, BarChart3 } from "lucide-react";
import SimpleStreamSettings from '../components/AdminGamePanel/SimpleStreamSettings';

export default function BackendSettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900">
      {/* No breadcrumbs - admin access is hidden */}
      
      {/* Navigation Header */}
      <div className="p-4 border-b border-purple-400/30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Backend Settings
          </h1>
          <div className="flex flex-wrap gap-2">
            {/* No navigation options - admin access is isolated */}
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-6">
        <SimpleStreamSettings />
      </div>
    </div>
  );
}

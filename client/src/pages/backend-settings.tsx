import React from 'react';
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import Breadcrumb from "@/components/Breadcrumb";
import { Settings, GamepadIcon, Users, BarChart3 } from "lucide-react";
import SimpleStreamSettings from '../components/AdminGamePanel/SimpleStreamSettings';

export default function BackendSettingsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin', href: '/admin' },
          { label: 'Backend Settings', active: true }
        ]} 
      />
      
      {/* Navigation Header */}
      <div className="p-4 border-b border-gold/30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Backend Settings
          </h1>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin">
              <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href="/admin-game">
              <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
                <GamepadIcon className="w-4 h-4 mr-2" />
                Game Control
              </Button>
            </Link>
            <Link href="/user-admin">
              <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
                <Users className="w-4 h-4 mr-2" />
                User Admin
              </Button>
            </Link>
            <Link href="/">
              <Button variant="secondary" className="border-purple-500 text-purple-300 hover:bg-purple-500 hover:text-white">
                ← Back to Game
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto p-6">
        <SimpleStreamSettings />
      </div>
    </div>
  );
}

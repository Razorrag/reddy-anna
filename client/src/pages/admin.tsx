/**
 * Admin Dashboard - Management Overview
 * 
 * Central hub for all admin management features
 * Separate from game control (/game route)
 */

import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Gift,
  BarChart3,
  History,
  CreditCard,
  Settings,
  GamepadIcon,
  TrendingUp,
  Activity,
  MessageSquare
} from "lucide-react";

export default function Admin() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-yellow-600 bg-clip-text text-transparent drop-shadow-lg mb-2">
              🎰 Admin Dashboard
            </h1>
            <p className="text-gray-400">Central management hub for your gaming platform</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gold">Total Users</CardTitle>
              <Users className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">12,547</div>
              <p className="text-xs text-gray-400 mt-1">Registered players</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gold">Active Games</CardTitle>
              <Activity className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">23</div>
              <p className="text-xs text-gray-400 mt-1">Live right now</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gold">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">₹28.4L</div>
              <p className="text-xs text-gray-400 mt-1">All time earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gold">Today's Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">₹45.6K</div>
              <p className="text-xs text-gray-400 mt-1">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Management Cards */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-gold mb-6">📊 Management Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Game Control */}
          <Card 
            className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/game')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <GamepadIcon className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-white text-center text-xl">Game Control</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                Control live games, deal cards, manage rounds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-gray-400">
                Click to access game control panel
              </div>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card 
            className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/user-admin')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-white text-center text-xl">User Management</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                Manage users, balances, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-gray-400">
                Search, filter, update user accounts
              </div>
            </CardContent>
          </Card>

          {/* Bonus & Referral */}
          <Card 
            className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/admin-bonus')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Gift className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-white text-center text-xl">Bonus & Referral</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                Manage bonuses, referrals, and rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-gray-400">
                Configure bonus settings and track referrals
              </div>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card 
            className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/admin-analytics')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <BarChart3 className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-white text-center text-xl">Analytics</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                View statistics, reports, and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-gray-400">
                Today's win/lose and performance metrics
              </div>
            </CardContent>
          </Card>

          {/* Game History */}
          <Card 
            className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/game-history')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <History className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-white text-center text-xl">Game History</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                View complete game records and logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-gray-400">
                Filter by date, winner, and round
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card 
            className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/admin-payments')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CreditCard className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-white text-center text-xl">Payments D/W</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                Manage deposits and withdrawals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-gray-400">
                Process payment requests and transactions
              </div>
            </CardContent>
          </Card>

          {/* Backend Settings */}
          <Card 
            className="bg-black/40 border-gold/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/backend-settings')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Settings className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-white text-center text-xl">Backend Settings</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                Configure system and game settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-gray-400">
                Advanced configuration options
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Settings */}
          <Card 
            className="bg-black/40 border-green-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/admin-whatsapp-settings')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-center text-xl">WhatsApp Settings</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                Configure WhatsApp contact number
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-gray-400">
                Set where user requests are sent
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

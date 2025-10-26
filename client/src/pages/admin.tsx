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
  Activity
} from "lucide-react";

export default function Admin() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg mb-2">
              🎰 Admin Dashboard
            </h1>
            <p className="text-gray-300">Central management hub for your gaming platform</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-200">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-300" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-100">12,547</div>
              <p className="text-xs text-blue-300 mt-1">Registered players</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-200">Active Games</CardTitle>
              <Activity className="h-4 w-4 text-green-300" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-100">23</div>
              <p className="text-xs text-green-300 mt-1">Live right now</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-200">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-300" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-100">₹28.4L</div>
              <p className="text-xs text-purple-300 mt-1">All time earnings</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 border-yellow-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-200">Today's Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-300" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-100">₹45.6K</div>
              <p className="text-xs text-yellow-300 mt-1">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Management Cards */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-yellow-300 mb-6">📊 Management Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Game Control */}
          <Card 
            className="bg-gradient-to-br from-red-900/50 to-red-800/50 border-red-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/game')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <GamepadIcon className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-center text-xl">Game Control</CardTitle>
              <CardDescription className="text-red-200 text-center">
                Control live games, deal cards, manage rounds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-red-300">
                Click to access game control panel
              </div>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card 
            className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/user-admin')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-center text-xl">User Management</CardTitle>
              <CardDescription className="text-blue-200 text-center">
                Manage users, balances, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-blue-300">
                Search, filter, update user accounts
              </div>
            </CardContent>
          </Card>

          {/* Bonus & Referral */}
          <Card 
            className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/admin-bonus')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-center text-xl">Bonus & Referral</CardTitle>
              <CardDescription className="text-purple-200 text-center">
                Manage bonuses, referrals, and rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-purple-300">
                Configure bonus settings and track referrals
              </div>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card 
            className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/admin-analytics')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-center text-xl">Analytics</CardTitle>
              <CardDescription className="text-green-200 text-center">
                View statistics, reports, and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-green-300">
                Today's win/lose and performance metrics
              </div>
            </CardContent>
          </Card>

          {/* Game History */}
          <Card 
            className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 border-yellow-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/game-history')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <History className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-center text-xl">Game History</CardTitle>
              <CardDescription className="text-yellow-200 text-center">
                View complete game records and logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-yellow-300">
                Filter by date, winner, and round
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          <Card 
            className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/admin-payments')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-center text-xl">Payments D/W</CardTitle>
              <CardDescription className="text-orange-200 text-center">
                Manage deposits and withdrawals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-orange-300">
                Process payment requests and transactions
              </div>
            </CardContent>
          </Card>

          {/* Backend Settings */}
          <Card 
            className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 border-gray-500/30 backdrop-blur-sm hover:scale-105 transition-all duration-200 cursor-pointer"
            onClick={() => setLocation('/backend-settings')}
          >
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-center text-xl">Backend Settings</CardTitle>
              <CardDescription className="text-gray-200 text-center">
                Configure system and game settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-sm text-gray-300">
                Advanced configuration options
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Breadcrumb from "@/components/Breadcrumb";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import {
  Users,
  Settings,
  BarChart3,
  GamepadIcon,
  Activity,
  TrendingUp,
  CreditCard,
  Trophy,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Admin() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeGames: 0,
    totalRevenue: 0,
    todayRevenue: 0
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading stats
    setTimeout(() => {
      setStats({
        totalUsers: 12547,
        activeGames: 23,
        totalRevenue: 2847593.50,
        todayRevenue: 45678.25
      });
      setIsLoaded(true);
    }, 1000);
  }, []);

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-4">
      {/* No breadcrumbs - admin access is hidden */}
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-purple-200">Manage your gaming platform</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* No back navigation - admin access is isolated */}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className={cn(
          "grid grid-cols-1 gap-6 transition-all duration-1000",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
        </div>
      </div>

      {/* Main Actions */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Game Management */}
          <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm hover:bg-purple-950/80 transition-all duration-300">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <GamepadIcon className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-center">Game Management</CardTitle>
              <CardDescription className="text-purple-200 text-center">
                Control live games and manage gameplay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700" disabled>
                <GamepadIcon className="w-4 h-4 mr-2" />
                Game Control Panel
              </Button>
              <Button variant="outline" className="w-full border-purple-400/30 text-purple-200 hover:bg-purple-400/10" disabled>
                View Live Games
              </Button>
            </CardContent>
          </Card>

          {/* User Management */}
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-gold text-center">User Management</CardTitle>
              <CardDescription className="text-white/80 text-center">
                Manage realtime users in the game
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500" disabled>
                <Users className="w-4 h-4 mr-2" />
                User Administration
              </Button>
              <Button variant="outline" className="w-full border-gold/30 text-gold hover:bg-gold/10">
                View Active Users
              </Button>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm hover:bg-purple-950/80 transition-all duration-300">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-center">Today's Win/Lose</CardTitle>
              <CardDescription className="text-purple-200 text-center">
                View today's game analytics and results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/admin-analytics">
                <Button className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700">
                  <Trophy className="w-4 h-4 mr-2" />
                  View Analytics
                </Button>
              </Link>
              <Link href="/game-history">
                <Button variant="outline" className="w-full border-purple-400/30 text-purple-200 hover:bg-purple-400/10">
                  <History className="w-4 h-4 mr-2" />
                  Game History
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Deposits/Withdrawals */}
          <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm hover:bg-purple-950/80 transition-all duration-300">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-white text-center">Today D/W</CardTitle>
              <CardDescription className="text-purple-200 text-center">
                Manage today's deposits and withdrawals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700" disabled>
                <CreditCard className="w-4 h-4 mr-2" />
                View Transactions
              </Button>
              <Button variant="outline" className="w-full border-purple-400/30 text-purple-200 hover:bg-purple-400/10">
                Process Requests
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <div className="max-w-7xl mx-auto mt-8">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}

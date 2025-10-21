import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Breadcrumb from "@/components/Breadcrumb";
import {
  Users,
  Settings,
  BarChart3,
  GamepadIcon,
  Shield,
  Activity,
  DollarSign,
  TrendingUp
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
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-4">
      {/* Breadcrumb */}
      <Breadcrumb 
        items={[
          { label: 'Home', href: '/' },
          { label: 'Admin Dashboard', active: true }
        ]} 
      />
      
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gold mb-2">Admin Dashboard</h1>
            <p className="text-white/80">Manage your gaming platform</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin-game">
              <Button className="bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500">
                <GamepadIcon className="w-5 h-5 mr-2" />
                Game Control
              </Button>
            </Link>
            <Link href="/user-admin">
              <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
                <Users className="w-5 h-5 mr-2" />
                User Admin
              </Button>
            </Link>
            <Link href="/backend-settings">
              <Button variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
                <Settings className="w-5 h-5 mr-2" />
                Backend Settings
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

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-1000",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Total Users</CardTitle>
              <Users className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-white/60">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Active Games</CardTitle>
              <Activity className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold">{stats.activeGames}</div>
              <p className="text-xs text-white/60">
                Currently running
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-white/60">
                All time earnings
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/80">Today's Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gold">{formatCurrency(stats.todayRevenue)}</div>
              <p className="text-xs text-white/60">
                +8% from yesterday
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Actions */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Game Management */}
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <GamepadIcon className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-gold text-center">Game Management</CardTitle>
              <CardDescription className="text-white/80 text-center">
                Control live games and manage gameplay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/admin-game">
                <Button className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500">
                  <GamepadIcon className="w-4 h-4 mr-2" />
                  Game Control Panel
                </Button>
              </Link>
              <Link href="/admin-game">
                <Button variant="outline" className="w-full border-gold/30 text-gold hover:bg-gold/10">
                  View Live Games
                </Button>
              </Link>
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
                Manage users, permissions, and accounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/user-admin">
                <Button className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500">
                  <Users className="w-4 h-4 mr-2" />
                  User Administration
                </Button>
              </Link>
              <Button variant="outline" className="w-full border-gold/30 text-gold hover:bg-gold/10">
                View User Reports
              </Button>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-gold text-center">Analytics</CardTitle>
              <CardDescription className="text-white/80 text-center">
                View platform statistics and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
              <Button variant="outline" className="w-full border-gold/30 text-gold hover:bg-gold/10">
                Generate Reports
              </Button>
            </CardContent>
          </Card>

          {/* System Settings */}
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-gold text-center">System Settings</CardTitle>
              <CardDescription className="text-white/80 text-center">
                Configure platform settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500">
                <Settings className="w-4 h-4 mr-2" />
                System Settings
              </Button>
              <Button variant="outline" className="w-full border-gold/30 text-gold hover:bg-gold/10">
                Security Settings
              </Button>
            </CardContent>
          </Card>

          {/* Security Center */}
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-gold text-center">Security Center</CardTitle>
              <CardDescription className="text-white/80 text-center">
                Monitor security and manage permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500">
                <Shield className="w-4 h-4 mr-2" />
                Security Dashboard
              </Button>
              <Button variant="outline" className="w-full border-gold/30 text-gold hover:bg-gold/10">
                Access Logs
              </Button>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
            <CardHeader>
              <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-black" />
              </div>
              <CardTitle className="text-gold text-center">Quick Actions</CardTitle>
              <CardDescription className="text-white/80 text-center">
                Frequently used administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500">
                <Activity className="w-4 h-4 mr-2" />
                System Health
              </Button>
              <Button variant="outline" className="w-full border-gold/30 text-gold hover:bg-gold/10">
                Maintenance Mode
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="max-w-7xl mx-auto mt-8">
        <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-gold">Recent Activity</CardTitle>
            <CardDescription className="text-white/80">
              Latest system activities and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-white font-medium">New user registration</p>
                    <p className="text-white/60 text-sm">user_12345 joined the platform</p>
                  </div>
                </div>
                <span className="text-white/60 text-sm">2 minutes ago</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-white font-medium">Game completed</p>
                    <p className="text-white/60 text-sm">Andar won with K♥</p>
                  </div>
                </div>
                <span className="text-white/60 text-sm">5 minutes ago</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-gold rounded-full"></div>
                  <div>
                    <p className="text-white font-medium">High value bet placed</p>
                    <p className="text-white/60 text-sm">₹50,000 bet on Bahar</p>
                  </div>
                </div>
                <span className="text-white/60 text-sm">8 minutes ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

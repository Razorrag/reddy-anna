import { Button } from "@/components/ui/button";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import LiveBetMonitoring from "@/components/LiveBetMonitoring";
import { BarChart3 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

export default function AdminAnalytics() {
  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 p-4">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Analytics Dashboard</h1>
              <p className="text-purple-200">Comprehensive game analytics and performance metrics</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10">
                <BarChart3 className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Live Bet Monitoring */}
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-gold mb-4">🧭 Live Bet Monitoring</h2>
          <div className="bg-black/40 border-gold/30 backdrop-blur-sm rounded-lg p-4">
            <LiveBetMonitoring />
          </div>
        </div>

        {/* Analytics Dashboard */}
        <div className="max-w-7xl mx-auto">
          <AnalyticsDashboard />
        </div>
      </div>
    </AdminLayout>
  );
}

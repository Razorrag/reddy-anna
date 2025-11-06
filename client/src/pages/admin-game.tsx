import AdminGamePanel from '@/components/AdminGamePanel/AdminGamePanel';
import AdminLayout from '@/components/AdminLayout';
import LiveBetMonitoring from '@/components/LiveBetMonitoring';

export default function AdminGame() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Game Control Panel */}
        <AdminGamePanel />
        
        {/* Live Bet Monitoring - In Game Control */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-gold mb-4">🧭 Live Bet Monitoring</h2>
          <div className="bg-black/40 border border-gold/30 backdrop-blur-sm rounded-lg p-4">
            <LiveBetMonitoring />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

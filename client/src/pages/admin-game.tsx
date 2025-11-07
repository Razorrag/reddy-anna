import AdminGamePanel from '@/components/AdminGamePanel/AdminGamePanel';
import AdminLayout from '@/components/AdminLayout';

export default function AdminGame() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Game Control Panel */}
        <AdminGamePanel />
      </div>
    </AdminLayout>
  );
}

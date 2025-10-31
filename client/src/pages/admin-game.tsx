import React from 'react';
import AdminGamePanel from '@/components/AdminGamePanel/AdminGamePanel';
import AdminLayout from '@/components/AdminLayout';

export default function AdminGame() {
  return (
    <AdminLayout>
      <AdminGamePanel />
    </AdminLayout>
  );
}

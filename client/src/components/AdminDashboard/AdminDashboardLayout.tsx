// Admin Dashboard Layout Component
// Main layout wrapper for the admin dashboard with navigation and content areas

import React, { useState } from 'react';
import { AdminDashboard } from './AdminDashboard';
import { AdminRequestsTable } from './AdminRequestsTable';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import BetMonitoringDashboard from '../BetMonitoringDashboard';
import AdminGamePanelSimplified from '../AdminGamePanel/AdminGamePanelSimplified';

interface AdminDashboardLayoutProps {
  initialActiveTab?: 'dashboard' | 'requests' | 'betting' | 'game';
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

interface AdminRequestsTableProps {
  requests: any[];
  pagination: Pagination;
  onStatusUpdate: (requestId: string, status: string) => void;
  onProcessRequest: (requestId: string, action: string) => void;
}

export const AdminDashboardLayout: React.FC<AdminDashboardLayoutProps> = ({
  initialActiveTab = 'dashboard'
}) => {
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'requests':
        return <AdminRequestsTable
          requests={[]}
          pagination={{
            page: 1,
            limit: 10,
            total: 0,
            onPageChange: () => {},
            onLimitChange: () => {}
          }}
          onStatusUpdate={() => {}}
          onProcessRequest={() => {}}
        />;
      case 'betting':
        return <BetMonitoringDashboard />;
      case 'game':
        return <AdminGamePanelSimplified />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="admin-dashboard-layout">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <AdminHeader
          activeTab={activeTab}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          onTabChange={setActiveTab}
        />

        {/* Content Area */}
        <div className="content-area">
          <div className="content-container">
            {renderContent()}
          </div>
        </div>
      </div>

      <style>{`
        .admin-dashboard-layout {
          display: flex;
          min-height: 100vh;
          background-color: #f8fafc;
        }

        .sidebar-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 999;
          display: none;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .content-area {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
        }

        .content-container {
          max-width: 1400px;
          margin: 0 auto;
          height: 100%;
        }

        @media (max-width: 768px) {
          .sidebar-overlay {
            display: ${sidebarOpen ? 'block' : 'none'};
          }

          .content-area {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
};
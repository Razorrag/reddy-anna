// Admin Sidebar Component
// Navigation sidebar for the admin dashboard with tab selection

import React from 'react';

interface AdminSidebarProps {
  activeTab: 'dashboard' | 'requests' | 'betting' | 'game';
  onTabChange: (tab: 'dashboard' | 'requests' | 'betting' | 'game') => void;
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen,
  onClose
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'requests', label: 'Requests', icon: '📝' },
    { id: 'betting', label: 'Betting', icon: '🎰' },
    { id: 'game', label: 'Game Control', icon: '🎮' }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 md:static md:w-64`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            🎰 Admin Panel
          </h2>
        </div>

        {/* Navigation */}
        <nav className="p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id as any);
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-200 mb-1 ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 border border-blue-200'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Stats Preview */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">Quick Stats</div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-green-50 p-2 rounded">
              <div className="text-sm font-bold text-green-600">150+</div>
              <div className="text-xs text-green-500">Active Users</div>
            </div>
            <div className="bg-blue-50 p-2 rounded">
              <div className="text-sm font-bold text-blue-600">₹25K</div>
              <div className="text-xs text-blue-500">Today's Volume</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
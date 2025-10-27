// Request Statistics Cards Component
// Display key metrics and statistics for admin dashboard

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface RequestStats {
  total_requests: number;
  pending_requests: number;
  high_priority_requests: number;
  approved_requests: number;
  rejected_requests: number;
  pending_amount: number;
  approved_amount: number;
}

interface RequestStatsCardsProps {
  stats?: RequestStats;
  loading?: boolean;
  onRefresh?: () => void;
}

export const RequestStatsCards: React.FC<RequestStatsCardsProps> = ({
  stats,
  loading,
  onRefresh
}) => {
  const statCards = [
    {
      title: 'Total Requests',
      value: stats?.total_requests || 0,
      icon: '📋',
      color: 'bg-blue-500',
      format: 'number'
    },
    {
      title: 'Pending Requests',
      value: stats?.pending_requests || 0,
      icon: '⏳',
      color: 'bg-yellow-500',
      format: 'number'
    },
    {
      title: 'High Priority',
      value: stats?.high_priority_requests || 0,
      icon: '🚨',
      color: 'bg-red-500',
      format: 'number'
    },
    {
      title: 'Approved Requests',
      value: stats?.approved_requests || 0,
      icon: '✅',
      color: 'bg-green-500',
      format: 'number'
    },
    {
      title: 'Rejected Requests',
      value: stats?.rejected_requests || 0,
      icon: '❌',
      color: 'bg-gray-500',
      format: 'number'
    },
    {
      title: 'Pending Amount',
      value: stats?.pending_amount || 0,
      icon: '💰',
      color: 'bg-purple-500',
      format: 'currency'
    },
    {
      title: 'Approved Amount',
      value: stats?.approved_amount || 0,
      icon: '💳',
      color: 'bg-indigo-500',
      format: 'currency'
    }
  ];

  const formatValue = (value: number, format: string) => {
    if (format === 'currency') {
      return `₹${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="request-stats-cards">
      <div className="stats-header">
        <h2 className="text-xl font-semibold text-gray-900">Request Statistics</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="refresh-button"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className={`stat-card ${card.color}`}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-content">
              <div className="stat-title">{card.title}</div>
              <div className="stat-value">
                {loading ? (
                  <div className="loading-skeleton">
                    <div className="skeleton-line"></div>
                  </div>
                ) : (
                  formatValue(card.value, card.format)
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
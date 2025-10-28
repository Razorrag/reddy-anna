// Admin Dashboard Component
// Comprehensive admin dashboard for managing requests, users, and platform operations

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Plus } from 'lucide-react';

import { AdminRequestsTable } from './AdminRequestsTable';
import { RequestStatsCards } from './RequestStatsCards';
import { RequestFilters } from './RequestFilters';
import { ManualRequestModal } from './ManualRequestModal';
import { ExportButton } from './ExportButton';
import { WebSocketStatus } from '../WebSocketStatus';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../contexts/AuthContext';

interface AdminDashboardProps {
  className?: string;
}

interface RequestFilter {
  status?: string;
  request_type?: string;
  priority?: number;
  date_from?: string;
  date_to?: string;
}

interface RequestStats {
  total_requests: number;
  pending_requests: number;
  high_priority_requests: number;
  approved_requests: number;
  rejected_requests: number;
  pending_amount: number;
  approved_amount: number;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ className }) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [filters, setFilters] = useState<RequestFilter>({});
  const [showManualRequestModal, setShowManualRequestModal] = useState(false);
  const [websocketConnected, setWebsocketConnected] = useState(false);
  
  const queryClient = useQueryClient();

  // Fetch request statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<RequestStats>({
    queryKey: ['admin-requests-stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/requests/summary');
      if (!response.ok) {
        throw new Error('Failed to fetch request statistics');
      }
      return response.json().then(data => data.data);
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch requests with pagination and filtering
  const { data: requestsData, isLoading: requestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ['admin-requests', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', limit.toString());
      
      // Add filters if they exist
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/requests?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }
      return response.json().then(data => data.data);
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Mutation for updating request status
  const updateRequestStatusMutation = useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/admin/requests/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update request status');
      }
      
      return response.json().then(data => data.data);
    },
    onSuccess: () => {
      showToast({
        title: "Success",
        description: "Request status updated successfully",
      });
      refetchRequests();
      refetchStats();
    },
    onError: (error: Error) => {
      showToast({
        title: "Error",
        description: `Failed to update request status: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation for processing request with balance update
  const processRequestMutation = useMutation({
    mutationFn: async ({ requestId, status, notes }: { requestId: string; status: string; notes?: string }) => {
      const response = await fetch(`/api/admin/requests/${requestId}/process`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      
      if (!response.ok) {
        throw new Error('Failed to process request');
      }
      
      return response.json().then(data => data.data);
    },
    onSuccess: () => {
      showToast({
        title: "Success",
        description: "Request processed successfully",
      });
      refetchRequests();
      refetchStats();
    },
    onError: (error: Error) => {
      showToast({
        title: "Error",
        description: `Failed to process request: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle status update
  const handleStatusUpdate = useCallback((requestId: string, status: string, notes?: string) => {
    updateRequestStatusMutation.mutate({ requestId, status, notes });
  }, [updateRequestStatusMutation]);

  // Handle request processing
  const handleProcessRequest = useCallback((requestId: string, status: string, notes?: string) => {
    processRequestMutation.mutate({ requestId, status, notes });
  }, [processRequestMutation]);

  // Handle manual request creation
  const handleManualRequest = useCallback(async (requestData: any) => {
    try {
      const response = await fetch('/api/admin/requests/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error('Failed to create manual request');
      }

      const result = await response.json();
      showToast({
        title: "Success",
        description: "Manual request created successfully",
      });
      setShowManualRequestModal(false);
      refetchRequests();
      refetchStats();
    } catch (error: any) {
      showToast({
        title: "Error",
        description: `Failed to create manual request: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [refetchRequests, refetchStats]);

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: RequestFilter) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  // WebSocket connection setup
  const { token } = useAuth();
  const { toast: showToast } = useToast();
  
  useEffect(() => {
    const setupWebSocket = () => {
      const ws = new WebSocket(`ws://${window.location.host}/ws`);
      
      ws.onopen = () => {
        console.log('WebSocket connected for admin dashboard');
        setWebsocketConnected(true);
        
        // Send authentication
        if (token) {
          ws.send(JSON.stringify({
            type: 'authenticate',
            data: {
              token: token
            }
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'admin_notification') {
            // Handle real-time notifications
            if (message.event === 'new_request') {
              showToast({
                title: "New Request",
                description: `New ${message.data.request.request_type} request received`,
              });
              refetchRequests();
              refetchStats();
            } else if (message.event === 'request_status_update') {
              showToast({
                title: "Status Updated",
                description: `Request ${message.data.request.id} status updated`,
              });
              refetchRequests();
            } else if (message.event === 'request_processed') {
              showToast({
                title: "Request Processed",
                description: `Request ${message.data.request.id} processed`,
              });
              refetchRequests();
              refetchStats();
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWebsocketConnected(false);
        // Retry connection after 5 seconds
        setTimeout(setupWebSocket, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWebsocketConnected(false);
      };

      return ws;
    };

    const ws = setupWebSocket();
    return () => ws.close();
  }, [refetchRequests, refetchStats]);

  return (
    <div className={`admin-dashboard ${className || ''}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="header-actions">
            <WebSocketStatus connected={websocketConnected} />
            <button
              onClick={() => {
                refetchRequests();
                refetchStats();
              }}
              className="btn btn-secondary flex items-center gap-2"
              disabled={requestsLoading || statsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${requestsLoading || statsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowManualRequestModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Manual Request
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <RequestStatsCards 
        stats={stats} 
        loading={statsLoading}
        onRefresh={refetchStats}
      />

      {/* Filters and Actions */}
      <div className="dashboard-filters-actions">
        <RequestFilters 
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
        <div className="filters-actions-right">
          <ExportButton 
            filters={filters}
            className="btn btn-secondary flex items-center gap-2"
          />
        </div>
      </div>

      {/* Requests Table */}
      <AdminRequestsTable
        requests={requestsData?.requests || []}
        loading={requestsLoading}
        pagination={{
          page,
          limit,
          total: requestsData?.total || 0,
          onPageChange: setPage,
          onLimitChange: setLimit
        }}
        onStatusUpdate={handleStatusUpdate}
        onProcessRequest={handleProcessRequest}
      />

      {/* Manual Request Modal */}
      <ManualRequestModal
        isOpen={showManualRequestModal}
        onClose={() => setShowManualRequestModal(false)}
        onSubmit={handleManualRequest}
      />
    </div>
  );
};

export default AdminDashboard;
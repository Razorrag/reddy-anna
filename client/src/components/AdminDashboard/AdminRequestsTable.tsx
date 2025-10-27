// Admin Requests Table Component
// Display and manage admin requests in a table format

import React, { useState } from 'react';
import { format } from 'date-fns';

interface AdminRequest {
  id: string;
  user_phone: string;
  request_type: string;
  amount?: number;
  currency: string;
  payment_method?: string;
  utr_number?: string;
  status: string;
  priority: number;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

interface AdminRequestsTableProps {
  requests: AdminRequest[];
  loading?: boolean;
  pagination: Pagination;
  onStatusUpdate: (requestId: string, status: string, notes?: string) => void;
  onProcessRequest: (requestId: string, status: string, notes?: string) => void;
}

export const AdminRequestsTable: React.FC<AdminRequestsTableProps> = ({
  requests,
  loading,
  pagination,
  onStatusUpdate,
  onProcessRequest
}) => {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-500 text-white';
      case 2: return 'bg-yellow-500 text-black';
      case 3: return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return '💰';
      case 'withdrawal': return '💳';
      case 'support': return '❓';
      case 'balance': return '📊';
      default: return '📋';
    }
  };

  const handleStatusUpdate = (requestId: string, status: string) => {
    onStatusUpdate(requestId, status, notes);
    setSelectedRequest(null);
    setNotes('');
  };

  const handleProcessRequest = (requestId: string, status: string) => {
    onProcessRequest(requestId, status, notes);
    setSelectedRequest(null);
    setNotes('');
  };

  const getStatusActions = (request: AdminRequest) => {
    if (request.status === 'pending') {
      return (
        <div className="status-actions">
          <select
            onChange={(e) => handleStatusUpdate(request.id, e.target.value)}
            className="status-select"
            defaultValue=""
          >
            <option value="">Change Status</option>
            <option value="approved">Approve</option>
            <option value="rejected">Reject</option>
            <option value="processing">Processing</option>
          </select>
          <select
            onChange={(e) => handleProcessRequest(request.id, e.target.value)}
            className="process-select"
            defaultValue=""
          >
            <option value="">Process & Update Balance</option>
            <option value="approved">Approve & Credit</option>
            <option value="rejected">Reject</option>
          </select>
        </div>
      );
    }
    
    if (request.status === 'processing') {
      return (
        <div className="status-actions">
          <select
            onChange={(e) => handleProcessRequest(request.id, e.target.value)}
            className="process-select"
            defaultValue=""
          >
            <option value="">Complete Processing</option>
            <option value="approved">Mark as Approved</option>
            <option value="rejected">Mark as Rejected</option>
          </select>
        </div>
      );
    }

    return <span className={`status-badge ${getStatusColor(request.status)}`}>{request.status}</span>;
  };

  return (
    <div className="admin-requests-table">
      <div className="table-container">
        <table className="requests-table">
          <thead>
            <tr>
              <th className="priority-col">Priority</th>
              <th className="type-col">Type</th>
              <th className="phone-col">Phone</th>
              <th className="amount-col">Amount</th>
              <th className="payment-col">Payment Method</th>
              <th className="utr-col">UTR Number</th>
              <th className="status-col">Status</th>
              <th className="created-col">Created</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="loading-row">
                  <div className="loading-spinner">Loading requests...</div>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-row">
                  <div className="empty-state">
                    <span className="empty-icon">📋</span>
                    <span className="empty-text">No requests found</span>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id} className="request-row">
                  <td className="priority-col">
                    <span className={`priority-badge ${getPriorityColor(request.priority)}`}>
                      {request.priority === 1 ? 'High' : request.priority === 2 ? 'Medium' : 'Low'}
                    </span>
                  </td>
                  <td className="type-col">
                    <span className="request-type">
                      <span className="type-icon">{getRequestTypeIcon(request.request_type)}</span>
                      {request.request_type}
                    </span>
                  </td>
                  <td className="phone-col">
                    <span className="phone-number">{request.user_phone}</span>
                  </td>
                  <td className="amount-col">
                    {request.amount ? (
                      <span className="amount">
                        ₹{request.amount.toLocaleString()} {request.currency}
                      </span>
                    ) : (
                      <span className="no-amount">-</span>
                    )}
                  </td>
                  <td className="payment-col">
                    <span className="payment-method">
                      {request.payment_method || '-'}
                    </span>
                  </td>
                  <td className="utr-col">
                    <span className="utr-number">
                      {request.utr_number || '-'}
                    </span>
                  </td>
                  <td className="status-col">
                    {getStatusActions(request)}
                  </td>
                  <td className="created-col">
                    <span className="created-date">
                      {format(new Date(request.created_at), 'dd MMM yyyy HH:mm')}
                    </span>
                  </td>
                  <td className="actions-col">
                    <div className="row-actions">
                      <button
                        onClick={() => setSelectedRequest(
                          selectedRequest === request.id ? null : request.id
                        )}
                        className="btn btn-sm btn-secondary"
                      >
                        {selectedRequest === request.id ? 'Hide' : 'Details'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Expanded Details */}
      {selectedRequest && (
        <div className="request-details">
          {requests
            .filter(req => req.id === selectedRequest)
            .map(request => (
              <div key={request.id} className="request-detail-content">
                <div className="detail-section">
                  <h4>Request Details</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Request ID:</span>
                      <span className="detail-value">{request.id}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">User Phone:</span>
                      <span className="detail-value">{request.user_phone}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Request Type:</span>
                      <span className="detail-value">{request.request_type}</span>
                    </div>
                    {request.amount && (
                      <div className="detail-item">
                        <span className="detail-label">Amount:</span>
                        <span className="detail-value">₹{request.amount.toLocaleString()} {request.currency}</span>
                      </div>
                    )}
                    {request.payment_method && (
                      <div className="detail-item">
                        <span className="detail-label">Payment Method:</span>
                        <span className="detail-value">{request.payment_method}</span>
                      </div>
                    )}
                    {request.utr_number && (
                      <div className="detail-item">
                        <span className="detail-label">UTR Number:</span>
                        <span className="detail-value">{request.utr_number}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Timeline</h4>
                  <div className="timeline">
                    <div className="timeline-item">
                      <span className="timeline-label">Created:</span>
                      <span className="timeline-value">
                        {format(new Date(request.created_at), 'dd MMM yyyy HH:mm:ss')}
                      </span>
                    </div>
                    {request.updated_at && (
                      <div className="timeline-item">
                        <span className="timeline-label">Updated:</span>
                        <span className="timeline-value">
                          {format(new Date(request.updated_at), 'dd MMM yyyy HH:mm:ss')}
                        </span>
                      </div>
                    )}
                    {request.processed_at && (
                      <div className="timeline-item">
                        <span className="timeline-label">Processed:</span>
                        <span className="timeline-value">
                          {format(new Date(request.processed_at), 'dd MMM yyyy HH:mm:ss')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {request.admin_notes && (
                  <div className="detail-section">
                    <h4>Admin Notes</h4>
                    <p className="admin-notes">{request.admin_notes}</p>
                  </div>
                )}

                <div className="detail-actions">
                  <input
                    type="text"
                    placeholder="Add admin notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="notes-input"
                  />
                  <div className="action-buttons">
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(request.id, 'approved')}
                          className="btn btn-success"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(request.id, 'rejected')}
                          className="btn btn-danger"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="btn btn-secondary"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Pagination */}
      <div className="table-pagination">
        <div className="pagination-info">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} requests
        </div>
        <div className="pagination-controls">
          <button
            onClick={() => pagination.onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="btn btn-sm btn-secondary"
          >
            Previous
          </button>
          <span className="page-number">{pagination.page}</span>
          <button
            onClick={() => pagination.onPageChange(pagination.page + 1)}
            disabled={pagination.page * pagination.limit >= pagination.total}
            className="btn btn-sm btn-secondary"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
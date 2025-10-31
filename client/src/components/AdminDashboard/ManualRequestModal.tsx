// Manual Request Modal Component
// Modal for creating manual admin requests

import { tokenManager } from '@/lib/TokenManager';
import React, { useState } from 'react';

interface ManualRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (requestData: any) => void;
}

export const ManualRequestModal: React.FC<ManualRequestModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    user_phone: '',
    request_type: 'deposit',
    amount: '',
    currency: 'INR',
    payment_method: '',
    utr_number: '',
    priority: '3',
    reason: '' // New field for admin reason
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate reason field
    if (!formData.reason.trim()) {
      alert('Please provide a reason for this admin action');
      setLoading(false);
      return;
    }

    try {
      // Use the new admin direct payment endpoint
      const response = await fetch('/api/admin/payment-requests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getToken()}` // Include admin token (via TokenManager)
        },
        body: JSON.stringify({
          ...formData,
          amount: formData.amount ? parseFloat(formData.amount) : undefined,
          priority: parseInt(formData.priority)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create admin payment request');
      }

      const result = await response.json();
      
      // Show success message with details
      alert(`✅ ${formData.request_type.toUpperCase()} created successfully!\n\nRequest ID: ${result.requestId}\nAmount: ₹${formData.amount}\nReason: ${formData.reason}`);
      
      // Call the original onSubmit callback if provided
      if (onSubmit) {
        await onSubmit(result);
      }
      
      // Close modal on success
      onClose();
      
    } catch (error: any) {
      console.error('Error creating admin payment request:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Manual Request</h2>
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="manual-request-form">
          <div className="form-group">
            <label>User Phone *</label>
            <input
              type="tel"
              name="user_phone"
              value={formData.user_phone}
              onChange={handleChange}
              required
              placeholder="919876543210"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Request Type *</label>
            <select
              name="request_type"
              value={formData.request_type}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
              <option value="support">Support</option>
              <option value="balance">Balance</option>
            </select>
          </div>

          <div className="form-group">
            <label>Amount</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="10000"
              min="0"
              step="0.01"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Currency</label>
            <input
              type="text"
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="form-input"
              disabled
            />
          </div>

          <div className="form-group">
            <label>Payment Method</label>
            <input
              type="text"
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              placeholder="UPI / Bank Transfer / Cash"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>UTR Number</label>
            <input
              type="text"
              name="utr_number"
              value={formData.utr_number}
              onChange={handleChange}
              placeholder="UPI1234567890"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Reason for Action *</label>
            <textarea
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              required
              placeholder="Enter reason for this admin action (e.g., 'Bonus credit', 'Manual deposit', 'Balance correction')"
              className="form-textarea"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="form-select"
            >
              <option value="3">Low Priority</option>
              <option value="2">Medium Priority</option>
              <option value="1">High Priority</option>
            </select>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !formData.user_phone || !formData.reason.trim()}
            >
              {loading ? 'Creating...' : 'Create & Process Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
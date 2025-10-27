// Manual Request Modal Component
// Modal for creating manual admin requests

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
    priority: '3'
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : undefined,
        priority: parseInt(formData.priority)
      });
    } catch (error) {
      console.error('Error creating manual request:', error);
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
              disabled={loading || !formData.user_phone}
            >
              {loading ? 'Creating...' : 'Create Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
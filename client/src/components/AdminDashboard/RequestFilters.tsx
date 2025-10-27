// Request Filters Component
// Filter controls for admin requests

import React from 'react';

interface RequestFilter {
  status?: string;
  request_type?: string;
  priority?: number;
  date_from?: string;
  date_to?: string;
}

interface RequestFiltersProps {
  filters: RequestFilter;
  onFiltersChange: (filters: RequestFilter) => void;
}

export const RequestFilters: React.FC<RequestFiltersProps> = ({
  filters,
  onFiltersChange
}) => {
  const [localFilters, setLocalFilters] = React.useState<RequestFilter>(filters);

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' }
  ];

  const requestTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'deposit', label: 'Deposit' },
    { value: 'withdrawal', label: 'Withdrawal' },
    { value: 'support', label: 'Support' },
    { value: 'balance', label: 'Balance' }
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: '3', label: 'Low Priority' },
    { value: '2', label: 'Medium Priority' },
    { value: '1', label: 'High Priority' }
  ];

  const handleFilterChange = (key: keyof RequestFilter, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: RequestFilter = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  return (
    <div className="request-filters">
      <div className="filter-group">
        <label className="filter-label">Status</label>
        <select
          value={localFilters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
          className="filter-select"
        >
          {statusOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Request Type</label>
        <select
          value={localFilters.request_type || ''}
          onChange={(e) => handleFilterChange('request_type', e.target.value || undefined)}
          className="filter-select"
        >
          {requestTypeOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Priority</label>
        <select
          value={localFilters.priority?.toString() || ''}
          onChange={(e) => handleFilterChange('priority', e.target.value ? parseInt(e.target.value) : undefined)}
          className="filter-select"
        >
          {priorityOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="filter-label">Date From</label>
        <input
          type="date"
          value={localFilters.date_from || ''}
          onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
          className="filter-input"
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">Date To</label>
        <input
          type="date"
          value={localFilters.date_to || ''}
          onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
          className="filter-input"
        />
      </div>

      <div className="filter-actions">
        <button
          onClick={clearFilters}
          className="btn btn-secondary filter-clear"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};
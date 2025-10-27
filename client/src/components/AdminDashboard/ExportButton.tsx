// Export Button Component
// Button for exporting admin requests data

import React from 'react';

interface ExportButtonProps {
  filters: any;
  className?: string;
  format?: 'csv' | 'json';
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  filters,
  className = '',
  format = 'csv'
}) => {
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format,
        ...filters
      });

      const response = await fetch(`/api/admin/requests/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin-requests-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        const jsonString = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin-requests-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data');
    }
  };

  return (
    <button
      onClick={handleExport}
      className={`export-button ${className}`}
      title={`Export requests as ${format.toUpperCase()}`}
    >
      <svg className="export-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export
    </button>
  );
};
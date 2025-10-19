import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = '#ffd700', 
  className = '' 
}) => {
  const sizeMap = {
    small: '20px',
    medium: '40px',
    large: '60px'
  };

  return (
    <div 
      className={`loading-spinner ${className}`}
      style={{
        display: 'inline-block',
        width: sizeMap[size],
        height: sizeMap[size],
        border: `3px solid rgba(255, 255, 255, 0.3)`,
        borderRadius: '50%',
        borderTopColor: color,
        animation: 'spin 1s ease-in-out infinite'
      }}
    />
  );
};

// Loading overlay component
interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isLoading, 
  message = 'Loading...', 
  children 
}) => {
  return (
    <div style={{ position: 'relative' }}>
      {children}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            borderRadius: '8px'
          }}
        >
          <LoadingSpinner size="large" />
          {message && (
            <p style={{ 
              color: 'white', 
              marginTop: '1rem', 
              fontFamily: 'Poppins, sans-serif' 
            }}>
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// Loading button component
interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  isLoading, 
  children, 
  disabled = false, 
  className = '', 
  onClick,
  type = 'button'
}) => {
  return (
    <button
      type={type}
      className={`${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled || isLoading}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        position: 'relative'
      }}
    >
      {isLoading && <LoadingSpinner size="small" />}
      {children}
    </button>
  );
};

export default LoadingSpinner;
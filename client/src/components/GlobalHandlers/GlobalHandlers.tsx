import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../Button/Button';

// Global loading component
export const GlobalLoading: React.FC = () => {
  const { state } = useApp();
  
  if (!state.loading && state.authChecked) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] backdrop-blur-sm">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold mb-4"></div>
        <p className="text-white text-lg font-medium">
          {!state.authChecked ? 'Authenticating...' : 'Loading...'}
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Please wait while we prepare your experience
        </p>
      </div>
    </div>
  );
};

// Global error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; retry: () => void }> },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; retry: () => void }> }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Global error caught:', error, errorInfo);
    
    // Log to error tracking service if available
    if (typeof window !== 'undefined') {
      // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }
    
    this.setState({ error, errorInfo });
  }

  retry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;
      
      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} retry={this.retry} />;
      }
      
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
          <div className="text-center p-8 bg-gray-800 rounded-xl border border-red-500 max-w-md w-full">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-red-500 mb-4">Something went wrong</h2>
            
            <p className="text-gray-300 mb-4">
              We apologize for the inconvenience. An unexpected error occurred.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-sm text-gray-400 cursor-pointer mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="bg-gray-900 p-3 rounded text-xs text-red-400 font-mono overflow-auto max-h-32">
                  {this.state.error.message}
                </div>
                {this.state.errorInfo && (
                  <div className="bg-gray-900 p-3 rounded text-xs text-gray-400 font-mono overflow-auto max-h-32 mt-2">
                    {this.state.errorInfo.componentStack}
                  </div>
                )}
              </details>
            )}
            
            <div className="flex gap-3 justify-center">
              <Button onClick={this.retry} variant="primary">
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="secondary"
              >
                Reload Page
              </Button>
            </div>
            
            <p className="text-gray-500 text-xs mt-4">
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Network error handler component
export const NetworkErrorHandler: React.FC = () => {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const { addNotification } = useApp();

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addNotification('Connection restored', 'success');
    };

    const handleOffline = () => {
      setIsOnline(false);
      addNotification('Connection lost. Please check your internet connection.', 'error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addNotification]);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-[9998]">
      <div className="flex items-center justify-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="font-medium">No Internet Connection</span>
      </div>
    </div>
  );
};

// Performance monitoring component
export const PerformanceMonitor: React.FC = () => {
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Monitor page load performance
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const loadTime = entry.duration;
            if (loadTime > 3000) {
              console.warn(`Slow page load detected: ${loadTime.toFixed(2)}ms`);
            }
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        // PerformanceObserver might not be available in all browsers
        console.log('Performance monitoring not available');
      }

      return () => observer.disconnect();
    }
  }, []);

  return null;
};

// Component to handle keyboard shortcuts
export const KeyboardShortcuts: React.FC = () => {
  const { addNotification } = useApp();

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K for search (if implemented)
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        addNotification('Search feature coming soon!', 'info');
      }

      // Escape to close modals (if implemented)
      if (event.key === 'Escape') {
        // Close any open modals here
        console.log('Escape pressed - close modals');
      }

      // Ctrl/Cmd + / for keyboard shortcuts help
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        addNotification('Keyboard shortcuts: Ctrl+K (Search), Esc (Close modal), Ctrl+/ (Help)', 'info');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [addNotification]);

  return null;
};

// Component to handle viewport size changes
export const ViewportHandler: React.FC = () => {
  const { setTheme } = useApp();

  React.useEffect(() => {
    const handleResize = () => {
      // Auto-adjust theme based on system preference for small screens
      if (window.innerWidth < 768) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          setTheme('dark');
        }
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => window.removeEventListener('resize', handleResize);
  }, [setTheme]);

  return null;
};

// Main global handlers wrapper
export const GlobalHandlers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <GlobalErrorBoundary>
      <PerformanceMonitor />
      <NetworkErrorHandler />
      <KeyboardShortcuts />
      <ViewportHandler />
      <GlobalLoading />
      {children}
    </GlobalErrorBoundary>
  );
};

export default GlobalHandlers;

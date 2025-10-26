import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useApp } from '../contexts/AppContext';

interface ProtectedRouteProps {
  component?: React.ComponentType<any>;
  children?: React.ReactNode;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  component: Component, 
  children,
  requireAuth = true
}) => {
  const { state } = useApp();
  const [, setLocation] = useLocation();
  
  // Show loading while checking authentication
  if (!state.authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  
  // Check if user is authenticated (if required)
  useEffect(() => {
    if (requireAuth && !state.isAuthenticated) {
      console.log('Not authenticated, redirecting to login');
      setLocation('/login');
    }
  }, [requireAuth, state.isAuthenticated, setLocation]);
  
  // If authentication is required but user is not authenticated, show nothing (will redirect)
  if (requireAuth && !state.isAuthenticated) {
    return null;
  }
  
  // Return the children/component
  return children ? <>{children}</> : Component ? <Component /> : null;
};

export default ProtectedRoute;

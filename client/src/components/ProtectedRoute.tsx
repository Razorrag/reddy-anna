import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';

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
  const [, setLocation] = useLocation();
  const { state: authState, refreshUser } = useAuth();
  
  // Check if user has player role (allow both players and admins)
  const isPlayer = authState.isAuthenticated && 
    authState.user && 
    (authState.user.role === 'player' || authState.user.role === 'admin' || authState.user.role === 'super_admin');

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (requireAuth && !isPlayer && authState.authChecked) {
      setLocation('/login');
    }
  }, [requireAuth, isPlayer, authState.authChecked, setLocation]);

  // Show loading while checking authentication status
  if (!authState.authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated, redirect happens via useEffect
  if (requireAuth && !isPlayer) {
    return null;
  }
  
  // Return the children/component
  return children ? <>{children}</> : Component ? <Component /> : null;
};

export default ProtectedRoute;

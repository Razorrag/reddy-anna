import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

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
  const { state: authState } = useAuth();
  const [minWaitComplete, setMinWaitComplete] = React.useState(false);
  
  // Check if user has player role (allow both players and admins)
  const isPlayer = authState.isAuthenticated && 
    authState.user && 
    (authState.user.role === 'player' || authState.user.role === 'admin' || authState.user.role === 'super_admin');

  // Minimum wait to prevent flash of loading/login page
  React.useEffect(() => {
    const timer = setTimeout(() => setMinWaitComplete(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Redirect unauthenticated users only after auth check is complete
  React.useEffect(() => {
    // Wait until auth check is complete and minimum wait is done
    if (!authState.authChecked || !minWaitComplete) {
      return; // Still loading, don't redirect yet
    }

    // If protection is not required, don't redirect
    if (!requireAuth) {
      return;
    }

    // If user is not authenticated and auth check is done, redirect to login
    if (!isPlayer) {
      console.log('ProtectedRoute: User not authenticated, redirecting to login');
      setLocation('/login');
    }
  }, [requireAuth, isPlayer, authState.authChecked, minWaitComplete, setLocation]);

  // Show loading while checking authentication status or minimum wait
  if (!authState.authChecked || !minWaitComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated, block rendering
  if (requireAuth && !isPlayer) {
    return null;
  }
  
  // Return the children/component
  return children ? <>{children}</> : Component ? <Component /> : null;
};

export default ProtectedRoute;

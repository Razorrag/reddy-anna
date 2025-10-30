import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedAdminRouteProps {
  component?: React.ComponentType<any>;
  children?: React.ReactNode;
  requireAuth?: boolean;
}

const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ 
  component: Component, 
  children,
  requireAuth = true
}) => {
  const [, setLocation] = useLocation();
  const { state: authState } = useAuth();
  
  // Check if user has admin role (allow only admins and super_admins)
  const isAdmin = authState.isAuthenticated && 
    authState.user && 
    (authState.user.role === 'admin' || authState.user.role === 'super_admin');

  // Redirect to admin login if not authenticated, or to unauthorized if not admin role
  React.useEffect(() => {
    // Wait until auth check is complete before making redirect decision
    if (!authState.authChecked) {
      return; // Still loading, don't redirect yet
    }

    // If protection is not required, don't redirect
    if (!requireAuth) {
      return;
    }

    // If user is not authenticated, redirect to admin login
    if (!authState.isAuthenticated) {
      console.log('ProtectedAdminRoute: User not authenticated, redirecting to admin login');
      setLocation('/admin-login');
      return;
    }

    // If user is authenticated but not admin, redirect to unauthorized
    if (!isAdmin) {
      console.log('ProtectedAdminRoute: User not admin, redirecting to unauthorized');
      setLocation('/unauthorized');
    }
  }, [requireAuth, isAdmin, authState.authChecked, authState.isAuthenticated, setLocation]);

  // Show loading while checking authentication status
  if (!authState.authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated or not admin, block rendering
  if (requireAuth && (!authState.isAuthenticated || !isAdmin)) {
    return null;
  }
  
  // Return the children/component
  return children ? <>{children}</> : Component ? <Component /> : null;
};

export default ProtectedAdminRoute;

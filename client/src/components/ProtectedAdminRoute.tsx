import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

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
  const [minWaitComplete, setMinWaitComplete] = React.useState(false);
  
  // Check if user has admin role (allow only admins and super_admins)
  // Also check localStorage directly as a fallback
  const storedUser = React.useMemo(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (e) {
      console.error('Error parsing stored user:', e);
    }
    return null;
  }, [authState.user]); // Re-check when authState changes

  const isAdmin = React.useMemo(() => {
    // Check both authState and localStorage for admin role
    const user = authState.user || storedUser;
    if (!user) return false;
    
    const role = (user.role || '').toLowerCase();
    return role === 'admin' || role === 'super_admin';
  }, [authState.user, storedUser]);

  const isAuthenticated = React.useMemo(() => {
    // Check both authState and localStorage
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const hasToken = !!localStorage.getItem('token');
    const hasUser = !!storedUser || !!authState.user;
    
    return (authState.isAuthenticated || (isLoggedIn && hasToken && hasUser));
  }, [authState.isAuthenticated, storedUser, authState.user]);

  // Minimum wait to prevent flash of loading/login page
  React.useEffect(() => {
    const timer = setTimeout(() => setMinWaitComplete(true), 200);
    return () => clearTimeout(timer);
  }, []);

  // Redirect to admin login if not authenticated, or to unauthorized if not admin role
  React.useEffect(() => {
    // Wait until auth check is complete and minimum wait is done
    if (!authState.authChecked || !minWaitComplete) {
      return; // Still loading, don't redirect yet
    }

    // If protection is not required, don't redirect
    if (!requireAuth) {
      return;
    }

    // If user is not authenticated, redirect to admin login
    if (!isAuthenticated) {
      console.log('ProtectedAdminRoute: User not authenticated, redirecting to admin login');
      console.log('Auth state:', { 
        authChecked: authState.authChecked, 
        isAuthenticated: authState.isAuthenticated,
        hasStoredUser: !!storedUser,
        hasToken: !!localStorage.getItem('token'),
        isLoggedIn: localStorage.getItem('isLoggedIn')
      });
      setLocation('/admin-login');
      return;
    }

    // If user is authenticated but not admin, redirect to unauthorized
    if (!isAdmin) {
      console.log('ProtectedAdminRoute: User not admin, redirecting to unauthorized');
      console.log('User role:', storedUser?.role || authState.user?.role);
      setLocation('/unauthorized');
    }
  }, [requireAuth, isAdmin, isAuthenticated, authState.authChecked, minWaitComplete, setLocation, storedUser]);

  // Show loading while checking authentication status or minimum wait
  if (!authState.authChecked || !minWaitComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated or not admin, block rendering
  if (requireAuth && (!isAuthenticated || !isAdmin)) {
    return null;
  }
  
  // Return the children/component
  return children ? <>{children}</> : Component ? <Component /> : null;
};

export default ProtectedAdminRoute;

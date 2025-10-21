import React from 'react';
import { useApp } from '../contexts/AppContext';

interface ProtectedRouteProps {
  component?: React.ComponentType<any>;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  component: Component, 
  children 
}) => {
  const { state } = useApp();
  
  // TEMPORARY: DISABLE AUTHENTICATION FOR DEVELOPMENT
  // Comment out the authentication checks to allow direct access to protected routes
  // This allows access to /game and /admin without login
  
  // Show loading while checking authentication
  if (!state.authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  
  // AUTHENTICATION CHECKS DISABLED FOR DEVELOPMENT
  // The following checks are commented out to bypass authentication
  
  /*
  // Check if user is authenticated
  if (!state.isAuthenticated) {
    // Redirect to appropriate login based on required role
    const loginPath = role === 'admin' ? '/admin-login' : redirectTo;
    return <Redirect to={loginPath} />;
  }
  
  // Check role if specified
  if (role) {
    const userRole = state.user?.role;
    
    if (Array.isArray(role)) {
      // Check if user has any of the required roles
      if (!userRole || !role.includes(userRole)) {
        return <Redirect to="/unauthorized" />;
      }
    } else if (typeof role === 'string') {
      // Check if user has the specific required role
      if (userRole !== role) {
        return <Redirect to="/unauthorized" />;
      }
    }
  }
  */
  
  // Always return the children/component without authentication checks
  return children ? <>{children}</> : Component ? <Component /> : null;
};

export default ProtectedRoute;

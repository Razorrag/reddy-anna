import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedAdminRoute - Ensures only authenticated admins can access admin pages
 * 
 * This component checks if the user is authenticated as an admin before rendering
 * the protected content.
 * 
 * Behavior:
 * - If admin is logged in → Allow access
 * - If player is logged in → Redirect to /unauthorized
 * - If no one is logged in → Redirect to /admin-login
 */
export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const [, setLocation] = useLocation();
  const { state: authState } = useAuth();
  
  // Check if user has admin role
  const isAdmin = authState.isAuthenticated && 
    authState.user && 
    (authState.user.role === 'admin' || authState.user.role === 'super_admin');
    
  // Check if user is logged in but not an admin
  const isPlayer = authState.isAuthenticated && 
    authState.user && 
    authState.user.role === 'player';

  // Redirect based on user role
  React.useEffect(() => {
    if (authState.authChecked) {
      if (!authState.isAuthenticated) {
        // User not logged in at all
        setLocation('/admin-login');
      } else if (isPlayer) {
        // Player logged in, redirect to unauthorized
        setLocation('/unauthorized');
      }
    }
  }, [authState.authChecked, authState.isAuthenticated, isPlayer, setLocation]);

  // Show loading while checking authentication status
  if (!authState.authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Only render children if user is authenticated as admin
  return isAdmin ? <>{children}</> : null;
};

export default ProtectedAdminRoute;
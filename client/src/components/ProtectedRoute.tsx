import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

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
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Check if user is authenticated using UNIFIED storage
    const checkAuth = () => {
      const userStr = localStorage.getItem('user');
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      
      if (userStr && isLoggedIn) {
        try {
          const user = JSON.parse(userStr);
          // Check if user has player role (not admin)
          if (user && user.role === 'player') {
            setIsAuthenticated(true);
            setIsChecking(false);
            console.log('✅ Player authenticated');
            return;
          } else {
            console.log('❌ User is not a player, role:', user.role);
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      } else {
        console.log('❌ No user logged in');
      }
      
      // If not authenticated as player, redirect to login
      if (requireAuth) {
        setIsAuthenticated(false);
        setIsChecking(false);
        setLocation('/login');
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [requireAuth, setLocation]);
  
  // Show loading while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  
  // If authentication is required but user is not authenticated, show nothing (will redirect)
  if (requireAuth && !isAuthenticated) {
    return null;
  }
  
  // Return the children/component
  return children ? <>{children}</> : Component ? <Component /> : null;
};

export default ProtectedRoute;

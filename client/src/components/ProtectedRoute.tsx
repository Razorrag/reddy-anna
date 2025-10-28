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
    const checkAuth = async () => {
      const userStr = localStorage.getItem('user');
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const token = localStorage.getItem('token'); // Check if token exists
      
      if (userStr && isLoggedIn && token) {
        try {
          const user = JSON.parse(userStr);
          // Allow both players AND admins (admins need to see player experience)
          if (user && (user.role === 'player' || user.role === 'admin' || user.role === 'super_admin')) {
            // Optionally make a quick test request to validate token is still valid
            try {
              // Try to fetch user profile to validate token
              const response = await fetch('/api/user/profile', {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                setIsAuthenticated(true);
                setIsChecking(false);
                console.log(`✅ User authenticated: ${user.role}`);
                return;
              } else {
                // Token is invalid/expired, clear localStorage and redirect
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userRole');
                console.log('❌ Token is invalid/expired - redirected to login');
                setIsAuthenticated(false);
                setIsChecking(false);
                setLocation('/login');
                return;
              }
            } catch (fetchError) {
              console.error('Error validating token:', fetchError);
              // If there's an error validating token, clear localStorage and redirect
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('isLoggedIn');
              localStorage.removeItem('userRole');
              setIsAuthenticated(false);
              setIsChecking(false);
              setLocation('/login');
              return;
            }
          } else {
            console.log('❌ User has invalid role:', user.role);
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

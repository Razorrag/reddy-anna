import React from 'react';
import { Redirect } from 'wouter';

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  role?: 'admin' | 'user';
  redirectTo?: string;
  children?: React.ReactNode;
}

// Simple authentication check - in a real app, this would check tokens/cookies
const checkAuthStatus = (): boolean => {
  if (typeof window === 'undefined') return false;
  // Check if user is logged in (simplified for demo)
  return localStorage.getItem('isLoggedIn') === 'true';
};

// Check if user has specific role
const hasRole = (role: string): boolean => {
  if (typeof window === 'undefined') return false;
  // Check user role (simplified for demo)
  const userRole = localStorage.getItem('userRole');
  return userRole === role;
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  component: Component, 
  role = 'admin',
  redirectTo = '/admin-login',
  children 
}) => {
  // Implement authentication check
  const isAuthenticated = checkAuthStatus();
  
  if (!isAuthenticated) {
    // Redirect to login
    return <Redirect to={redirectTo} />;
  }
  
  // Check role if specified
  if (role && !hasRole(role)) {
    return <Redirect to="/unauthorized" />;
  }
  
  return children ? <>{children}</> : <Component />;
};

export default ProtectedRoute;
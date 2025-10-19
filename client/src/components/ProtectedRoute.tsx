import React from 'react';
import { Redirect } from 'wouter';

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
  role?: 'admin' | 'user' | string[];
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

// Check if user has any of the specified roles
const hasAnyRole = (requiredRoles: string[]): boolean => {
  if (typeof window === 'undefined') return false;
  const userRole = localStorage.getItem('userRole');
  return requiredRoles.includes(userRole || '');
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  component: Component, 
  role,
  redirectTo = '/admin-login',
  children 
}) => {
  // 🔓 DEVELOPMENT MODE: Bypass authentication for testing
  // Remove this in production!
  if (import.meta.env.DEV) {
    console.log('🔓 Development mode: Bypassing authentication');
    return children ? <>{children}</> : <Component />;
  }
  
  // Implement authentication check
  const isAuthenticated = checkAuthStatus();
  
  if (!isAuthenticated) {
    // Redirect to login
    return <Redirect to={redirectTo} />;
  }
  
  // Check role if specified
  if (role && Array.isArray(role)) {
    // Check if user has any of the required roles
    if (!hasAnyRole(role)) {
      return <Redirect to="/unauthorized" />;
    }
  } else if (role && typeof role === 'string') {
    // Check if user has the specific required role
    if (!hasRole(role)) {
      return <Redirect to="/unauthorized" />;
    }
  }
  
  return children ? <>{children}</> : <Component />;
};

export default ProtectedRoute;
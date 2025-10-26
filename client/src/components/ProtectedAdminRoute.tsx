import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedAdminRoute - Ensures only authenticated admins can access admin pages
 * 
 * This component checks if the user is authenticated as an admin before rendering
 * the protected content. If not authenticated, it redirects to a 404 page
 * to hide the existence of admin routes from regular users.
 */
export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({ children }) => {
  const [location, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is authenticated as admin using UNIFIED storage
    const checkAdminAuth = () => {
      const userStr = localStorage.getItem('user');
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      
      if (userStr && isLoggedIn) {
        try {
          const user = JSON.parse(userStr);
          // Check if user has admin or super_admin role
          if (user && (user.role === 'admin' || user.role === 'super_admin')) {
            setIsAdmin(true);
            setIsChecking(false);
            console.log(' Admin authenticated:', user.role);
            return;
          } else {
            console.log(' User is not admin, role:', user.role);
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      } else {
        console.log(' No user logged in');
      }
      
      // If not admin, redirect to admin login page
      setIsAdmin(false);
      setIsChecking(false);
      setLocation('/admin-login');
    };

    checkAdminAuth();
  }, [setLocation]);

  // Show loading while checking authentication
  if (isChecking) {
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
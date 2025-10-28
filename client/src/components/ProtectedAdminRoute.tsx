import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

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
  const [location, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is authenticated as admin using UNIFIED storage
    const checkAdminAuth = () => {
      const userStr = localStorage.getItem('user');
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const token = localStorage.getItem('token'); // Check if token exists
      
      if (userStr && isLoggedIn && token) {
        try {
          const user = JSON.parse(userStr);
          // Check if user has admin or super_admin role
          if (user && (user.role === 'admin' || user.role === 'super_admin')) {
            setIsAdmin(true);
            setIsChecking(false);
            console.log('✅ Admin authenticated:', user.role);
            return;
          } else {
            // User is logged in but not as admin (probably a player)
            // Redirect to unauthorized page
            console.log('❌ User is logged in as:', user.role, '- Redirecting to unauthorized page');
            setIsAdmin(false);
            setIsChecking(false);
            setLocation('/unauthorized');
            return;
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      } else {
        console.log('❌ No user logged in - redirecting to admin login');
      }
      
      // If not logged in at all, redirect to admin login page
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
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
    // Check if user is authenticated as admin
    const checkAdminAuth = () => {
      const adminStr = localStorage.getItem('admin');
      const isAdminLoggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
      
      if (adminStr && isAdminLoggedIn) {
        try {
          const admin = JSON.parse(adminStr);
          if (admin && (admin.role === 'admin' || admin.role === 'super_admin')) {
            setIsAdmin(true);
            setIsChecking(false);
            return;
          }
        } catch (error) {
          console.error('Error parsing admin data:', error);
        }
      }
      
      // If not admin, redirect to 404 to hide route existence
      setIsAdmin(false);
      setIsChecking(false);
      setLocation('/not-found');
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
// 🤝 PROTECTED PARTNER ROUTE
// Separate from player ProtectedRoute
import React from 'react';
import { useLocation } from 'wouter';
import { usePartnerAuth } from '@/contexts/PartnerAuthContext';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedPartnerRouteProps {
  children: React.ReactNode;
}

const ProtectedPartnerRoute: React.FC<ProtectedPartnerRouteProps> = ({ children }) => {
  const { isAuthenticated, state } = usePartnerAuth();
  const [, setLocation] = useLocation();

  // Show loading while checking auth
  if (!state.authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Redirect to partner login if not authenticated
  if (!isAuthenticated) {
    setLocation('/partner/login');
    return null;
  }

  // Check partner status
  if (state.partner?.status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900 flex items-center justify-center p-4">
        <div className="bg-black/40 border border-yellow-500/30 rounded-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-yellow-400 mb-2">Pending Approval</h2>
          <p className="text-gray-300 mb-4">
            Your partner account is awaiting admin approval. You will be notified once your account is activated.
          </p>
          <button
            onClick={() => setLocation('/partner/login')}
            className="text-purple-400 hover:text-purple-300 underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (state.partner?.status === 'suspended' || state.partner?.status === 'banned') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900 flex items-center justify-center p-4">
        <div className="bg-black/40 border border-red-500/30 rounded-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-400 mb-2">
            Account {state.partner?.status === 'suspended' ? 'Suspended' : 'Banned'}
          </h2>
          <p className="text-gray-300 mb-4">
            Your partner account has been {state.partner?.status}. Please contact admin for assistance.
          </p>
          <button
            onClick={() => setLocation('/partner/login')}
            className="text-purple-400 hover:text-purple-300 underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedPartnerRoute;

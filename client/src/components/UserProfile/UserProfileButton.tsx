import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'wouter';
import { 
  User, 
  ChevronDown, 
  Wallet, 
  History, 
  Settings, 
  LogOut,
  TrendingUp,
  Eye,
  CreditCard,
  Gamepad2,
  UserPlus,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserProfileButtonProps {
  className?: string;
}

export const UserProfileButton: React.FC<UserProfileButtonProps> = ({ className = '' }) => {
  const { user, isAuthenticated, setAuthStatus } = useAuth();
  const { state: profileState, fetchAnalytics } = useUserProfile();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch analytics when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && isAuthenticated && !profileState.analytics) {
      fetchAnalytics();
    }
  }, [isDropdownOpen, isAuthenticated, fetchAnalytics, profileState.analytics]);

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    setAuthStatus(false, true);
    setIsDropdownOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  const userInitials = user.username
    .split(' ')
    .map((word: string) => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Profile Button */}
      <Button
        variant="ghost"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-3 py-2 h-auto hover:bg-gold/10 text-white hover:text-gold transition-colors"
      >
        <Avatar className="w-8 h-8">
          <AvatarImage src={user.profilePicture} alt={user.username} />
          <AvatarFallback className="bg-gold/20 text-gold text-sm font-semibold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-white">{user.username}</div>
          {profileState.analytics && (
            <div className="text-xs text-gold">
              {formatCurrency(profileState.analytics.currentBalance)}
            </div>
          )}
        </div>
        
        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-black/95 border border-gold/30 rounded-lg shadow-2xl shadow-gold/20 backdrop-blur-sm z-50">
          {/* User Info Header */}
          <div className="p-4 border-b border-gold/20">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={user.profilePicture} alt={user.username} />
                <AvatarFallback className="bg-gold/20 text-gold text-lg font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-white font-semibold">{user.username}</div>
                <div className="text-gold text-sm">{user.email}</div>
                {profileState.analytics && (
                  <div className="text-white/80 text-xs mt-1">
                    Balance: {formatCurrency(profileState.analytics.currentBalance)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          {profileState.analytics && (
            <div className="p-4 border-b border-gold/20">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <div>
                    <div className="text-white/60">Today</div>
                    <div className="text-white font-medium">
                      {formatCurrency(profileState.analytics.todayProfit)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-white/60">Games</div>
                    <div className="text-white font-medium">
                      {profileState.analytics.gamesPlayed}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="p-2">
            {/* Profile Page */}
            <Link href="/profile">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-white hover:bg-gold/10 hover:text-gold"
                onClick={() => setIsDropdownOpen(false)}
              >
                <User className="w-4 h-4" />
                My Profile
              </Button>
            </Link>

            {/* Game Dashboard */}
            <Link href="/game">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-white hover:bg-gold/10 hover:text-gold"
                onClick={() => setIsDropdownOpen(false)}
              >
                <Gamepad2 className="w-4 h-4" />
                Game Dashboard
              </Button>
            </Link>

            {/* Wallet */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-white hover:bg-gold/10 hover:text-gold"
              onClick={() => {
                // This will open wallet modal - to be implemented
                setIsDropdownOpen(false);
              }}
            >
              <Wallet className="w-4 h-4" />
              Add Funds
            </Button>

            {/* Withdraw */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-white hover:bg-gold/10 hover:text-gold"
              onClick={() => {
                // This will open withdraw modal - to be implemented
                setIsDropdownOpen(false);
              }}
            >
              <CreditCard className="w-4 h-4" />
              Withdraw Money
            </Button>

            {/* Transactions */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-white hover:bg-gold/10 hover:text-gold"
              onClick={() => {
                // This will open transactions modal - to be implemented
                setIsDropdownOpen(false);
              }}
            >
              <History className="w-4 h-4" />
              View Transactions
            </Button>

            {/* Referral */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-white hover:bg-gold/10 hover:text-gold"
              onClick={() => {
                // This will open referral modal - to be implemented
                setIsDropdownOpen(false);
              }}
            >
              <UserPlus className="w-4 h-4" />
              Referral
            </Button>

            {/* Settings */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-white hover:bg-gold/10 hover:text-gold"
              onClick={() => {
                // This will open settings modal - to be implemented
                setIsDropdownOpen(false);
              }}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>

            {/* Logout */}
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfileButton;
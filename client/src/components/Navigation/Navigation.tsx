import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '../../lib/utils';
import { logout } from '../../lib/utils'; // Import centralized logout function
import { getNavigationClass, getButtonClass } from '../../lib/theme-utils';
import { useAuth } from '../../contexts/AuthContext';
import UserProfileButton from '../UserProfile/UserProfileButton';

interface NavigationProps {
  isScrolled?: boolean;
}

const NAV_SECTIONS = [
  { id: 'hero', title: 'Home' },
  { id: 'about', title: 'About' },
  { id: 'gamerules', title: 'Game Rules' },
  { id: 'contact', title: 'Contact' },
];

const Navigation: React.FC<NavigationProps> = ({ isScrolled = false }) => {
  const { isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [location] = useLocation();

  // Handle scroll to update active section
  useEffect(() => {
    // Only run scroll-spy logic on the homepage
    if (location !== '/') return;

    const handleScroll = () => {
      const SCROLL_OFFSET = 100;
      const scrollPosition = window.scrollY + SCROLL_OFFSET;

      for (const section of NAV_SECTIONS) {
        const element = document.getElementById(section.id);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;
          
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [location]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false); // Close mobile menu after navigation
    }
  };

  const getNavButtonClass = (sectionId: string) =>
    cn(
      'font-medium transition-colors duration-200',
      activeSection === sectionId
        ? 'text-gold'
        : 'text-white hover:text-gold'
    );

  const renderNavLinks = (isMobile = false) => (
    <>
      {NAV_SECTIONS.map((section) => (
        <button
          key={section.id}
          onClick={() => scrollToSection(section.id)}
          className={cn(
            getNavButtonClass(section.id),
            isMobile && 'text-left py-2'
          )}
        >
          {section.title}
        </button>
      ))}
    </>
  );

  const renderAuthLinks = () => {
    const { user, isAuthenticated } = useAuth();
    
    if (isAuthenticated && user) {
      // User is logged in
      return (
        <div className="flex items-center space-x-3">
          {user.role === 'admin' ? (
            <Link
              to="/admin"
              className={getButtonClass('primary')}
            >
              Admin Panel
            </Link>
          ) : (
            <Link
              to="/game"
              className={getButtonClass('primary')}
            >
              Play Game
            </Link>
          )}
          {user.role === 'player' && (
            <Link
              to="/profile"
              className="text-white hover:text-gold transition-colors"
            >
              Profile
            </Link>
          )}
          <button
            onClick={() => logout()}
            className="text-white hover:text-gold transition-colors"
          >
            Logout
          </button>
        </div>
      );
    }
    
    // No one is logged in - show login options
    return (
      <div className="flex items-center space-x-3">
        <Link
          to="/login"
          className={getButtonClass('secondary')}
        >
          Player Login
        </Link>
        <Link
          to="/signup"
          className={getButtonClass('secondary')}
        >
          Sign Up
        </Link>
      </div>
    );
  };

  return (
    <nav className={getNavigationClass(isScrolled)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gold">ANDAR BAHAR</div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {renderNavLinks()}
            <div className="flex items-center space-x-3">
              {renderAuthLinks()}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white focus:outline-none p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg 
                className="h-7 w-7" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden bg-black/95 backdrop-blur-lg rounded-lg mt-2 py-4 px-4 border border-gold/20">
            <div className="flex flex-col space-y-3">
              {renderNavLinks(true)}
              <div className="pt-3 border-t border-gold/20 flex flex-col space-y-3">
                {renderAuthLinks()}
                {isAuthenticated && (
                  <UserProfileButton className="lg:hidden w-full" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;

import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { cn } from '../../lib/utils';
import { useApp } from '../../contexts/AppContext';
import { getNavigationClass, getButtonClass } from '../ThemeUtils/ThemeUtils';

interface NavigationProps {
  isScrolled?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ isScrolled = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const { state } = useApp();

  // Handle scroll to update active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'about', 'gamerules', 'contact'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const offsetTop = element.offsetTop;
          const offsetHeight = element.offsetHeight;
          
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMenuOpen(false); // Close mobile menu after navigation
    }
  };

  return (
    <nav className={getNavigationClass(isScrolled)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="text-2xl font-bold text-gold">ANDAR BAHAR</div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            <button 
              onClick={() => scrollToSection('hero')}
              className={cn(
                "font-medium transition-colors duration-200",
                activeSection === 'hero' ? 'text-gold' : 'text-white hover:text-gold'
              )}
            >
              Home
            </button>
            <button 
              onClick={() => scrollToSection('about')}
              className={cn(
                "font-medium transition-colors duration-200",
                activeSection === 'about' ? 'text-gold' : 'text-white hover:text-gold'
              )}
            >
              About
            </button>
            <button 
              onClick={() => scrollToSection('gamerules')}
              className={cn(
                "font-medium transition-colors duration-200",
                activeSection === 'gamerules' ? 'text-gold' : 'text-white hover:text-gold'
              )}
            >
              Game Rules
            </button>
            <button 
              onClick={() => scrollToSection('contact')}
              className={cn(
                "font-medium transition-colors duration-200",
                activeSection === 'contact' ? 'text-gold' : 'text-white hover:text-gold'
              )}
            >
              Contact
            </button>
            {state.isAuthenticated ? (
              <>
                <Link 
                  to="/game" 
                  className={getButtonClass('primary')}
                >
                  Play Game
                </Link>
                {state.user?.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    className={getButtonClass('secondary')}
                  >
                    Admin Panel
                  </Link>
                )}
                <span className="text-white">
                  Welcome, {state.user?.name || 'Player'}
                </span>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className={getButtonClass('primary')}
                >
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  className={getButtonClass('secondary')}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white focus:outline-none"
            >
              <svg 
                className="h-6 w-6" 
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
          <div className="md:hidden bg-black/95 backdrop-blur-lg rounded-lg mt-2 py-4 px-4">
            <div className="flex flex-col space-y-4">
              <button 
                onClick={() => scrollToSection('hero')}
                className={cn(
                  "font-medium text-left py-2",
                  activeSection === 'hero' ? 'text-gold' : 'text-white'
                )}
              >
                Home
              </button>
              <button 
                onClick={() => scrollToSection('about')}
                className={cn(
                  "font-medium text-left py-2",
                  activeSection === 'about' ? 'text-gold' : 'text-white'
                )}
              >
                About
              </button>
              <button 
                onClick={() => scrollToSection('gamerules')}
                className={cn(
                  "font-medium text-left py-2",
                  activeSection === 'gamerules' ? 'text-gold' : 'text-white'
                )}
              >
                Game Rules
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className={cn(
                  "font-medium text-left py-2",
                  activeSection === 'contact' ? 'text-gold' : 'text-white'
                )}
              >
                Contact
              </button>
              <Link 
                to="/login" 
                className={getButtonClass('primary')}
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className={getButtonClass('secondary')}
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '../../lib/utils';
import { useApp } from '../../contexts/AppContext';
import { getNavigationClass, getButtonClass } from '../../lib/theme-utils';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const { state } = useApp();
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

  const renderAuthLinks = () => (
    <>
      <Link 
        to="/game" 
        className={getButtonClass('primary')}
      >
        Play Game
      </Link>
      <Link 
        to="/login" 
        className={getButtonClass('secondary')}
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
  );

  return (
    <nav className={getNavigationClass(isScrolled)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="text-2xl font-bold text-gold">ANDAR BAHAR</div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {renderNavLinks()}
            {renderAuthLinks()}
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
              {renderNavLinks(true)}
              {renderAuthLinks()}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;

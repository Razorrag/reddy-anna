import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

interface NavigationProps {
  isScrolled?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ isScrolled = false }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

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
    <nav className={cn(
      "fixed top-0 left-0 w-full z-50 transition-all duration-300",
      isScrolled 
        ? "bg-black/90 backdrop-blur-md py-2.5 shadow-lg" 
        : "bg-transparent py-4"
    )}>
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
            <Link 
              to="/login" 
              className="px-4 py-2 bg-gold text-black rounded-full font-semibold hover:bg-yellow-400 transition-colors duration-200"
            >
              Login
            </Link>
            <Link 
              to="/signup" 
              className="px-4 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors duration-200"
            >
              Sign Up
            </Link>
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
                className="px-4 py-2 bg-gold text-black rounded-full font-semibold hover:bg-yellow-400 transition-colors duration-200 text-center"
              >
                Login
              </Link>
              <Link 
                to="/signup" 
                className="px-4 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors duration-200 text-center"
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

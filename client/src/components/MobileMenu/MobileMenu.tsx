import React, { useState } from 'react';
import { Link } from 'wouter';
import { X, Menu } from 'lucide-react';

type MobileMenuProps = {
  isScrolled: boolean;
};

const MobileMenu: React.FC<MobileMenuProps> = ({ isScrolled }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`p-2 rounded-md ${isScrolled ? 'text-white' : 'text-white'}`}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/90 z-50 backdrop-blur-sm">
          <div className="flex justify-end p-4">
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-md text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col items-center justify-center h-full space-y-8">
            <Link 
              to="/" 
              className="text-2xl font-medium text-white hover:text-gold transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>
            
            <button 
              onClick={() => {
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                setIsOpen(false);
              }}
              className="text-2xl font-medium text-white hover:text-gold transition-colors"
            >
              About
            </button>
            
            <button 
              onClick={() => {
                document.getElementById('gamerules')?.scrollIntoView({ behavior: 'smooth' });
                setIsOpen(false);
              }}
              className="text-2xl font-medium text-white hover:text-gold transition-colors"
            >
              Game Rules
            </button>
            
            <button 
              onClick={() => {
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                setIsOpen(false);
              }}
              className="text-2xl font-medium text-white hover:text-gold transition-colors"
            >
              Contact
            </button>
            
            <Link 
              to="/login" 
              className="text-2xl font-medium text-white hover:text-gold transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Login
            </Link>
            
            <Link 
              to="/signup" 
              className="text-2xl font-medium text-white hover:text-gold transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMenu;

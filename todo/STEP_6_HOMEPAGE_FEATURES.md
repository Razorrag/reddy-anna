# Step 6: Missing Homepage Features Implementation

## Goal
Implement all missing homepage features to match the legacy build functionality.

## Current State
- Homepage lacks navigation system with smooth scrolling
- No language selector for English/Hindi/Telugu support
- Missing game rules section with detailed Andar Bahar explanation
- No comprehensive About section with company information
- Missing Contact section with form and WhatsApp integration
- No complete footer with multiple sections
- Missing WhatsApp floating button for quick customer support
- No image slider fallback for video background
- Missing mobile hamburger menu for responsive navigation

## Target State
- Complete navigation header with Home, About, Game Rules, Contact, Login, SignUp links
- Smooth scrolling navigation with active state highlighting
- Language selector with English/Hindi/Telugu support and localStorage persistence
- Comprehensive Game Rules section with detailed explanations
- About section with company information and features
- Contact section with form and WhatsApp integration
- Complete footer with multiple columns (quick links, contact info, social media)
- WhatsApp floating button positioned in bottom-right corner
- Image slider as fallback for video background
- Responsive mobile navigation with hamburger menu

## Files to Modify/Create
- `client/src/pages/Homepage.tsx`
- `client/src/components/Navigation/Navigation.tsx`
- `client/src/components/LanguageSelector/LanguageSelector.tsx`
- `client/src/components/GameRules/GameRules.tsx`
- `client/src/components/About/About.tsx`
- `client/src/components/Contact/Contact.tsx`
- `client/src/components/Footer/Footer.tsx`
- `client/src/components/WhatsAppFloatButton/WhatsAppFloatButton.tsx`
- `client/src/components/ImageSlider/ImageSlider.tsx`
- `client/src/components/MobileMenu/MobileMenu.tsx`

## Detailed Changes

### 1. Create Navigation Component with Smooth Scrolling

```tsx
// client/src/components/Navigation/Navigation.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
```

### 2. Create Language Selector Component

```tsx
// client/src/components/LanguageSelector/LanguageSelector.tsx
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const LanguageSelector: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') || 'en';
    setSelectedLanguage(savedLanguage);
  }, []);

  // Update localStorage when language changes
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    localStorage.setItem('language', lang);
    
    // In a real implementation, you would update the UI language here
    // For now, we'll just store the preference
  };

  return (
    <div className="relative">
      <select
        value={selectedLanguage}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="bg-transparent text-white border border-gold rounded-full py-1.5 px-4 appearance-none focus:outline-none focus:ring-2 focus:ring-gold"
      >
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
        <option value="te">తెలుగు</option>
      </select>
    </div>
  );
};

export default LanguageSelector;
```

### 3. Create Game Rules Section

```tsx
// client/src/components/GameRules/GameRules.tsx
import React from 'react';

const GameRules: React.FC = () => {
  return (
    <section id="gamerules" className="py-20 bg-gradient-to-br from-gray-900 to-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-gold mb-12">Andar Bahar Rules</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-gray-800/50 p-8 rounded-xl backdrop-blur-sm border border-gray-700">
            <h3 className="text-2xl font-bold text-gold mb-6">How to Play</h3>
            <ul className="space-y-4 text-gray-200">
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>1. The game starts with one "Opening Card" dealt face up in the middle</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>2. Players place bets on either "Andar" or "Bahar" before the timer runs out</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>3. Cards are dealt alternately to "Andar" and "Bahar" sides</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>4. The game ends when a card matching the value of the Opening Card appears</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>5. If the matching card appears on the Andar side, Andar wins; vice versa for Bahar</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-800/50 p-8 rounded-xl backdrop-blur-sm border border-gray-700">
            <h3 className="text-2xl font-bold text-gold mb-6">Winning Conditions</h3>
            <ul className="space-y-4 text-gray-200">
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>Winning side gets 1:1 payout minus 5% commission</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>If the 5th card on either side matches the opening card, payout is 1:1</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>If the opening card appears on the 4th position or earlier, payout is 1:1</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-3">•</span>
                <span>Special payout for 5th card: 4:1 (before commission)</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 bg-gray-800/50 p-8 rounded-xl backdrop-blur-sm border border-gray-700">
          <h3 className="text-2xl font-bold text-gold mb-6">Betting Phases</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-gray-700/50 rounded-lg">
              <div className="text-3xl text-gold mb-3">Round 1</div>
              <p className="text-gray-200">Initial betting phase with 60 seconds timer</p>
            </div>
            <div className="text-center p-6 bg-gray-700/50 rounded-lg">
              <div className="text-3xl text-gold mb-3">Round 2</div>
              <p className="text-gray-200">Second betting phase with 30 seconds timer</p>
            </div>
            <div className="text-center p-6 bg-gray-700/50 rounded-lg">
              <div className="text-3xl text-gold mb-3">Final Draw</div>
              <p className="text-gray-200">Continuous card dealing until winner is found</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameRules;
```

### 4. Create Contact Section with Form and WhatsApp Integration

```tsx
// client/src/components/Contact/Contact.tsx
import React, { useState } from 'react';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitMessage('Thank you for your message! We will contact you soon.');
      setFormData({ name: '', email: '', mobile: '', message: '' });
      
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitMessage(''), 5000);
    }, 1000);
  };

  return (
    <section id="contact" className="py-20 bg-gradient-to-br from-black to-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-gold mb-12">Contact Us</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-gray-800/50 p-8 rounded-xl backdrop-blur-sm border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6">Send us a Message</h3>
            
            {submitMessage && (
              <div className="mb-6 p-4 bg-green-900/50 text-green-200 rounded-lg">
                {submitMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="name" className="block text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="email" className="block text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder="Enter your email"
                  />
                </div>
                
                <div>
                  <label htmlFor="mobile" className="block text-gray-300 mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    id="mobile"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold"
                    placeholder="Enter your mobile number"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="message" className="block text-gray-300 mb-2">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold"
                  placeholder="Enter your message"
                ></textarea>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gold text-black py-3 px-6 rounded-lg font-semibold hover:bg-yellow-400 transition-colors duration-200 disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
          
          {/* WhatsApp and Contact Info */}
          <div>
            <div className="bg-gray-800/50 p-8 rounded-xl backdrop-blur-sm border border-gray-700 mb-8">
              <h3 className="text-2xl font-bold text-white mb-6">Contact Information</h3>
              
              <div className="space-y-4 text-gray-300">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-black" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">Phone</div>
                    <div>+91 8686886632</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-black" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">Email</div>
                    <div>support@andarbahar.com</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center mr-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-black" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-white">Address</div>
                    <div>Hyderabad, Telangana, India</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* WhatsApp Button */}
            <a 
              href="https://wa.me/918686886632" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-semibold text-center transition-colors duration-200 flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.425 3.488" />
              </svg>
              Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
```

## Verification Steps
1. Create Navigation component with smooth scrolling functionality
2. Implement Language Selector with localStorage persistence
3. Create comprehensive Game Rules section with detailed explanations
4. Build Contact section with form and WhatsApp integration
5. Test all navigation links work properly
6. Verify language selector saves preference in localStorage
7. Test contact form submission functionality
8. Ensure WhatsApp button opens chat with correct number
9. Verify mobile responsive design works properly
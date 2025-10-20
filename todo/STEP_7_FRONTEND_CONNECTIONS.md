# Step 7: Frontend Issues - Missing CSS, Pages, and Connection Between Pages

## Goal
Address all frontend issues including missing CSS, missing pages, and ensure proper connection between all pages.

## Current State
- Multiple components still have legacy CSS imports that need removal
- Missing About section implementation
- Missing Footer component
- Missing WhatsApp float button
- Missing image slider as fallback for video background
- Missing mobile hamburger menu
- Navigation links not properly connected to page sections
- Missing comprehensive homepage with all required sections

## Target State
- All legacy CSS removed and replaced with Tailwind
- Complete About section with company information and features
- Proper Footer with multiple sections
- Functional WhatsApp floating button
- Image slider as fallback for video background
- Mobile-responsive hamburger menu
- All navigation links properly connected to sections
- Complete homepage with all required functionality

## Files to Modify/Create
- `client/src/components/About/About.tsx`
- `client/src/components/Footer/Footer.tsx`
- `client/src/components/WhatsAppFloatButton/WhatsAppFloatButton.tsx`
- `client/src/components/ImageSlider/ImageSlider.tsx`
- `client/src/components/MobileMenu/MobileMenu.tsx`
- `client/src/pages/Homepage.tsx` (complete implementation)
- `client/src/components/HeroSection/HeroSection.tsx`

## Detailed Changes

### 1. Create Complete Homepage Implementation

```tsx
// client/src/pages/Homepage.tsx
import React, { useState, useEffect } from 'react';
import Navigation from '../components/Navigation/Navigation';
import HeroSection from '../components/HeroSection/HeroSection';
import About from '../components/About/About';
import GameRules from '../components/GameRules/GameRules';
import Contact from '../components/Contact/Contact';
import Footer from '../components/Footer/Footer';
import WhatsAppFloatButton from '../components/WhatsAppFloatButton/WhatsAppFloatButton';
import LanguageSelector from '../components/LanguageSelector/LanguageSelector';

const Homepage: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Navigation */}
      <Navigation isScrolled={isScrolled} />
      
      {/* Language Selector - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* About Section */}
      <About />
      
      {/* Game Rules Section */}
      <GameRules />
      
      {/* Contact Section */}
      <Contact />
      
      {/* Footer */}
      <Footer />
      
      {/* WhatsApp Float Button */}
      <WhatsAppFloatButton />
    </div>
  );
};

export default Homepage;
```

### 2. Create About Section Component

```tsx
// client/src/components/About/About.tsx
import React from 'react';

const About: React.FC = () => {
  return (
    <section id="about" className="py-20 bg-gradient-to-br from-black to-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-bold text-center text-gold mb-12">About Us</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">Welcome to Andar Bahar Pro</h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              We are India's premier Andar Bahar gaming platform, dedicated to providing an authentic and 
              secure gaming experience. Our platform combines traditional Indian card game culture with 
              modern technology to create the ultimate Andar Bahar experience.
            </p>
            <p className="text-gray-300 mb-8 leading-relaxed">
              With years of experience in the gaming industry, we've created a platform that ensures 
              fair play, instant withdrawals, and 24/7 customer support. Our commitment to security 
              and transparency has made us the trusted choice for thousands of players across India.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-6 bg-gray-800/50 rounded-xl backdrop-blur-sm border border-gray-700">
                <div className="text-3xl text-gold font-bold mb-2">10K+</div>
                <div className="text-gray-300">Active Players</div>
              </div>
              <div className="text-center p-6 bg-gray-800/50 rounded-xl backdrop-blur-sm border border-gray-700">
                <div className="text-3xl text-gold font-bold mb-2">24/7</div>
                <div className="text-gray-300">Support</div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 p-8 rounded-xl backdrop-blur-sm border border-gray-700">
            <h3 className="text-2xl font-bold text-gold mb-6">Our Features</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div className="bg-gold rounded-full p-1.5 mr-4 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-300">Real-time dealer streaming</span>
              </li>
              <li className="flex items-start">
                <div className="bg-gold rounded-full p-1.5 mr-4 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-300">Instant deposits & withdrawals</span>
              </li>
              <li className="flex items-start">
                <div className="bg-gold rounded-full p-1.5 mr-4 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-300">Secure payment methods</span>
              </li>
              <li className="flex items-start">
                <div className="bg-gold rounded-full p-1.5 mr-4 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-300">24/7 customer support</span>
              </li>
              <li className="flex items-start">
                <div className="bg-gold rounded-full p-1.5 mr-4 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-300">Fair and transparent gameplay</span>
              </li>
              <li className="flex items-start">
                <div className="bg-gold rounded-full p-1.5 mr-4 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-gray-300">Mobile-optimized experience</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold text-gold mb-8">Why Choose Us?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-gray-800/50 rounded-xl backdrop-blur-sm border border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-r from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Secure & Safe</h4>
              <p className="text-gray-300">Bank-level security with encrypted transactions and verified payment methods</p>
            </div>
            
            <div className="p-8 bg-gray-800/50 rounded-xl backdrop-blur-sm border border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-r from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.523 1.353c.39.437.842.648 1.34.648.498 0 .95-.211 1.34-.648.437-.483.712-1.126.712-1.85v-1.941c.622-.117 1.196-.342 1.676-.662C13.398 9.766 14 8.991 14 8c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 5.092V5z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Fast Payouts</h4>
              <p className="text-gray-300">Instant withdrawals processed within minutes with various payment options</p>
            </div>
            
            <div className="p-8 bg-gray-800/50 rounded-xl backdrop-blur-sm border border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-r from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-black" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-white mb-4">Transparent Gaming</h4>
              <p className="text-gray-300">Real-time card dealing with live streaming and fair algorithm</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
```

### 3. Create Footer Component

```tsx
// client/src/components/Footer/Footer.tsx
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-900 to-black border-t border-gray-800 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-bold text-gold mb-6">ANDAR BAHAR</h3>
            <p className="text-gray-400 mb-6">
              India's premier Andar Bahar gaming platform offering an authentic and secure gaming experience.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-gold transition-colors duration-200">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-gold transition-colors duration-200">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-gold transition-colors duration-200">
                <span className="sr-only">Twitter</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold text-white mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li><a href="#hero" className="text-gray-400 hover:text-gold transition-colors duration-200">Home</a></li>
              <li><a href="#about" className="text-gray-400 hover:text-gold transition-colors duration-200">About Us</a></li>
              <li><a href="#gamerules" className="text-gray-400 hover:text-gold transition-colors duration-200">Game Rules</a></li>
              <li><a href="#contact" className="text-gray-400 hover:text-gold transition-colors duration-200">Contact</a></li>
              <li><a href="/login" className="text-gray-400 hover:text-gold transition-colors duration-200">Login</a></li>
              <li><a href="/signup" className="text-gray-400 hover:text-gold transition-colors duration-200">Sign Up</a></li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold text-white mb-6">Contact Info</h3>
            <ul className="space-y-3 text-gray-400">
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gold mr-3 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>Hyderabad, Telangana, India</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gold mr-3 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span>+91 8686886632</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gold mr-3 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>support@andarbahar.com</span>
              </li>
            </ul>
          </div>
          
          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold text-white mb-6">Legal</h3>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-gold transition-colors duration-200">Terms of Service</a></li>
              <li><a href="#" className="text-gray-400 hover:text-gold transition-colors duration-200">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-gold transition-colors duration-200">Responsible Gaming</a></li>
              <li><a href="#" className="text-gray-400 hover:text-gold transition-colors duration-200">AML Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-gold transition-colors duration-200">KYC Verification</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-gray-800 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Andar Bahar Pro. All rights reserved. Please gamble responsibly.
          </p>
          <p className="text-gray-600 text-xs mt-2">
            This is a game of skill and involves substantial risk. Only play with money you can afford to lose.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
```

### 4. Create WhatsApp Float Button Component

```tsx
// client/src/components/WhatsAppFloatButton/WhatsAppFloatButton.tsx
import React from 'react';

const WhatsAppFloatButton: React.FC = () => {
  return (
    <a 
      href="https://wa.me/918686886632" 
      target="_blank" 
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.425 3.488" />
      </svg>
    </a>
  );
};

export default WhatsAppFloatButton;
```

### 5. Create Hero Section Component

```tsx
// client/src/components/HeroSection/HeroSection.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection: React.FC = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Video or Image Slider */}
      <div className="absolute inset-0 z-0">
        {/* Placeholder for video background */}
        <div className="w-full h-full bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl font-bold text-gold mb-4">ANDAR BAHAR</div>
            <div className="text-xl text-white mb-8">India's Premier Card Game Experience</div>
          </div>
        </div>
      </div>
      
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 text-center">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Play <span className="text-gold">Andar Bahar</span> Live
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto">
          Experience the thrill of India's favorite card game with live dealers, instant withdrawals, and secure gaming
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            to="/login" 
            className="px-8 py-4 bg-gold text-black text-lg font-bold rounded-full hover:bg-yellow-400 transition-colors duration-200 shadow-lg"
          >
            Start Playing
          </Link>
          <button 
            onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-4 bg-transparent border-2 border-gold text-gold text-lg font-bold rounded-full hover:bg-gold/10 transition-colors duration-200"
          >
            Learn More
          </button>
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
```

## Verification Steps
1. Create complete Homepage component with all sections connected
2. Implement About section with company information and features
3. Build Footer component with multiple sections (company info, quick links, contact info, legal)
4. Create WhatsApp floating button component positioned correctly
5. Build Hero section with call-to-action buttons
6. Test all navigation links properly connect to their respective sections
7. Verify mobile responsiveness of all components
8. Ensure all components use Tailwind CSS with no legacy imports
9. Test page transitions and smooth scrolling functionality
10. Verify all sections are properly connected and visible
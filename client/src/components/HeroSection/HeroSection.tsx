import React from 'react';
import { Link } from 'wouter';
import { getButtonClass, getGradientClass } from '../../lib/theme-utils';

const HeroSection: React.FC = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Video or Image Slider */}
      <div className="absolute inset-0 z-0">
        {/* Placeholder for video background */}
        <div className={`w-full h-full ${getGradientClass()} flex items-center justify-center`}>
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
            to="/game"
            className={getButtonClass('primary')}
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

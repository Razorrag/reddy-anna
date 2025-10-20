import React, { useState, useEffect } from 'react';

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  image: string;
}

const ImageSlider: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const slides: Slide[] = [
    {
      id: 1,
      title: "REDDY ANNA",
      subtitle: "Ultimate Andar Bahar Experience",
      image: "/hero-images/slide1.jpg"
    },
    {
      id: 2,
      title: "LIVE GAMING",
      subtitle: "Real-time Andar Bahar with Live Dealers",
      image: "/hero-images/slide2.jpg"
    },
    {
      id: 3,
      title: "BIG WINS",
      subtitle: "Massive Payouts and Exciting Tournaments",
      image: "/hero-images/slide3.jpg"
    },
    {
      id: 4,
      title: "SECURE PLAY",
      subtitle: "Licensed & Regulated Gaming Platform",
      image: "/hero-images/slide4.jpg"
    }
  ];

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Slides Container */}
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Background Image with Overlay */}
            <div className="absolute inset-0">
              <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-red-900/20"></div>
              <div className="absolute inset-0 bg-black/60"></div>
            </div>
            
            {/* Fallback gradient background if image not available */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-purple-900/20 to-red-900/20">
              {/* Animated background elements */}
              <div className="absolute top-20 left-10 w-32 h-32 bg-gold/10 rounded-full blur-xl animate-pulse"></div>
              <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
              <div className="absolute top-1/2 right-20 w-24 h-24 bg-red-500/10 rounded-full blur-xl animate-pulse delay-500"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10 h-full flex items-center justify-center px-4">
              <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-6xl md:text-8xl font-bold text-gold mb-6 drop-shadow-2xl">
                  {slide.title}
                </h1>
                <p className="text-xl md:text-2xl text-white/90 mb-8 font-light">
                  {slide.subtitle}
                </p>
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <a
                    href="/game"
                    className="bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500 text-lg px-8 py-4 rounded-full font-semibold shadow-2xl hover:shadow-gold/30 transition-all duration-300 inline-flex items-center"
                  >
                    <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Play Now
                  </a>
                  <a
                    href="/login"
                    className="border-2 border-gold text-gold hover:bg-gold hover:text-black text-lg px-8 py-4 rounded-full font-semibold transition-all duration-300 inline-block"
                  >
                    Sign In
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
        aria-label="Previous slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
        aria-label="Next slide"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              index === currentSlide
                ? 'bg-gold w-8'
                : 'bg-white/50 hover:bg-white/70'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Auto-play Toggle */}
      <button
        onClick={() => setIsAutoPlaying(!isAutoPlaying)}
        className="absolute top-4 right-4 z-20 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
        aria-label={isAutoPlaying ? "Pause auto-play" : "Start auto-play"}
      >
        {isAutoPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default ImageSlider;

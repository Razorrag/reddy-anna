import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, Zap } from "lucide-react";

// Import new components
import Navigation from "@/components/Navigation/Navigation";
import LanguageSelector from "@/components/LanguageSelector/LanguageSelector";
import About from "@/components/About/About";
import GameRules from "@/components/GameRules/GameRules";
import Contact from "@/components/Contact/Contact";
import Footer from "@/components/Footer/Footer";
import WhatsAppFloatButton from "@/components/WhatsAppFloatButton/WhatsAppFloatButton";

export default function Index() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 via-blue-900 to-indigo-900">
      {/* Navigation Header */}
      <Navigation isScrolled={isScrolled} />
      
      {/* Language Selector - Fixed Top Right */}
      <div className="fixed top-4 right-4 z-40">
        <LanguageSelector />
      </div>

      {/* Hero Section */}
      <section id="hero" className="relative min-h-screen flex items-center justify-center">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-violet-900">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-96 h-96 bg-gold/30 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-5xl mx-auto px-4 py-20">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-gold mb-6 drop-shadow-2xl animate-fade-in">
            REDDY ANNA
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/90 mb-4 font-light">
            India's Premier Andar Bahar Platform
          </p>
          <p className="text-base sm:text-lg md:text-xl text-white/70 mb-12 max-w-2xl mx-auto">
            Experience the thrill of live Andar Bahar gaming with real dealers, secure transactions, and massive payouts
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
            <a
              href="/game"
              className="w-full sm:w-auto bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-yellow-500 hover:to-gold text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 rounded-full font-semibold shadow-2xl hover:shadow-gold/50 transition-all duration-300 inline-flex items-center justify-center hover:scale-105"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Play Now
            </a>
            <a
              href="/login"
              className="w-full sm:w-auto border-2 border-gold text-gold hover:bg-gold hover:text-black text-base sm:text-lg px-8 sm:px-10 py-3 sm:py-4 rounded-full font-semibold transition-all duration-300 inline-flex items-center justify-center hover:scale-105"
            >
              Sign In
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <About />

      {/* Game Rules Section */}
      <GameRules />

      {/* Features Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-purple-950 via-indigo-950 to-violet-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gold mb-8 sm:mb-12">Why Choose Reddy Anna?</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:border-gold/50 hover:shadow-lg hover:shadow-gold/10 transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-black" />
                </div>
                <CardTitle className="text-gold text-lg sm:text-xl">Live Gaming</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400 text-center text-sm sm:text-base">
                  Real-time Andar Bahar games with live dealers and instant results
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:border-gold/50 hover:shadow-lg hover:shadow-gold/10 transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-black" />
                </div>
                <CardTitle className="text-gold text-lg sm:text-xl">Multiplayer</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400 text-center text-sm sm:text-base">
                  Play with thousands of players worldwide in real-time betting rooms
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-gold/30 backdrop-blur-sm hover:border-gold/50 hover:shadow-lg hover:shadow-gold/10 transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-black" />
                </div>
                <CardTitle className="text-gold text-lg sm:text-xl">Big Wins</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-400 text-center text-sm sm:text-base">
                  Massive payouts and exciting tournaments with huge prize pools
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-12 sm:mt-16">
            <div className="text-center p-4 bg-black/40 border border-gold/20 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-gold mb-1 sm:mb-2">100K+</div>
              <div className="text-gray-300 text-xs sm:text-base">Active Players</div>
            </div>
            <div className="text-center p-4 bg-black/40 border border-gold/20 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-gold mb-1 sm:mb-2">24/7</div>
              <div className="text-gray-300 text-xs sm:text-base">Live Games</div>
            </div>
            <div className="text-center p-4 bg-black/40 border border-gold/20 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-gold mb-1 sm:mb-2">₹10Cr+</div>
              <div className="text-gray-300 text-xs sm:text-base">Daily Winnings</div>
            </div>
            <div className="text-center p-4 bg-black/40 border border-gold/20 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-gold mb-1 sm:mb-2">99.9%</div>
              <div className="text-gray-300 text-xs sm:text-base">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <Contact />

      {/* Footer */}
      <Footer />

      {/* WhatsApp Floating Button */}
      <WhatsAppFloatButton />

      {/* Floating Elements for visual appeal */}
      <div className="fixed top-20 left-10 w-32 h-32 bg-gold/10 rounded-full blur-xl animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-20 right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000 pointer-events-none"></div>
      <div className="fixed top-1/2 right-20 w-24 h-24 bg-red-500/10 rounded-full blur-xl animate-pulse delay-500 pointer-events-none"></div>
    </div>
  );
}

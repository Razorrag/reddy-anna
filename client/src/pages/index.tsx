import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, Zap } from "lucide-react";

// Import new components
import Navigation from "@/components/Navigation/Navigation";
import LanguageSelector from "@/components/LanguageSelector/LanguageSelector";
import ImageSlider from "@/components/ImageSlider/ImageSlider";
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

      {/* Hero Section with Image Slider */}
      <section id="hero">
        <ImageSlider />
      </section>

      {/* About Section */}
      <About />

      {/* Game Rules Section */}
      <GameRules />

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-br from-violet-800/50 via-blue-800/50 to-indigo-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center text-gold mb-12">Why Choose Reddy Anna?</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-black" />
                </div>
                <CardTitle className="text-gold text-xl">Live Gaming</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80 text-center">
                  Real-time Andar Bahar games with live dealers and instant results
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-black" />
                </div>
                <CardTitle className="text-gold text-xl">Multiplayer</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80 text-center">
                  Play with thousands of players worldwide in real-time betting rooms
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-black" />
                </div>
                <CardTitle className="text-gold text-xl">Big Wins</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80 text-center">
                  Massive payouts and exciting tournaments with huge prize pools
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-gold mb-2">100K+</div>
              <div className="text-gray-300">Active Players</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gold mb-2">24/7</div>
              <div className="text-gray-300">Live Games</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gold mb-2">₹10Cr+</div>
              <div className="text-gray-300">Daily Winnings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gold mb-2">99.9%</div>
              <div className="text-gray-300">Uptime</div>
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

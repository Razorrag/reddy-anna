import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Users, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Index() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-purple-900/20 to-red-900/20">
      {/* Hero Section - matches legacy design */}
      <div className="relative min-h-screen flex items-center justify-center px-4">
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-30"
          >
            <source src="/hero images/uhd_30fps.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        {/* Content */}
        <div className={cn(
          "relative z-10 text-center max-w-4xl mx-auto transition-all duration-1000",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          {/* Main Title */}
          <h1 className="text-6xl md:text-8xl font-bold text-gold mb-6 drop-shadow-2xl">
            REDDY ANNA
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/90 mb-8 font-light">
            Ultimate Andar Bahar Gaming Experience
          </p>

          {/* Description */}
          <p className="text-lg text-white/80 mb-12 max-w-2xl mx-auto leading-relaxed">
            Experience the thrill of live Andar Bahar with real-time betting,
            stunning visuals, and seamless gameplay. Join thousands of players
            in the most exciting card game platform.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Link to="/player-game">
              <Button
                size="lg"
                className="bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500 text-lg px-8 py-4 h-auto font-semibold shadow-2xl hover:shadow-gold/30 transition-all duration-300"
              >
                <Play className="w-6 h-6 mr-3" />
                Play Now
              </Button>
            </Link>

            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-gold text-gold hover:bg-gold hover:text-black text-lg px-8 py-4 h-auto font-semibold transition-all duration-300"
              >
                Sign In
              </Button>
            </Link>
            
            <Link to="/signup">
              <Button
                size="lg"
                variant="secondary"
                className="border-2 border-purple-500 text-purple-300 hover:bg-purple-500 hover:text-white text-lg px-8 py-4 h-auto font-semibold transition-all duration-300"
              >
                Sign Up
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
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
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gold/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-purple-500/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-20 w-24 h-24 bg-red-500/10 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>
    </div>
  );
}

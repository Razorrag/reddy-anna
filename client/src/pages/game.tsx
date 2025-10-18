import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Users,
  Clock,
  TrendingUp,
  Star,
  Zap,
  Crown,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveGame {
  id: string;
  name: string;
  players: number;
  maxPlayers: number;
  status: 'waiting' | 'active' | 'completed';
  prize: number;
  duration: string;
  entryFee: number;
}

export default function Game() {
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate loading live games
    setTimeout(() => {
      setLiveGames([
        {
          id: '1',
          name: 'Premium Andar Bahar',
          players: 45,
          maxPlayers: 50,
          status: 'active',
          prize: 250000,
          duration: '30 min',
          entryFee: 1000
        },
        {
          id: '2',
          name: 'High Stakes Tournament',
          players: 23,
          maxPlayers: 30,
          status: 'waiting',
          prize: 500000,
          duration: '45 min',
          entryFee: 5000
        },
        {
          id: '3',
          name: 'Quick Match',
          players: 12,
          maxPlayers: 20,
          status: 'active',
          prize: 50000,
          duration: '15 min',
          entryFee: 500
        },
        {
          id: '4',
          name: 'VIP Exclusive',
          players: 8,
          maxPlayers: 10,
          status: 'waiting',
          prize: 1000000,
          duration: '60 min',
          entryFee: 10000
        }
      ]);
      setIsLoaded(true);
    }, 1000);
  }, []);

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">Live</Badge>;
      case 'waiting':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Waiting</Badge>;
      case 'completed':
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Completed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-purple-900/20 to-red-900/20 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gold mb-4">Live Games</h1>
          <p className="text-xl text-white/80 mb-8">
            Join exciting Andar Bahar games and tournaments
          </p>
        </div>
      </div>

      {/* Quick Play Options */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className={cn(
          "grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-1000",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300 group cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-gold to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-10 h-10 text-black" />
              </div>
              <CardTitle className="text-gold text-2xl">Quick Match</CardTitle>
              <CardDescription className="text-white/80">
                Jump into a game instantly
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500 text-lg py-3">
                <Play className="w-5 h-5 mr-2" />
                Play Now
              </Button>
              <p className="text-sm text-white/60 mt-2">Free to play • Instant entry</p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300 group cursor-pointer border-2">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Crown className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-gold text-2xl">Premium</CardTitle>
              <CardDescription className="text-white/80">
                High stakes games with big prizes
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-400 hover:to-pink-500 text-lg py-3">
                <Star className="w-5 h-5 mr-2" />
                Join Premium
              </Button>
              <p className="text-sm text-white/60 mt-2">₹1000+ entry • Higher rewards</p>
            </CardContent>
          </Card>

          <Card className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300 group cursor-pointer">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-gold text-2xl">Tournaments</CardTitle>
              <CardDescription className="text-white/80">
                Compete for massive prize pools
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500 text-lg py-3">
                <TrendingUp className="w-5 h-5 mr-2" />
                View Tournaments
              </Button>
              <p className="text-sm text-white/60 mt-2">Weekly events • Huge prizes</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live Games Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gold">Live Games</h2>
          <div className="flex items-center gap-2 text-white/80">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>{liveGames.filter(g => g.status === 'active').length} games live</span>
          </div>
        </div>

        <div className={cn(
          "grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-1000 delay-300",
          isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          {liveGames.map((game) => (
            <Card key={game.id} className="bg-black/50 border-gold/30 backdrop-blur-sm hover:bg-black/70 transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-gold mb-1">{game.name}</CardTitle>
                    <CardDescription className="text-white/80">
                      {game.players}/{game.maxPlayers} players • {game.duration}
                    </CardDescription>
                  </div>
                  {getStatusBadge(game.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gold">{formatCurrency(game.prize)}</div>
                      <div className="text-sm text-white/60">Prize Pool</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{formatCurrency(game.entryFee)}</div>
                      <div className="text-sm text-white/60">Entry Fee</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex -space-x-2">
                    {[...Array(Math.min(game.players, 5))].map((_, i) => (
                      <div key={i} className="w-8 h-8 bg-gradient-to-br from-gold to-yellow-600 rounded-full border-2 border-black flex items-center justify-center text-black font-bold text-sm">
                        {i + 1}
                      </div>
                    ))}
                    {game.players > 5 && (
                      <div className="w-8 h-8 bg-black/50 rounded-full border-2 border-gold/30 flex items-center justify-center text-gold font-bold text-sm">
                        +{game.players - 5}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-black/30 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-gold to-yellow-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(game.players / game.maxPlayers) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <Button
                  className={cn(
                    "w-full text-lg py-3 font-semibold transition-all duration-300",
                    game.status === 'active'
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-400 hover:to-emerald-500"
                      : "bg-gradient-to-r from-gold to-yellow-600 text-black hover:from-gold-light hover:to-yellow-500"
                  )}
                  disabled={game.status === 'completed'}
                >
                  {game.status === 'active' ? (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Join Game
                    </>
                  ) : game.status === 'waiting' ? (
                    <>
                      <Clock className="w-5 h-5 mr-2" />
                      Join Waiting Room
                    </>
                  ) : (
                    <>
                      <Award className="w-5 h-5 mr-2" />
                      View Results
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Game Modes Info */}
      <div className="max-w-7xl mx-auto">
        <Card className="bg-black/50 border-gold/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-gold text-center">Game Modes</CardTitle>
            <CardDescription className="text-white/80 text-center">
              Choose your preferred way to play Andar Bahar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gold mb-2">Classic Mode</h3>
                <p className="text-white/80">
                  Traditional Andar Bahar with standard rules and betting options
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gold mb-2">Tournament Mode</h3>
                <p className="text-white/80">
                  Compete against other players in structured tournaments with rankings
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gold mb-2">Practice Mode</h3>
                <p className="text-white/80">
                  Learn and improve your skills with unlimited practice games
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

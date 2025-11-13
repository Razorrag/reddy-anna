import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Trophy, 
  Target, 
  TrendingUp,
  Activity,
  DollarSign,
  Gift,
  Users
} from "lucide-react";
import { formatCurrency, getStatusBadgeClass } from "@/services/userAdminService";
import { AdminUser } from "@/types/game";

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUser | null;
}

interface GameHistoryItem {
  id: string;
  gameId: string;
  openingCard: string;
  winner: 'andar' | 'bahar';
  yourBet: {
    side: 'andar' | 'bahar';
    amount: number;
    round: number;
  } | null;
  result: 'win' | 'loss' | 'no_bet';
  payout: number;
  totalCards: number;
  round: number;
  createdAt: string;
}

interface BonusHistoryItem {
  id: string;
  type: 'deposit_bonus' | 'referral_bonus' | 'transaction';
  depositAmount?: number;
  bonusAmount: number;
  bonusPercentage?: number;
  status?: string;
  referredUsername?: string;
  action?: string;
  description?: string;
  createdAt: string;
}

export default function UserDetailsModal({
  isOpen,
  onClose,
  user,
}: UserDetailsModalProps) {
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [bonusHistory, setBonusHistory] = useState<BonusHistoryItem[]>([]);
  const [isLoadingBonusHistory, setIsLoadingBonusHistory] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadGameHistory();
      loadBonusHistory();
    }
  }, [isOpen, user]);

  const loadGameHistory = async () => {
    if (!user) return;
    
    setIsLoadingHistory(true);
    try {
      // Fetch real game history from API
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${user.id}/game-history?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch game history');
      }

      const data = await response.json();
      
      if (data.success && data.data?.games) {
        // Transform API response to match GameHistoryItem interface
        const transformedHistory: GameHistoryItem[] = data.data.games.map((game: any) => ({
          id: game.id,
          gameId: game.gameId,
          openingCard: game.openingCard,
          winner: game.winner,
          yourBet: game.yourBet,
          result: game.result,
          payout: game.payout,
          totalCards: game.totalCards,
          round: game.round,
          createdAt: game.createdAt
        }));
        setGameHistory(transformedHistory);
      } else {
        setGameHistory([]);
      }
    } catch (error) {
      console.error('Failed to load game history:', error);
      setGameHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadBonusHistory = async () => {
    if (!user) return;
    
    setIsLoadingBonusHistory(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${user.id}/bonus-history?limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bonus history');
      }

      const data = await response.json();
      
      if (data.success && data.data?.allHistory) {
        setBonusHistory(data.data.allHistory);
      } else {
        setBonusHistory([]);
      }
    } catch (error) {
      console.error('Failed to load bonus history:', error);
      setBonusHistory([]);
    } finally {
      setIsLoadingBonusHistory(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWinRate = () => {
    if (!user || user?.gamesPlayed === 0) return 0;
    return Math.round((user.gamesWon / user.gamesPlayed) * 100);
  };

  const getNetProfit = () => {
    if (!user) return 0;
    return user.totalWinnings - user.totalLosses;
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] bg-purple-950/95 border-purple-400/30 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <User className="w-5 h-5" />
            User Details
          </DialogTitle>
          <DialogDescription className="text-purple-200">
            Complete information and activity for {user.fullName}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-purple-900/50 border-purple-400/30">
            <TabsTrigger value="overview" className="text-purple-200 data-[state=active]:text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="statistics" className="text-purple-200 data-[state=active]:text-white">
              Statistics
            </TabsTrigger>
            <TabsTrigger value="history" className="text-purple-200 data-[state=active]:text-white">
              Game History
            </TabsTrigger>
            <TabsTrigger value="bonus" className="text-purple-200 data-[state=active]:text-white">
              Bonus & Referral
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* User Information Card */}
            <Card className="bg-purple-950/60 border-purple-400/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-4 h-4" />
                  User Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-purple-300" />
                      <div>
                        <p className="text-purple-300 text-sm">Full Name</p>
                        <p className="text-white font-medium">{user.fullName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-purple-300" />
                      <div>
                        <p className="text-purple-300 text-sm">Phone Number</p>
                        <p className="text-white font-medium">{user.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-purple-300" />
                      <div>
                        <p className="text-purple-300 text-sm">Email</p>
                        <p className="text-white font-medium">N/A</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Activity className="w-4 h-4 text-purple-300" />
                      <div>
                        <p className="text-purple-300 text-sm">Status</p>
                        <Badge className={getStatusBadgeClass(user.status)}>
                          {user.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-purple-300" />
                      <div>
                        <p className="text-purple-300 text-sm">Member Since</p>
                        <p className="text-white font-medium">{formatDate(user.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-4 h-4 text-purple-300" />
                      <div>
                        <p className="text-purple-300 text-sm">Current Balance</p>
                        <p className="text-white font-bold text-lg">{formatCurrency(user.balance)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-purple-950/60 border-purple-400/30">
                <CardContent className="p-4 text-center">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                  <p className="text-2xl font-bold text-white">{user.gamesPlayed}</p>
                  <p className="text-purple-300 text-sm">Games Played</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-950/60 border-purple-400/30">
                <CardContent className="p-4 text-center">
                  <Target className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-2xl font-bold text-white">{user.gamesWon}</p>
                  <p className="text-purple-300 text-sm">Games Won</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-950/60 border-purple-400/30">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <p className="text-2xl font-bold text-white">{getWinRate()}%</p>
                  <p className="text-purple-300 text-sm">Win Rate</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-950/60 border-purple-400/30">
                <CardContent className="p-4 text-center">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                  <p className="text-2xl font-bold text-white">{formatCurrency(getNetProfit())}</p>
                  <p className="text-purple-300 text-sm">Net Profit</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-purple-950/60 border-purple-400/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    Winnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-purple-300">Total Winnings:</span>
                      <span className="text-green-400 font-bold">{formatCurrency(user.totalWinnings)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-300">Total Losses:</span>
                      <span className="text-red-400 font-bold">{formatCurrency(user.totalLosses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-300">Net Profit:</span>
                      <span className={`font-bold ${getNetProfit() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(getNetProfit())}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-purple-950/60 border-purple-400/30">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-purple-300">Games Played:</span>
                      <span className="text-white font-bold">{user.gamesPlayed}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-300">Games Won:</span>
                      <span className="text-white font-bold">{user.gamesWon}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-300">Win Rate:</span>
                      <span className="text-white font-bold">{getWinRate()}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="bg-purple-950/60 border-purple-400/30">
              <CardHeader>
                <CardTitle className="text-white">Recent Game History</CardTitle>
                <CardDescription className="text-purple-200">
                  Last 10 games played by this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="text-center py-8">
                    <p className="text-purple-300">Loading game history...</p>
                  </div>
                ) : gameHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-purple-300">No game history available</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-purple-400/20">
                        <TableHead className="text-purple-200">Date</TableHead>
                        <TableHead className="text-purple-200">Game</TableHead>
                        <TableHead className="text-purple-200">Your Bet</TableHead>
                        <TableHead className="text-purple-200">Result</TableHead>
                        <TableHead className="text-purple-200">Payout</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gameHistory.map((game: GameHistoryItem) => (
                        <TableRow key={game.id} className="border-purple-400/10">
                          <TableCell className="text-purple-300">
                            {formatDate(game.createdAt)}
                          </TableCell>
                          <TableCell className="text-white">
                            {game.openingCard} - R{game.round}
                          </TableCell>
                          <TableCell className="text-white">
                            {game.yourBet ? (
                              <div>
                                <span className="capitalize">{game.yourBet.side}</span>
                                <span className="text-purple-300 ml-2">
                                  {formatCurrency(game.yourBet.amount)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-purple-300">No bet</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                game.result === 'win' 
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                  : game.result === 'loss'
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                              }
                            >
                              {game.result}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white font-bold">
                            {formatCurrency(game.payout)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bonus" className="space-y-4">
            <Card className="bg-purple-950/60 border-purple-400/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Bonus & Referral History
                </CardTitle>
                <CardDescription className="text-purple-200">
                  Complete bonus and referral history for this user
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBonusHistory ? (
                  <div className="text-center py-8">
                    <p className="text-purple-300">Loading bonus history...</p>
                  </div>
                ) : bonusHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-purple-300">No bonus or referral history available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bonusHistory.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 bg-purple-950/40 rounded-lg border border-purple-400/20"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {item.type === 'deposit_bonus' && (
                                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                  Deposit Bonus
                                </Badge>
                              )}
                              {item.type === 'referral_bonus' && (
                                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                  Referral Bonus
                                </Badge>
                              )}
                              {item.type === 'transaction' && (
                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                  Transaction
                                </Badge>
                              )}
                              {item.status && (
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                  {item.status}
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-white text-sm mb-1">{item.description}</p>
                            )}
                            {item.referredUsername && (
                              <p className="text-purple-300 text-sm mb-1">
                                Referred User: {item.referredUsername}
                              </p>
                            )}
                            {item.depositAmount && (
                              <p className="text-purple-300 text-sm mb-1">
                                Deposit: {formatCurrency(item.depositAmount)}
                                {item.bonusPercentage && ` (${item.bonusPercentage}%)`}
                              </p>
                            )}
                            <p className="text-purple-400 text-xs">
                              {formatDate(item.createdAt)}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-lg font-bold text-green-400">
                              +{formatCurrency(item.bonusAmount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
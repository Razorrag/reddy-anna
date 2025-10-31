import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit3, Users, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';

interface Bet {
  id: string;
  userId: string;
  userPhone: string;
  userName: string;
  gameId: string;
  round: string;
  side: 'andar' | 'bahar';
  amount: number;
  status: string;
  createdAt: string;
}

interface BetUpdateForm {
  betId: string;
  userId: string;
  currentSide: 'andar' | 'bahar';
  currentAmount: number;
  currentRound: string;
  newSide: 'andar' | 'bahar';
  newAmount: number;
  reason: string;
}

const BetMonitoringDashboard: React.FC = () => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [updateForm, setUpdateForm] = useState<BetUpdateForm>({
    betId: '',
    userId: '',
    currentSide: 'andar',
    currentAmount: 0,
    currentRound: '1',
    newSide: 'andar',
    newAmount: 0,
    reason: ''
  });
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [gameId, setGameId] = useState<string>('');
  
  const { sendWebSocketMessage } = useWebSocket();

  const fetchBets = useCallback(async () => {
    try {
      setLoading(true);
      // If gameId is provided, fetch bets for that specific game
      if (gameId) {
        const result = await apiClient.get(`/admin/games/${gameId}/bets`) as any;
        if (result.success && result.data) {
          setBets(result.data || []);
        } else {
          console.error('Failed to fetch bets');
        }
      } else {
        // Otherwise, fetch all active/recent bets
        const result = await apiClient.get(`/admin/bets/all?limit=200`) as any;
        if (result.success && result.data) {
          setBets(result.data || []);
        } else {
          console.error('Failed to fetch bets');
        }
      }
    } catch (error) {
      console.error('Error fetching bets:', error);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  const handleSearchBets = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({ phone: searchTerm });
      if (gameId) params.append('gameId', gameId);
      
      const result = await apiClient.get(`/admin/search-bets?${params}`) as any;
      if (result.success && result.data) {
        setBets(result.data || []);
      } else {
        console.error('Failed to search bets');
      }
    } catch (error) {
      console.error('Error searching bets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBetUpdate = async () => {
    if (!updateForm.reason.trim()) {
      alert('Please provide a reason for the bet update');
      return;
    }
    
    try {
      const result = await apiClient.patch(`/admin/bets/${updateForm.betId}`, {
        side: updateForm.newSide,
        amount: updateForm.newAmount,
        round: updateForm.currentRound,
        reason: updateForm.reason
      }) as any;
      
      if (result.success) {
        console.log('Bet updated successfully:', result);
        setShowUpdateDialog(false);
        fetchBets(); // Refresh the bets list
      } else {
        console.error('Failed to update bet');
      }
    } catch (error) {
      console.error('Error updating bet:', error);
    }
  };

  const openUpdateDialog = (bet: Bet) => {
    setSelectedBet(bet);
    setUpdateForm({
      betId: bet.id,
      userId: bet.userId,
      currentSide: bet.side,
      currentAmount: bet.amount,
      currentRound: bet.round,
      newSide: bet.side,
      newAmount: bet.amount,
      reason: ''
    });
    setShowUpdateDialog(true);
  };

  useEffect(() => {
    // Fetch bets on mount and when gameId changes
    fetchBets();
    
    // Set up auto-refresh every 5 seconds
    const interval = setInterval(fetchBets, 5000);
    
    return () => clearInterval(interval);
  }, [gameId, fetchBets]);

  // Listen for WebSocket updates
  useEffect(() => {
    const handleBetUpdate = (event: CustomEvent) => {
      // Handle real-time bet updates
      console.log('Real-time bet update received:', event.detail);
      fetchBets(); // Refresh to show the update
    };
    
    window.addEventListener('admin_bet_update', handleBetUpdate as EventListener);
    
    return () => {
      window.removeEventListener('admin_bet_update', handleBetUpdate as EventListener);
    };
  }, [fetchBets]);

  const filteredBets = bets.filter(bet => 
    bet.userPhone.includes(searchTerm) || 
    bet.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="bet-monitoring-dashboard">
      <Card className="bg-purple-950/60 border-purple-400/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="h-5 w-5" />
            Live Bet Monitoring
          </CardTitle>
          <CardDescription className="text-purple-200">
            Monitor and manage live bets in real-time. Showing all bets {gameId ? `for game ${gameId}` : 'from current game and recent bets'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="gameId" className="text-purple-200">Game ID</Label>
              <Input
                id="gameId"
                placeholder="Enter game ID to monitor"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                className="bg-purple-900/50 border-purple-400/30 text-white"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="searchPhone" className="text-purple-200">Search by Phone</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-200 w-4 h-4" />
                <Input
                  id="searchPhone"
                  placeholder="Enter phone number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-purple-900/50 border-purple-400/30 text-white placeholder:text-purple-300/50"
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearchBets} className="w-full bg-purple-600 hover:bg-purple-700">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              <span className="ml-2 text-purple-200">Loading bets...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBets.length === 0 ? (
                <div className="text-center py-8 text-purple-200">
                  <Users className="h-12 w-12 mx-auto text-purple-400 mb-2" />
                  <p>No bets found.{gameId ? ' Try checking another game ID or leave blank to see all recent bets.' : ' All recent bets from the current game are displayed here.'}</p>
                </div>
              ) : (
                filteredBets.map(bet => (
                  <div 
                    key={bet.id} 
                    className="p-4 bg-purple-900/30 rounded-lg border border-purple-400/20 hover:border-purple-400/40 transition-colors"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-white">{bet.userName}</span>
                          <Badge variant="outline" className="text-purple-300 border-purple-400/30">
                            {bet.userPhone}
                          </Badge>
                          <Badge className={`${
                            bet.side === 'andar' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                            'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          }`}>
                            {bet.side.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-purple-300 border-purple-400/30">
                            Round {bet.round}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-purple-300">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            <span>Amount: {formatCurrency(bet.amount)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{new Date(bet.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Status: {bet.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 md:mt-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openUpdateDialog(bet)}
                          className="border-purple-400/30 text-purple-200 hover:bg-purple-400/10"
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Bet Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="bg-purple-900/90 backdrop-blur-sm border-purple-400/30 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Update Bet</DialogTitle>
          </DialogHeader>
          
          {selectedBet && (
            <div className="space-y-4">
              <div className="p-3 bg-purple-800/30 rounded">
                <h4 className="font-medium mb-2">Current Bet</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>User: {selectedBet.userName}</div>
                  <div>Phone: {selectedBet.userPhone}</div>
                  <div>Round: {selectedBet.round}</div>
                  <div>Side: <span className={selectedBet.side === 'andar' ? 'text-red-400' : 'text-blue-400'}>{selectedBet.side.toUpperCase()}</span></div>
                  <div>Amount: {formatCurrency(selectedBet.amount)}</div>
                  <div>Status: {selectedBet.status}</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label htmlFor="newSide">New Side</Label>
                  <Select 
                    value={updateForm.newSide} 
                    onValueChange={(value: 'andar' | 'bahar') => setUpdateForm({...updateForm, newSide: value})}
                  >
                    <SelectTrigger className="bg-purple-800/50 border-purple-400/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="andar">Andar</SelectItem>
                      <SelectItem value="bahar">Bahar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="newAmount">New Amount</Label>
                  <Input
                    id="newAmount"
                    type="number"
                    value={updateForm.newAmount || selectedBet.amount}
                    onChange={(e) => setUpdateForm({...updateForm, newAmount: parseFloat(e.target.value) || 0})}
                    className="bg-purple-800/50 border-purple-400/30 text-white"
                  />
                </div>
                
                <div>
                  <Label htmlFor="updateReason">Reason for Update</Label>
                  <Input
                    id="updateReason"
                    value={updateForm.reason}
                    onChange={(e) => setUpdateForm({...updateForm, reason: e.target.value})}
                    placeholder="Enter reason for bet update..."
                    className="bg-purple-800/50 border-purple-400/30 text-white"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleBetUpdate}
                >
                  Update Bet
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 border-purple-400/30 text-purple-200 hover:bg-purple-400/10"
                  onClick={() => setShowUpdateDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BetMonitoringDashboard;
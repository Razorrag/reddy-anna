/**
 * LiveBetMonitoring - Real-time player bet monitoring with cumulative display and editing
 * 
 * Features:
 * - Shows CUMULATIVE bets per player (not individual bets)
 * - Player A: 10k + 10k = 20k on Andar (Round 1)
 * - Player A: 20k on Andar (Round 2) → Total 40k Andar
 * - Edit any player's bet (amount or side) until game completes
 * - Live updates via WebSocket
 * - Works during betting AND dealing phases
 */

import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, RefreshCw, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useNotification } from '@/contexts/NotificationContext';
import { useGameState } from '@/contexts/GameStateContext';

interface PlayerBet {
  userId: string;
  userName: string;
  userPhone: string;
  round1Andar: number;
  round1Bahar: number;
  round2Andar: number;
  round2Bahar: number;
  totalAndar: number;
  totalBahar: number;
  grandTotal: number;
  bets: Array<{
    id: string;
    round: string;
    side: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

interface EditState {
  userId: string;
  round: number;
  newSide: 'andar' | 'bahar';
  newAmount: string;
}

const LiveBetMonitoring: React.FC = () => {
  const [playerBets, setPlayerBets] = useState<PlayerBet[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // ✅ FIX: Force re-render key
  const { showNotification } = useNotification();
  const { gameState } = useGameState();

  // Fetch live grouped bets
  const fetchLiveBets = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching live bets from API...');
      const response = await apiClient.get('/admin/bets/live-grouped') as any;
      if (response.success && response.data) {
        console.log(`📊 Fetched ${response.data.length} players' bets:`, response.data);
        setPlayerBets(response.data);
        setRefreshKey(k => k + 1); // ✅ FIX: Force component re-render
      } else {
        console.warn('⚠️ API returned no data:', response);
      }
    } catch (error) {
      console.error('❌ Failed to fetch live bets:', error);
      showNotification('Failed to load live bets', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 3 seconds
  useEffect(() => {
    fetchLiveBets();
    const interval = setInterval(fetchLiveBets, 3000);
    return () => clearInterval(interval);
  }, [gameState.gameId, gameState.phase]);

  // Listen for WebSocket bet updates
  useEffect(() => {
    const handleBetUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('📨 LiveBetMonitoring received admin_bet_update:', customEvent.detail);
      fetchLiveBets();
    };

    console.log('✅ LiveBetMonitoring: Registered admin_bet_update listener');
    window.addEventListener('admin_bet_update', handleBetUpdate);
    return () => {
      console.log('🔌 LiveBetMonitoring: Unregistered admin_bet_update listener');
      window.removeEventListener('admin_bet_update', handleBetUpdate);
    };
  }, []);

  const startEdit = (player: PlayerBet, round: number) => {
    setEditingPlayer(player.userId);
    
    // Determine current side and amount for this round
    const currentSide = round === 1
      ? (player.round1Andar > 0 ? 'andar' : 'bahar')
      : (player.round2Andar > 0 ? 'andar' : 'bahar');
    
    const currentAmount = round === 1
      ? (player.round1Andar > 0 ? player.round1Andar : player.round1Bahar)
      : (player.round2Andar > 0 ? player.round2Andar : player.round2Bahar);

    setEditState({
      userId: player.userId,
      round,
      newSide: currentSide,
      newAmount: currentAmount.toString()
    });
  };

  const cancelEdit = () => {
    setEditingPlayer(null);
    setEditState(null);
  };

  const saveEdit = async () => {
    if (!editState) return;

    // Get all bet IDs for this player and round
    const player = playerBets.find(p => p.userId === editState.userId);
    if (!player) return;

    const roundBets = player.bets.filter(b => parseInt(b.round) === editState.round);
    if (roundBets.length === 0) {
      showNotification('No bets found for this round', 'error');
      return;
    }

    try {
      setSaving(true);

      // Calculate how to distribute the new amount across existing bets
      const newAmount = parseFloat(editState.newAmount);
      if (isNaN(newAmount) || newAmount < 0) {
        showNotification('Invalid amount', 'error');
        return;
      }

      // Update ALL bets for this player and round to the new side and amount
      // Distribute amount equally across all bets (or just update the first one)
      const amountPerBet = newAmount / roundBets.length;

      for (const bet of roundBets) {
        await apiClient.patch(`/admin/bets/${bet.id}`, {
          side: editState.newSide,
          amount: amountPerBet,
          round: editState.round.toString()
        });
      }

      showNotification('✅ Bet updated successfully', 'success');
      cancelEdit();
      await fetchLiveBets(); // Refresh data
    } catch (error: any) {
      console.error('Failed to save bet edit:', error);
      showNotification(
        error.response?.data?.error || 'Failed to update bet',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  if (loading && playerBets.length === 0) {
    return (
      <Card className="bg-black/50 border-gold/30">
        <CardContent className="p-8 text-center text-white/60">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          Loading live bets...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/50 border-gold/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-gold" />
            <CardTitle className="text-gold">📊 Live Bet Monitoring</CardTitle>
            <Badge className="bg-green-500/20 border-green-500 text-green-400">
              {playerBets.length} Players
            </Badge>
          </div>
          <Button
            onClick={fetchLiveBets}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-gold/30 text-gold hover:bg-gold/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {/* Phase indicator */}
        <div className="flex gap-2 mt-2">
          <Badge className={`${
            gameState.phase === 'betting' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' :
            gameState.phase === 'dealing' ? 'bg-blue-500/20 border-blue-500 text-blue-400' :
            'bg-gray-500/20 border-gray-500 text-gray-400'
          }`}>
            Phase: {gameState.phase}
          </Badge>
          <Badge className="bg-purple-500/20 border-purple-500 text-purple-400">
            Round {gameState.currentRound}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {playerBets.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            No active bets in current game
          </div>
        ) : (
          <div className="space-y-3">
            {playerBets.map((player) => {
              const isEditing = editingPlayer === player.userId;
              
              return (
                <div
                  key={player.userId}
                  className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 rounded-lg border border-gold/20 p-4 hover:border-gold/40 transition-all"
                >
                  {/* Player Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{player.userName}</h3>
                      <p className="text-sm text-white/60">{player.userPhone}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gold">
                        {formatCurrency(player.grandTotal)}
                      </div>
                      <div className="text-xs text-white/60">Total Bet</div>
                    </div>
                  </div>

                  {/* Round 1 Bets */}
                  {(player.round1Andar > 0 || player.round1Bahar > 0) && (
                    <div className="mb-3 p-3 bg-black/30 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-purple-500/20 border-purple-500 text-purple-400">
                          Round 1
                        </Badge>
                        {gameState.phase !== 'complete' && (
                          <Button
                            onClick={() => isEditing && editState?.round === 1 ? cancelEdit() : startEdit(player, 1)}
                            variant="ghost"
                            size="sm"
                            className="text-gold hover:text-gold/80 hover:bg-gold/10"
                          >
                            {isEditing && editState?.round === 1 ? (
                              <><X className="w-4 h-4 mr-1" /> Cancel</>
                            ) : (
                              <><Edit2 className="w-4 h-4 mr-1" /> Edit</>
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {isEditing && editState?.round === 1 ? (
                        /* Edit Mode */
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setEditState({ ...editState, newSide: 'andar' })}
                              className={`flex-1 ${
                                editState.newSide === 'andar'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-900/30 border border-red-500/30 text-red-400 hover:bg-red-800/40'
                              }`}
                            >
                              Andar
                            </Button>
                            <Button
                              onClick={() => setEditState({ ...editState, newSide: 'bahar' })}
                              className={`flex-1 ${
                                editState.newSide === 'bahar'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-900/30 border border-blue-500/30 text-blue-400 hover:bg-blue-800/40'
                              }`}
                            >
                              Bahar
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={editState.newAmount}
                              onChange={(e) => setEditState({ ...editState, newAmount: e.target.value })}
                              placeholder="Amount"
                              className="flex-1 bg-black/50 border-gold/30 text-white"
                            />
                            <Button
                              onClick={saveEdit}
                              disabled={saving}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {saving ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <><Save className="w-4 h-4 mr-1" /> Save</>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display Mode */
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`p-2 rounded ${player.round1Andar > 0 ? 'bg-red-900/30 border border-red-500/30' : 'bg-gray-900/20 border border-gray-700/20'}`}>
                            <div className="text-xs text-white/60 mb-1">Andar</div>
                            <div className={`text-lg font-bold ${player.round1Andar > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                              {formatCurrency(player.round1Andar)}
                            </div>
                          </div>
                          <div className={`p-2 rounded ${player.round1Bahar > 0 ? 'bg-blue-900/30 border border-blue-500/30' : 'bg-gray-900/20 border border-gray-700/20'}`}>
                            <div className="text-xs text-white/60 mb-1">Bahar</div>
                            <div className={`text-lg font-bold ${player.round1Bahar > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                              {formatCurrency(player.round1Bahar)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Round 2 Bets */}
                  {(player.round2Andar > 0 || player.round2Bahar > 0) && (
                    <div className="p-3 bg-black/30 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-purple-500/20 border-purple-500 text-purple-400">
                          Round 2
                        </Badge>
                        {gameState.phase !== 'complete' && (
                          <Button
                            onClick={() => isEditing && editState?.round === 2 ? cancelEdit() : startEdit(player, 2)}
                            variant="ghost"
                            size="sm"
                            className="text-gold hover:text-gold/80 hover:bg-gold/10"
                          >
                            {isEditing && editState?.round === 2 ? (
                              <><X className="w-4 h-4 mr-1" /> Cancel</>
                            ) : (
                              <><Edit2 className="w-4 h-4 mr-1" /> Edit</>
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {isEditing && editState?.round === 2 ? (
                        /* Edit Mode */
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setEditState({ ...editState, newSide: 'andar' })}
                              className={`flex-1 ${
                                editState.newSide === 'andar'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-900/30 border border-red-500/30 text-red-400 hover:bg-red-800/40'
                              }`}
                            >
                              Andar
                            </Button>
                            <Button
                              onClick={() => setEditState({ ...editState, newSide: 'bahar' })}
                              className={`flex-1 ${
                                editState.newSide === 'bahar'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-900/30 border border-blue-500/30 text-blue-400 hover:bg-blue-800/40'
                              }`}
                            >
                              Bahar
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              value={editState.newAmount}
                              onChange={(e) => setEditState({ ...editState, newAmount: e.target.value })}
                              placeholder="Amount"
                              className="flex-1 bg-black/50 border-gold/30 text-white"
                            />
                            <Button
                              onClick={saveEdit}
                              disabled={saving}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              {saving ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <><Save className="w-4 h-4 mr-1" /> Save</>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Display Mode */
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`p-2 rounded ${player.round2Andar > 0 ? 'bg-red-900/30 border border-red-500/30' : 'bg-gray-900/20 border border-gray-700/20'}`}>
                            <div className="text-xs text-white/60 mb-1">Andar</div>
                            <div className={`text-lg font-bold ${player.round2Andar > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                              {formatCurrency(player.round2Andar)}
                            </div>
                          </div>
                          <div className={`p-2 rounded ${player.round2Bahar > 0 ? 'bg-blue-900/30 border border-blue-500/30' : 'bg-gray-900/20 border border-gray-700/20'}`}>
                            <div className="text-xs text-white/60 mb-1">Bahar</div>
                            <div className={`text-lg font-bold ${player.round2Bahar > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                              {formatCurrency(player.round2Bahar)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cumulative Totals */}
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-red-400" />
                        <div>
                          <div className="text-xs text-white/60">Total Andar</div>
                          <div className="text-lg font-bold text-red-400">
                            {formatCurrency(player.totalAndar)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-blue-400" />
                        <div>
                          <div className="text-xs text-white/60">Total Bahar</div>
                          <div className="text-lg font-bold text-blue-400">
                            {formatCurrency(player.totalBahar)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveBetMonitoring;

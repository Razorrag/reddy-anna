# Real-time Bet Monitoring and Editing System Implementation Plan

## Overview
This document outlines the implementation of a real-time bet monitoring and editing system for the Andar Bahar application. The system will allow administrators to view all active bets in real-time, search users by phone number, and edit existing bets while the game is running.

## Current State Analysis

### Backend Infrastructure
- **Database Schema**: `player_bets` table exists with fields: `id`, `user_id`, `game_id`, `round`, `side`, `amount`, `status`, `created_at`, `updated_at`
- **Game State**: Bets tracked in `currentGameState.userBets` Map with structure: `Map<userId, {round1: {andar: amount, bahar: amount}, round2: {andar: amount, bahar: amount}}>`
- **Storage Layer**: Methods exist for creating bets, getting bets for game/user, updating bet status, but no method to update bet side/amount
- **WebSocket System**: Real-time betting events handled via WebSocket messages

### Missing Features
- Real-time bet editing functionality
- Admin interface to monitor active bets
- Method to update bet side/amount during active game
- User search by phone number in bet context

## Implementation Requirements

### 1. Real-time Bet Monitoring
- Display all active bets in current game
- Show user details (phone number, name) 
- Show bet details (round, side, amount)
- Real-time updates as new bets come in

### 2. Bet Editing Functionality
- Ability to change bet side (andar to bahar, bahar to andar)
- Ability to change bet amount
- Ability to find user by phone number
- Undo capability for mistakes

### 3. User Search Integration
- Search by mobile number to find specific user bets
- Filter bets by user
- Quick access to user's bet information

## Implementation Plan

### Part 1: Backend Enhancements

#### 1.1 Add Update Bet Methods to Storage Layer
**File**: `server/storage-supabase.ts`

Add new methods to the `IStorage` interface:
```typescript
// In interface IStorage
updateBetDetails(betId: string, updates: Partial<UpdateBet>): Promise<void>;
updateUserBetInGame(userId: string, gameId: string, round: string, oldSide: string, newSide: string, newAmount: number): Promise<void>;
getActiveBetsForGame(gameId: string): Promise<PlayerBet[]>;
```

Implement the new methods:
```typescript
// Add after existing updateBetStatus methods
async updateBetDetails(betId: string, updates: Partial<UpdateBet>): Promise<void> {
  const { error } = await supabaseServer
    .from('player_bets')
    .update({ 
      ...updates,
      updated_at: new Date()
    })
    .eq('id', betId);

  if (error) {
    console.error('Error updating bet details:', error);
    throw error;
  }
}

async updateUserBetInGame(userId: string, gameId: string, round: string, oldSide: string, newSide: string, newAmount: number): Promise<void> {
  // Skip database update for anonymous users
  if (userId === 'anonymous') {
    console.log('⚠️ Skipping bet update for anonymous user');
    return;
  }
  
  // Update the specific bet
  const { error } = await supabaseServer
    .from('player_bets')
    .update({ 
      side: newSide,
      amount: newAmount.toString(),
      updated_at: new Date()
    })
    .eq('user_id', userId)
    .eq('game_id', gameId)
    .eq('round', round)
    .eq('side', oldSide);

  if (error) {
    console.error('Error updating user bet in game:', error);
    throw error;
  }
}

async getActiveBetsForGame(gameId: string): Promise<PlayerBet[]> {
  const { data, error } = await supabaseServer
    .from('player_bets')
    .select(`
      *,
      user:users(phone, full_name)
    `)
    .eq('game_id', gameId)
    .in('status', ['active', 'pending']); // Only active/pending bets

  if (error) {
    console.error('Error getting active bets for game:', error);
    return [];
  }

  return data || [];
}
```

Add new interface:
```typescript
// Add to type definitions
interface UpdateBet {
  round?: string;
  side?: string;
  amount?: string;
  status?: string;
}
```

#### 1.2 Update Game State Structure for Real-time Updates
**File**: `server/routes.ts`

Add WebSocket event broadcasting when admin edits bets:
```typescript
// Add function to broadcast bet updates
function broadcastBetUpdate(betUpdate: any) {
  broadcast({
    type: 'bet_update',
    data: betUpdate
  });
}

function broadcastGameBets(gameId: string) {
  // Broadcast all current bets for the game
  broadcast({
    type: 'game_bets_update',
    data: {
      gameId,
      bets: Array.from(currentGameState.userBets.entries())
    }
  });
}
```

#### 1.3 Add Admin API Endpoint for Bet Management
**File**: `server/routes.ts`

Add new API endpoints:
```typescript
// Add after existing admin routes (around line 1376)
app.get("/api/admin/games/:gameId/bets", generalLimiter, validateAdminAccess, async (req, res) => {
  try {
    const { gameId } = req.params;
    const bets = await storage.getActiveBetsForGame(gameId);
    
    // Join with user details
    const betsWithUserDetails = bets.map(bet => ({
      id: bet.id,
      userId: bet.user_id,
      userPhone: bet.user?.phone,
      userName: bet.user?.full_name,
      gameId: bet.game_id,
      round: bet.round,
      side: bet.side,
      amount: parseFloat(bet.amount),
      status: bet.status,
      createdAt: bet.created_at
    }));
    
    res.json({ success: true, data: betsWithUserDetails });
  } catch (error) {
    console.error('Get game bets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game bets'
    });
  }
});

app.patch("/api/admin/bets/:betId", generalLimiter, validateAdminAccess, async (req, res) => {
  try {
    const { betId } = req.params;
    const { side, amount, round } = req.body;
    
    // Validate inputs
    if (!side || !['andar', 'bahar'].includes(side)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid side. Must be "andar" or "bahar"'
      });
    }
    
    if (!amount || amount < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Must be a positive number'
      });
    }
    
    if (!round || !['1', '2', 'round1', 'round2'].includes(round.toString())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid round. Must be 1 or 2'
      });
    }
    
    // Get current bet to find user info
    const currentBet = await storage.getBetById(betId); // Need to add this method
    if (!currentBet) {
      return res.status(404).json({
        success: false,
        error: 'Bet not found'
      });
    }
    
    // Update the bet in database
    await storage.updateBetDetails(betId, {
      side,
      amount: amount.toString(),
      round: round.toString()
    });
    
    // Update the current game state in memory
    const userId = currentBet.user_id;
    if (currentGameState.userBets.has(userId)) {
      const userBets = currentGameState.userBets.get(userId)!;
      
      // Adjust total bets for the old side
      const oldSide = currentBet.side as 'andar' | 'bahar';
      const oldRound = parseInt(currentBet.round);
      const oldAmount = parseFloat(currentBet.amount);
      
      if (oldRound === 1) {
        userBets.round1[oldSide] -= oldAmount;
        currentGameState.round1Bets[oldSide] -= oldAmount;
      } else {
        userBets.round2[oldSide] -= oldAmount;
        currentGameState.round2Bets[oldSide] -= oldAmount;
      }
      
      // Add to new side
      const newSide = side as 'andar' | 'bahar';
      const newRound = parseInt(round.toString());
      const newAmount = parseFloat(amount);
      
      if (newRound === 1) {
        userBets.round1[newSide] += newAmount;
        currentGameState.round1Bets[newSide] += newAmount;
      } else {
        userBets.round2[newSide] += newAmount;
        currentGameState.round2Bets[newSide] += newAmount;
      }
    }
    
    // Broadcast update to all clients
    broadcast({
      type: 'admin_bet_update',
      data: {
        betId,
        userId,
        oldSide: currentBet.side,
        newSide: side,
        oldAmount: parseFloat(currentBet.amount),
        newAmount: amount,
        round: round.toString(),
        updatedBy: req.user!.id
      }
    });
    
    res.json({
      success: true,
      message: 'Bet updated successfully',
      data: {
        betId,
        userId,
        oldSide: currentBet.side,
        newSide: side,
        oldAmount: parseFloat(currentBet.amount),
        newAmount: amount,
        round: round.toString()
      }
    });
  } catch (error) {
    console.error('Update bet error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update bet'
    });
  }
});

// Add search endpoint by phone number
app.get("/api/admin/search-bets", generalLimiter, validateAdminAccess, async (req, res) => {
  try {
    const { phone, gameId } = req.query;
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }
    
    // Find user by phone number
    const user = await storage.getUserByPhone(phone as string);
    if (!user) {
      return res.json({
        success: true,
        data: [],
        message: 'No user found with this phone number'
      });
    }
    
    // Get user's bets for the specified game
    const bets = gameId 
      ? await storage.getBetsForUser(user.id, gameId as string)
      : await storage.getUserBets(user.id);
    
    // Join with game details if needed
    const betsWithDetails = bets.map(bet => ({
      id: bet.id,
      userId: bet.user_id,
      userPhone: user.phone,
      userName: user.full_name,
      gameId: bet.game_id,
      round: bet.round,
      side: bet.side,
      amount: parseFloat(bet.amount),
      status: bet.status,
      createdAt: bet.created_at
    }));
    
    res.json({
      success: true,
      data: betsWithDetails
    });
  } catch (error) {
    console.error('Search bets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search bets'
    });
  }
});
```

#### 1.4 Add getBetById Method to Storage
**File**: `server/storage-supabase.ts`

Add to the IStorage interface:
```typescript
getBetById(betId: string): Promise<PlayerBet | null>;
```

Add implementation:
```typescript
async getBetById(betId: string): Promise<PlayerBet | null> {
  const { data, error } = await supabaseServer
    .from('player_bets')
    .select('*')
    .eq('id', betId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') { // Not found is ok
      console.error('Error getting bet by id:', error);
    }
    return null;
  }

  return data;
}
```

### Part 2: Frontend Implementation

#### 2.1 Create Bet Monitoring Component
**File**: `client/src/components/BetMonitoringDashboard.tsx`

```typescript
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit3, Users, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { useWebSocket } from '@/hooks/useWebSocket';

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
  
  const { sendMessage } = useWebSocket();

  const fetchBets = useCallback(async () => {
    if (!gameId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/games/${gameId}/bets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setBets(result.data || []);
      } else {
        console.error('Failed to fetch bets');
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
      const response = await fetch(`/api/admin/search-bets?phone=${encodeURIComponent(searchTerm)}${gameId ? `&gameId=${gameId}` : ''}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
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
      const response = await fetch(`/api/admin/bets/${updateForm.betId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          side: updateForm.newSide,
          amount: updateForm.newAmount,
          round: updateForm.currentRound,
          reason: updateForm.reason
        })
      });
      
      if (response.ok) {
        const result = await response.json();
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
    if (gameId) {
      fetchBets();
    }
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
            Monitor and manage live bets in real-time
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
                  <p>No bets found. Enter a game ID to monitor live bets.</p>
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
                            bet.side === 'bahar' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 
                            'bg-gray-500/20 text-gray-400 border-gray-500/30'
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
```

#### 2.2 Integrate Bet Monitoring into Admin Game Page
**File**: `client/src/pages/admin-game.tsx` or create new `client/src/pages/bet-monitoring.tsx`

```tsx
// Option 1: Add to existing admin game page
// In client/src/pages/admin-game.tsx, import and add the component

import BetMonitoringDashboard from "@/components/BetMonitoringDashboard";

// Add the component below the existing game controls
<div className="max-w-7xl mx-auto mt-8">
  <BetMonitoringDashboard />
</div>
```

#### 2.3 Add WebSocket Message Handling
**File**: `client/src/contexts/WebSocketContext.tsx`

Add handling for bet updates:
```typescript
// Add to the ws.onmessage switch statement
case 'admin_bet_update':
  console.log('Admin updated bet:', data.data);
  // Dispatch custom event for UI updates
  const betUpdateEvent = new CustomEvent('admin_bet_update', {
    detail: data.data
  });
  window.dispatchEvent(betUpdateEvent);
  break;

case 'game_bets_update':
  console.log('Game bets updated:', data.data);
  // Dispatch custom event for UI updates
  const betsUpdateEvent = new CustomEvent('game_bets_update', {
    detail: data.data
  });
  window.dispatchEvent(betsUpdateEvent);
  break;
```

#### 2.4 Update Game State Context
**File**: `client/src/contexts/GameStateContext.tsx` or create new context

If needed, create a new context to manage bet monitoring state:
```typescript
// client/src/contexts/BetMonitoringContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

interface BetMonitoringContextType {
  currentBets: any[];
  addBet: (bet: any) => void;
  updateBet: (betId: string, updates: any) => void;
  removeBet: (betId: string) => void;
}

const BetMonitoringContext = createContext<BetMonitoringContextType | undefined>(undefined);

export const BetMonitoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentBets, setCurrentBets] = useState<any[]>([]);

  const addBet = (bet: any) => {
    setCurrentBets(prev => [...prev, bet]);
  };

  const updateBet = (betId: string, updates: any) => {
    setCurrentBets(prev => 
      prev.map(bet => bet.id === betId ? { ...bet, ...updates } : bet)
    );
  };

  const removeBet = (betId: string) => {
    setCurrentBets(prev => prev.filter(bet => bet.id !== betId));
  };

  return (
    <BetMonitoringContext.Provider value={{ 
      currentBets, 
      addBet, 
      updateBet, 
      removeBet 
    }}>
      {children}
    </BetMonitoringContext.Provider>
  );
};

export const useBetMonitoring = () => {
  const context = useContext(BetMonitoringContext);
  if (context === undefined) {
    throw new Error('useBetMonitoring must be used within a BetMonitoringProvider');
  }
  return context;
};
```

### Part 3: Integration Points

#### 3.1 Frontend Integration
- **`client/src/components/BetMonitoringDashboard.tsx`**: Main bet monitoring component
- **`client/src/contexts/WebSocketContext.tsx`**: Handle bet update messages
- **`client/src/pages/admin-game.tsx`** or **`client/src/pages/bet-monitoring.tsx`**: Add the monitoring dashboard
- **`client/src/contexts/BetMonitoringContext.tsx`**: Optional context for bet state management
- **`client/src/types/game.ts`**: Add new bet-related type definitions

#### 3.2 Backend Integration
- **`server/storage-supabase.ts`**: Add new storage methods for bet editing
- **`server/routes.ts`**: Add new API endpoints for bet management
- **`server/types.ts`**: Add new type definitions if needed

### Part 4: Security Considerations

#### 4.1 Authentication & Authorization
- All bet management endpoints require admin authentication
- Validate admin permissions before allowing bet modifications
- Log all bet changes with admin ID and timestamp

#### 4.2 Input Validation
- Validate bet amounts and sides before processing updates
- Ensure game is still active before allowing bet modifications
- Validate user permissions before allowing bet changes

#### 4.3 Audit Trail
- Log all bet modifications with before/after values
- Include admin ID, timestamp, and reason for changes
- Maintain transactional integrity for balance adjustments

### Part 5: Implementation Steps

#### Step 1: Backend Storage Layer (Day 1)
1. Add new methods to storage interface and implementation
2. Add getBetById method
3. Test database interactions

#### Step 2: Backend API Endpoints (Day 1-2)
1. Add bet monitoring API endpoints
2. Add bet update endpoint
3. Add user search by phone endpoint
4. Implement game state updates for real-time changes

#### Step 3: Frontend Components (Day 2-3)
1. Create BetMonitoringDashboard component
2. Implement search functionality by phone number
3. Create bet update dialog
4. Add real-time updates via WebSocket

#### Step 4: Integration and Testing (Day 3-4)
1. Integrate components into admin interface
2. Test bet editing during active games
3. Test user search by phone number
4. Test real-time bet updates
5. Validate security and audit logging

### Part 6: Error Handling & User Experience

#### 6.1 Error States
- Network error handling for API calls
- Invalid input validation for bet updates
- Game not found errors
- User not found errors

#### 6.2 Loading States
- Initial bet loading
- Bet update loading
- Search loading

#### 6.3 Success Feedback
- Confirmation for bet updates
- Undo functionality
- Real-time updates after changes

### Part 7: Performance Considerations

#### 7.1 API Optimization
- Efficient database queries with proper indexing
- Real-time updates via WebSocket to reduce API calls
- Pagination for large bet datasets

#### 7.2 Frontend Performance
- Virtual scrolling for large bet lists
- Debounced search functionality
- Optimized state updates

### Part 8: Testing Strategy

#### 8.1 Backend Tests
- Test bet update functionality
- Test user search by phone
- Test concurrent bet modifications
- Test game state consistency after updates

#### 8.2 Frontend Tests
- Test bet display and filtering
- Test edit functionality
- Test real-time updates
- Test user search functionality

## Success Criteria

1. Admins can view all active bets in real-time
2. Admins can search bets by user phone number
3. Admins can edit bet side and amount during active game
4. All changes are reflected in real-time across all clients
5. Proper audit logging of all bet modifications
6. Game state remains consistent after bet modifications
7. Security measures prevent unauthorized access
8. Performance remains optimal with large numbers of bets

## Timeline
- Backend Implementation: 2 days
- Frontend Implementation: 2 days  
- Integration & Testing: 2 days

**Total: 6 working days**
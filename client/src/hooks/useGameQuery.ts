/**
 * REACT QUERY HOOKS FOR GAME STATE
 * 
 * This replaces context-based state management with proper server-state management.
 * Benefits:
 * - Automatic caching
 * - Background refetching
 * - Optimistic updates
 * - Error handling
 * - No prop drilling
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// QUERY KEYS (centralized for cache management)
// ============================================

export const queryKeys = {
  currentGame: ['game', 'current'] as const,
  userProfile: ['user', 'profile'] as const,
  userBalance: ['user', 'balance'] as const,
  gameHistory: (userId: string) => ['game', 'history', userId] as const,
  adminRequests: ['admin', 'requests'] as const,
  streamSettings: ['stream', 'settings'] as const,
};

// ============================================
// GAME QUERIES
// ============================================

/**
 * Get current game state
 * Replaces: GameStateContext
 */
export function useCurrentGame() {
  return useQuery({
    queryKey: queryKeys.currentGame,
    queryFn: async () => {
      const data = await apiClient.get<any>('/api/game/current');
      return data;
    },
    refetchInterval: 1000, // Poll every second for real-time updates
    staleTime: 500, // Consider data stale after 500ms
  });
}

/**
 * Get game history for a user
 */
export function useGameHistory(userId: string) {
  return useQuery({
    queryKey: queryKeys.gameHistory(userId),
    queryFn: async () => {
      const data = await apiClient.get<any>(`/api/game/history/${userId}`);
      return data;
    },
    enabled: !!userId, // Only fetch if userId exists
  });
}

// ============================================
// USER QUERIES
// ============================================

/**
 * Get user profile
 * Replaces: AppContext user state
 */
export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.userProfile,
    queryFn: async () => {
      const data = await apiClient.get<any>('/api/user/profile');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get user balance
 * Replaces: Frequent balance checks in components
 */
export function useUserBalance() {
  const { state: authState } = useAuth();
  const isPlayer = authState.isAuthenticated && (authState.user?.role === 'player');

  return useQuery({
    queryKey: queryKeys.userBalance,
    queryFn: async () => {
      const data = await apiClient.get<any>('/api/user/balance');
      return (data as any).balance;
    },
    refetchInterval: 5000, // Update every 5 seconds
    enabled: !!isPlayer, // Only fetch for players
  });
}

// ============================================
// GAME MUTATIONS
// ============================================

/**
 * Place a bet
 * Replaces: Manual axios call in player-game.tsx
 */
export function usePlaceBet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bet: { side: 'andar' | 'bahar'; amount: number; round: string }) => {
      return apiClient.post<any>('/api/game/bet', bet);
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.userBalance });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentGame });
    },
    onError: (error: any) => {
      console.error('Bet failed:', error.message);
    },
  });
}

/**
 * Start a new game (admin only)
 */
export function useStartGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (openingCard: string) => {
      return apiClient.post<any>('/api/game/start', { openingCard });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentGame });
    },
  });
}

/**
 * Deal a card (admin only)
 */
export function useDealCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardData: { card: string; side: 'andar' | 'bahar'; position: number }) => {
      return apiClient.post<any>('/api/game/deal-card', cardData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentGame });
    },
  });
}

// ============================================
// ADMIN QUERIES
// ============================================

/**
 * Get admin requests (deposits/withdrawals)
 */
export function useAdminRequests() {
  return useQuery({
    queryKey: queryKeys.adminRequests,
    queryFn: async () => {
      return apiClient.get<any>('/api/admin/requests');
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

/**
 * Approve/reject admin request
 */
export function useProcessRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'approve' | 'reject' }) => {
      return apiClient.post<any>(`/api/admin/requests/${requestId}/${action}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminRequests });
    },
  });
}

// ============================================
// STREAM QUERIES
// ============================================

/**
 * Get stream settings
 */
export function useStreamSettings() {
  return useQuery({
    queryKey: queryKeys.streamSettings,
    queryFn: async () => {
      return apiClient.get<any>('/api/stream/settings');
    },
  });
}

/**
 * Update stream settings
 */
export function useUpdateStreamSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: any) => {
      return apiClient.post<any>('/api/stream/settings', settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.streamSettings });
    },
  });
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Prefetch game data (useful for navigation)
 */
export function usePrefetchGame() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.currentGame,
      queryFn: async () => {
        return apiClient.get<any>('/api/game/current');
      },
    });
  };
}

/**
 * Clear all game-related cache (useful for logout)
 */
export function useClearGameCache() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.removeQueries({ queryKey: ['game'] });
    queryClient.removeQueries({ queryKey: ['user'] });
  };
}

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
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

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
// API CLIENT (centralized axios instance)
// ============================================

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
      const { data } = await apiClient.get('/api/game/current');
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
      const { data } = await apiClient.get(`/api/game/history/${userId}`);
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
      const { data } = await apiClient.get('/api/user/profile');
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
  return useQuery({
    queryKey: queryKeys.userBalance,
    queryFn: async () => {
      const { data } = await apiClient.get('/api/user/balance');
      return data.balance;
    },
    refetchInterval: 5000, // Update every 5 seconds
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
      const { data } = await apiClient.post('/api/game/bet', bet);
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.userBalance });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentGame });
    },
    onError: (error: any) => {
      console.error('Bet failed:', error.response?.data?.message || error.message);
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
      const { data } = await apiClient.post('/api/game/start', { openingCard });
      return data;
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
      const { data } = await apiClient.post('/api/game/deal-card', cardData);
      return data;
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
      const { data } = await apiClient.get('/api/admin/requests');
      return data;
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
      const { data } = await apiClient.post(`/api/admin/requests/${requestId}/${action}`);
      return data;
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
      const { data } = await apiClient.get('/api/stream/settings');
      return data;
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
      const { data } = await apiClient.post('/api/stream/settings', settings);
      return data;
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
        const { data } = await apiClient.get('/api/game/current');
        return data;
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

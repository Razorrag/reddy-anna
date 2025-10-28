import React from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from '../contexts/AppContext';
import { GameProvider } from '../contexts/GameContext';
import { GameStateProvider } from '../contexts/GameStateContext';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { AuthProvider } from '../contexts/AuthContext';
import { UserProfileProvider } from '../contexts/UserProfileContext';
import { BalanceProvider } from '../contexts/BalanceContext';
import { queryClient } from '../lib/queryClient';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <BalanceProvider>
            <UserProfileProvider>
              <AppProvider>
                <GameProvider>
                  <GameStateProvider>
                    <NotificationProvider>
                      <WebSocketProvider>
                        {children}
                      </WebSocketProvider>
                    </NotificationProvider>
                  </GameStateProvider>
                </GameProvider>
              </AppProvider>
            </UserProfileProvider>
          </BalanceProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;

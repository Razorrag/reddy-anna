import React from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AppProvider } from '../contexts/AppContext';
import { WebSocketProvider } from '../contexts/WebSocketContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { queryClient } from '../lib/queryClient';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppProvider>
          <NotificationProvider>
            <WebSocketProvider>
              {children}
            </WebSocketProvider>
          </NotificationProvider>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;

export interface WebSocketContextType {
  isConnected: boolean;
  gameState: any;
  selectedChip: number;
  setSelectedChip: (amount: number) => void;
  chipAmounts: number[];
  currentRound: number;
  phase: 'idle' | 'betting' | 'dealing' | 'completed';
  countdown: number;
  playerBalance: number;
  playerBets: {
    andar: number;
    bahar: number;
    currentBet: number;
  };
  sendMessage: (message: any) => void;
  connect: () => void;
  disconnect: () => void;
}

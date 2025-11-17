import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (updated for phone-based authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // Phone number as ID
  phone: varchar("phone").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  full_name: text("full_name"),
  role: text("role").default("player"),
  status: text("status").default("active"),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("100000.00"), // ₹100,000 default
  total_winnings: decimal("total_winnings", { precision: 15, scale: 2 }).default("0.00"),
  total_losses: decimal("total_losses", { precision: 15, scale: 2 }).default("0.00"),
  games_played: integer("games_played").default(0),
  games_won: integer("games_won").default(0),
  phone_verified: boolean("phone_verified").default(false),
  referral_code: varchar("referral_code"), // Referral code used during signup
  referral_code_generated: varchar("referral_code_generated"), // Auto-generated referral code for sharing
  deposit_bonus_available: decimal("deposit_bonus_available", { precision: 15, scale: 2 }).default("0.00"),
  referral_bonus_available: decimal("referral_bonus_available", { precision: 15, scale: 2 }).default("0.00"),
  original_deposit_amount: decimal("original_deposit_amount", { precision: 15, scale: 2 }).default("0.00"),
  total_bonus_earned: decimal("total_bonus_earned", { precision: 15, scale: 2 }).default("0.00"),
  wagering_requirement: decimal("wagering_requirement", { precision: 15, scale: 2 }).default("0.00"),
  wagering_completed: decimal("wagering_completed", { precision: 15, scale: 2 }).default("0.00"),
  bonus_locked: boolean("bonus_locked").default(false),
  last_login: timestamp("last_login"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Admin credentials table (new)
export const adminCredentials = pgTable("admin_credentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role: text("role").default("admin"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// Game settings table
export const gameSettings = pgTable("game_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: varchar("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Game sessions table
export const gameSessions = pgTable("game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull().unique(),
  openingCard: text("opening_card"), // e.g., "A♠"
  phase: text("phase").notNull().default("waiting"), // waiting, betting, dealing, completed
  status: text("status").notNull().default("active"), // active, completed, cancelled
  currentTimer: integer("current_timer").default(0),
  winner: text("winner"), // andar or bahar
  winningCard: text("winning_card"),
  totalCards: integer("total_cards").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dealt cards table
export const dealtCards = pgTable("dealt_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  card: text("card").notNull(), // e.g., "K♥"
  side: text("side").notNull(), // andar or bahar
  position: integer("position").notNull(), // 1, 2, 3...
  isWinningCard: boolean("is_winning_card").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Player bets table
export const playerBets = pgTable("player_bets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  gameId: varchar("game_id").notNull(),
  round: varchar("round").notNull(), // round1, round2
  side: text("side").notNull(), // andar or bahar
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("active"), // active, won, lost, cancelled
  payoutTransactionId: text("payout_transaction_id"), // Unique transaction ID for payout - prevents duplicate payouts
  actualPayout: decimal("actual_payout", { precision: 15, scale: 2 }), // Actual payout amount for winning bets
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User transactions table
export const userTransactions = pgTable("user_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  transactionType: text("transaction_type").notNull(), // deposit, withdrawal, bet, win, loss, bonus
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 15, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 15, scale: 2 }).notNull(),
  referenceId: varchar("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Game statistics table
export const gameStatistics = pgTable("game_statistics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  totalPlayers: integer("total_players").default(0),
  totalBets: decimal("total_bets", { precision: 15, scale: 2 }).default("0"),
  totalWinnings: decimal("total_winnings", { precision: 15, scale: 2 }).default("0"),
  houseEarnings: decimal("house_earnings", { precision: 15, scale: 2 }).default("0"),
  andarBetsCount: integer("andar_bets_count").default(0),
  baharBetsCount: integer("bahar_bets_count").default(0),
  andarTotalBet: decimal("andar_total_bet", { precision: 15, scale: 2 }).default("0"),
  baharTotalBet: decimal("bahar_total_bet", { precision: 15, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Game history table
export const gameHistory = pgTable("game_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  openingCard: text("opening_card").notNull(),
  winner: text("winner").notNull(), // andar or bahar
  winningCard: text("winning_card").notNull(),
  totalCards: integer("total_cards").notNull(),
  winningRound: integer("winning_round").default(1),
  totalBets: decimal("total_bets", { precision: 15, scale: 2 }).default("0.00"),
  totalPayouts: decimal("total_payouts", { precision: 15, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Blocked users table
export const blockedUsers = pgTable("blocked_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  reason: text("reason"),
  blockedBy: varchar("blocked_by"), // References admin_credentials.id
  blockedAt: timestamp("blocked_at").defaultNow(),
});

// User referrals table
export const userReferrals = pgTable("user_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerUserId: varchar("referrer_user_id").notNull(),
  referredUserId: varchar("referred_user_id").notNull(),
  depositAmount: decimal("deposit_amount", { precision: 15, scale: 2 }),
  bonusAmount: decimal("bonus_amount", { precision: 15, scale: 2 }),
  bonusApplied: boolean("bonus_applied").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  bonusAppliedAt: timestamp("bonus_applied_at"),
});

// Stream settings table
export const streamSettings = pgTable("stream_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: varchar("setting_key").notNull().unique(),
  settingValue: text("setting_value"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stream settings type for storage interface
export interface StreamSettings {
  settingKey: string;
  settingValue: string;
  description?: string;
}

// User creation log table (for tracking admin-created accounts)
export const userCreationLog = pgTable("user_creation_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdByAdminId: varchar("created_by_admin_id").notNull(),
  userPhone: varchar("user_phone", { length: 15 }).notNull(),
  createdUserId: varchar("created_user_id").notNull(),
  initialBalance: decimal("initial_balance", { precision: 15, scale: 2 }).default("0.00"),
  createdReason: text("created_reason"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// WhatsApp messages table (for tracking user requests to admin)
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userPhone: varchar("user_phone", { length: 15 }).notNull(),
  adminPhone: varchar("admin_phone", { length: 15 }).notNull(),
  requestType: varchar("request_type", { length: 50 }).notNull(), // withdrawal, deposit, support, balance
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, sent, responded
  priority: integer("priority").default(3), // 1-5, 1 being highest
  isUrgent: boolean("is_urgent").default(false),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  respondedAt: timestamp("responded_at"),
  responseMessage: text("response_message"),
  responseBy: varchar("response_by"),
});


// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  created_at: true,
  updated_at: true,
}).extend({
  phone: z.string().optional(), // Allow passing phone for phone-based auth
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBetSchema = createInsertSchema(playerBets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.number().min(1000).max(100000), // Bet limits
});

export const insertDealtCardSchema = createInsertSchema(dealtCards).omit({
  id: true,
  createdAt: true,
});

export const insertGameHistorySchema = createInsertSchema(gameHistory).omit({
  id: true,
  createdAt: true,
});

export const createUserReferralSchema = createInsertSchema(userReferrals).omit({
  id: true,
  createdAt: true,
  bonusAppliedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type GameSession = typeof gameSessions.$inferSelect;

export type InsertBet = z.infer<typeof insertBetSchema>;
export type PlayerBet = typeof playerBets.$inferSelect;

export type InsertDealtCard = z.infer<typeof insertDealtCardSchema>;
export type DealtCard = typeof dealtCards.$inferSelect;

export type InsertGameHistory = z.infer<typeof insertGameHistorySchema>;
export type GameHistoryEntry = typeof gameHistory.$inferSelect;

export type InsertUserReferral = z.infer<typeof createUserReferralSchema>;
export type UserReferral = typeof userReferrals.$inferSelect;

// Card and game types
export const SUITS = ['♠', '♥', '♦', '♣'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export type Suit = typeof SUITS[number];
export type Rank = typeof RANKS[number];
export type Card = `${Rank}${Suit}`;
export type GamePhase = 'idle' | 'betting' | 'dealing' | 'complete';
export type Side = 'andar' | 'bahar';

// NEW: Enhanced WebSocket event types
export interface WebSocketMessage {
  type: string;
  data?: any;
}

// Specific message types
export interface GameStartMessage extends WebSocketMessage {
  type: 'game_start';
  data: {
    openingCard: string;
    gameId: string;
  };
}

export interface PlaceBetMessage extends WebSocketMessage {
  type: 'place_bet';
  data: {
    side: Side;
    amount: number;
    userId: string;
    gameId: string;
    round: number;
  };
}

export interface CardDealtMessage extends WebSocketMessage {
  type: 'card_dealt';
  data: {
    card: string;
    side: Side;
    position: number;
    gameId: string;
    isWinningCard: boolean;
  };
}

export interface StartRoundTimerMessage extends WebSocketMessage {
  type: 'startRoundTimer';
  data: {
    seconds: number;
    round: number;
    phase: string;
  };
}

export interface GameStateMessage extends WebSocketMessage {
  type: 'sync_game_state';
  data: {
    openingCard: string | null;
    phase: string;
    currentTimer: number;
    round: number;
    dealtCards: DealtCard[];
    andarBets: number;
    baharBets: number;
    winner: string | null;
    winningCard: string | null;
  };
}

export interface GameCompleteMessage extends WebSocketMessage {
  type: 'game_complete';
  data: {
    winner: Side;
    winningCard: string;
    winningRound: number | null;
    gameId: string;
  };
}

export interface BetPlacedMessage extends WebSocketMessage {
  type: 'betPlaced';
  data: {
    side: Side;
    amount: number;
    userId: string;
    andarTotal: number;
    baharTotal: number;
  };
}

export interface PhaseChangeMessage extends WebSocketMessage {
  type: 'phase_change';
  data: {
    phase: string;
    round: number;
    message?: string;
    bettingLocked?: boolean;
  };
}

export interface AdminBetReportUpdateMessage extends WebSocketMessage {
  type: 'ADMIN_BET_REPORT_UPDATE';
  data: {
    round1Andar: number;
    round1Bahar: number;
    round2Andar: number;
    round2Bahar: number;
    totalAndar: number;
    totalBahar: number;
    lowestBetSide: string;
    lowestBetAmount: number;
  };
}

export interface StartRound2BettingMessage extends WebSocketMessage {
  type: 'START_ROUND_2_BETTING';
  data: {
    gameId: string;
  };
}

export interface StartFinalDrawMessage extends WebSocketMessage {
  type: 'START_FINAL_DRAW';
  data: {
    gameId: string;
  };
}

export interface PlayerBetHistoryUpdateMessage extends WebSocketMessage {
  type: 'PLAYER_BET_HISTORY_UPDATE';
  data: {
    round1Bets: { andar: number; bahar: number };
    round2Bets: { andar: number; bahar: number };
    currentRound: number;
  };
}

// GameState interface
export interface GameState {
  gameId: string;
  openingCard: string | null;
  phase: GamePhase;
  currentTimer: number;
  round: number;
  dealtCards: DealtCard[];
  andarBets: number;
  baharBets: number;
  winner: string | null;
  winningCard: string | null;
}

export interface BettingStats {
  andarTotal: number;
  baharTotal: number;
  andarCount: number;
  baharCount: number;
}

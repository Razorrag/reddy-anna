import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  balance: integer("balance").notNull().default(1000000), // Default balance ₹10,00,000
});

// Game settings table
export const gameSettings = pgTable("game_settings", {
  settingKey: varchar("setting_key").primaryKey(),
  settingValue: text("setting_value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Game sessions table
export const gameSessions = pgTable("game_sessions", {
  gameId: varchar("game_id").primaryKey().default(sql`gen_random_uuid()`),
  openingCard: text("opening_card"), // e.g., "A♠"
  phase: text("phase").notNull().default("idle"), // idle, betting, dealing, complete
  currentTimer: integer("current_timer").default(30),
  status: text("status").notNull().default("active"), // active, completed
  winner: text("winner"), // andar or bahar
  winningCard: text("winning_card"),
  round: integer("round").default(1),
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
  round: integer("round").notNull(),
  side: text("side").notNull(), // andar or bahar
  amount: integer("amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, won, lost
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stream settings table
export const streamSettings = pgTable("stream_settings", {
  settingKey: varchar("setting_key").primaryKey(),
  settingValue: text("setting_value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stream settings type for storage interface
export interface StreamSettings {
  settingKey: string;
  settingValue: string;
  description?: string;
}

// Game history table
export const gameHistory = pgTable("game_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  openingCard: text("opening_card").notNull(),
  winner: text("winner").notNull(), // andar or bahar
  winningCard: text("winning_card").notNull(),
  totalCards: integer("total_cards").notNull(),
  round: integer("round").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  balance: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).omit({
  gameId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBetSchema = createInsertSchema(playerBets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.number().min(1000).max(50000), // Bet limits
});

export const insertDealtCardSchema = createInsertSchema(dealtCards).omit({
  id: true,
  createdAt: true,
});

export const insertGameHistorySchema = createInsertSchema(gameHistory).omit({
  id: true,
  createdAt: true,
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

// Card and game types
export const SUITS = ['♠', '♥', '♦', '♣'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export type Suit = typeof SUITS[number];
export type Rank = typeof RANKS[number];
export type Card = `${Rank}${Suit}`;
export type GamePhase = 'idle' | 'betting' | 'dealing' | 'complete';
export type Side = 'andar' | 'bahar';

// WebSocket event types
export interface WebSocketMessage {
  type: string;
  data?: any;
}

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

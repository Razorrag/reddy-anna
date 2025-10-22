# Database Schema and Data Flow Analysis

## Current Database Schema Analysis

### 1. Users Table Issues
**Current Schema Definition** (from shared/schema.ts):
```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  balance: integer("balance").notNull().default(5000000), // Default balance ₹50,00,000
});
```

**Real Schema** (from SUPABASE_SCHEMA.sql):
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(20),
    role user_role DEFAULT 'player',
    status user_status DEFAULT 'active',
    balance DECIMAL(15,2) DEFAULT 10000.00,
    -- ... many more fields
);
```

**Issues Identified**:
1. **Schema Mismatch**: Shared schema doesn't match actual database schema
2. **Field Naming**: Shared uses `password`, database uses `password_hash`
3. **Data Types**: Shared uses `integer`, database uses `DECIMAL(15,2)`
4. **Missing Fields**: Critical fields like `email`, `role`, `status` missing from shared schema

### 2. Game Sessions Table
**Issues**:
- Multiple game session tracking (current game, historical games)
- No clear separation between active and completed games
- Missing foreign key relationships in some references

### 3. Bets Table
**Issues**:
- Balance updates happen directly without proper transaction records
- No clear tracking of bet resolution (win/loss)
- Potential race conditions in bet processing

### 4. Dealt Cards Table
**Issues**:
- Card sequence integrity not guaranteed
- No validation that cards follow proper dealing order
- Missing relationship to ensure complete game sequences

## Data Flow Issues

### 1. User Balance Management
**Current Flow**:
1. User places bet → Balance deducted immediately
2. Game completes → Balance updated with winnings/losses
3. No transaction history tracking

**Problems**:
- Balance can go negative if user disconnects during game
- No audit trail of balance changes
- Race conditions when multiple bets are placed simultaneously

**Recommended Flow**:
1. User places bet → Bet amount reserved (frozen) in available balance
2. Game resolves → Reserved amount converted to actual win/loss
3. Transaction recorded for audit trail

### 2. Game State Persistence
**Current Issues**:
- Game state exists only in memory (`currentGameState` in routes.ts)
- If server restarts, all game progress is lost
- No historical data for completed games

**Required Improvements**:
- Persist game state to database regularly
- Store completed games in history table
- Save user betting history per game session

### 3. Bet Processing Sequence
**Current Flow**:
1. WebSocket message received → Validate and process → Update in-memory state → Store in database

**Problems**:
- In-memory state can get out of sync with database
- No rollback mechanism if database operations fail
- Race conditions between multiple simultaneous bets

**Ideal Flow**:
1. WebSocket message received → Start database transaction → Validate → Update database → Update in-memory cache → Broadcast results

## Storage Implementation Issues

### 1. SupabaseStorage Class Problems
**Location**: server/storage-supabase.ts

**Issues Found**:
1. **Inconsistent Naming**: Database uses `game_id`, code uses `gameId`
2. **Missing Error Handling**: Many methods don't handle foreign key constraint errors
3. **No Transaction Support**: Related operations not wrapped in transactions
4. **Performance Issues**: N+1 queries in some methods

**Example Problem**:
```typescript
async updateBetStatusByGameUser(gameId: string, userId: string, side: string, status: string): Promise<void> {
  // Uses incorrect field names
  const { error } = await supabaseServer
    .from('player_bets') // Should be 'bets' according to schema?
    .update({ status, updatedAt: new Date() }) // updatedAt doesn't match DB column 'updated_at'
    .eq('gameId', gameId)  // gameId doesn't match DB column 'game_id'
    .eq('userId', userId)  // userId doesn't match DB column 'user_id'
    .eq('side', side);
}
```

### 2. Database Schema Mismatches
**Table Name Conflicts**:
- Schema file defines `playerBets` but actual DB might use `bets`
- Field name differences: `gameId` vs `game_id`, `userId` vs `user_id`

## Required Database Improvements

### 1. Schema Alignment
```sql
-- Ensure all references use consistent naming
-- Use snake_case for database columns, camelCase in TypeScript
-- Add proper foreign key constraints
-- Add indexes for frequently queried fields
```

### 2. Transaction Management
```typescript
// Example of proper transaction usage
async placeBetSafely(betData: InsertBet): Promise<PlayerBet> {
  const { data, error } = await supabaseServer.rpc('begin_transaction');
  if (error) throw error;
  
  try {
    // Check user balance
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('balance')
      .eq('id', betData.userId)
      .single();
    
    if (!user || user.balance < betData.amount) {
      throw new Error('Insufficient balance');
    }
    
    // Create the bet
    const betResult = await this.createBet(betData);
    
    // Update user balance (reserve amount)
    await this.updateUserBalance(betData.userId, -betData.amount);
    
    // Commit transaction
    await supabaseServer.rpc('commit_transaction');
    
    return betResult;
  } catch (error) {
    // Rollback transaction
    await supabaseServer.rpc('rollback_transaction');
    throw error;
  }
}
```

### 3. Proper Indexing Strategy
```sql
-- Essential indexes for performance
CREATE INDEX idx_users_balance ON users(balance);
CREATE INDEX idx_bets_game_user_status ON bets(game_id, user_id, status);
CREATE INDEX idx_bets_created_at ON bets(created_at);
CREATE INDEX idx_dealt_cards_game_position ON dealt_cards(game_id, position);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
```

## Data Validation Requirements

### 1. Input Validation
**Before Database Operations**:
- Validate all input data types and ranges
- Check referential integrity (user exists, game exists)
- Validate business rules (bet limits, game phases)

### 2. Schema Validation
**Using Zod or Similar**:
- Validate data against schema before database operations
- Handle schema evolution gracefully
- Provide clear error messages for validation failures

## Required Data Consistency Measures

### 1. Atomic Operations
- Use database transactions for related operations
- Implement proper rollback mechanisms
- Handle connection failures gracefully

### 2. Concurrency Control
- Use database-level locking for balance updates
- Prevent race conditions in bet placement
- Handle multiple simultaneous dealers appropriately

### 3. Audit Logging
- Track all balance changes with reasons
- Log admin actions and game modifications
- Maintain historical data for analysis

## Database Performance Optimization

### 1. Query Optimization
- Use proper indexes for frequently accessed data
- Avoid N+1 query problems
- Implement connection pooling

### 2. Data Partitioning
- Archive old game data to separate tables
- Use time-based partitioning for large tables
- Implement efficient data archival policies

### 3. Caching Strategy
- Cache frequently accessed data (active games, user info)
- Implement cache invalidation strategies
- Use Redis or similar for session and game state caching

## Migration Requirements

### 1. Schema Migration Plan
1. Align shared schema with actual database schema
2. Update all field name references (camelCase ↔ snake_case)
3. Add missing fields to shared schema
4. Update all database interaction code

### 2. Data Migration Plan
1. Identify data that needs conversion
2. Plan backward compatibility measures
3. Test migration on staging environment
4. Implement rollback procedures

## Security Considerations

### 1. Data Validation
- Sanitize all inputs before database operations
- Prevent SQL injection through proper query construction
- Validate data types and ranges

### 2. Access Control
- Ensure proper row-level security in Supabase
- Validate user permissions for database operations
- Implement proper authentication checks

### 3. Data Encryption
- Encrypt sensitive data at rest
- Use proper password hashing
- Secure API key management

## Monitoring and Maintenance

### 1. Database Health Checks
- Monitor connection pool usage
- Track slow query performance
- Monitor index efficiency

### 2. Data Integrity Monitoring
- Implement consistency checks
- Monitor for orphaned records
- Track data growth patterns

This comprehensive analysis identifies the critical database schema and data flow issues that need to be addressed for a properly functioning game system.
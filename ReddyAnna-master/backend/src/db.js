// Simple in-memory database implementation for development
// This bypasses the Supabase issue and allows the app to function
let inMemoryDb = {
  game_settings: [],
  game_sessions: [],
  dealt_cards: [],
  player_bets: [],
  stream_settings: [],
  game_history: []
};

// Initialize with default values
inMemoryDb.game_settings = [
  { setting_key: 'max_bet_amount', setting_value: '50000', updated_at: new Date().toISOString() },
  { setting_key: 'min_bet_amount', setting_value: '1000', updated_at: new Date().toISOString() },
  { setting_key: 'game_timer', setting_value: '30', updated_at: new Date().toISOString() },
  { setting_key: 'opening_card', setting_value: 'A♠', updated_at: new Date().toISOString() }
];

inMemoryDb.stream_settings = [
  { setting_key: 'stream_url', setting_value: 'hero images/uhd_30fps.mp4', updated_at: new Date().toISOString() },
  { setting_key: 'stream_title', setting_value: 'Andar Bahar Live Game', updated_at: new Date().toISOString() },
  { setting_key: 'stream_status', setting_value: 'live', updated_at: new Date().toISOString() },
  { setting_key: 'stream_type', setting_value: 'video', updated_at: new Date().toISOString() }
];

// Helper function to execute database operations using in-memory storage
export async function query(table, operation, options = {}) {
  try {
    const { where, data, columns = '*', orderBy, limit, offset } = options;

    // Ensure the table exists in our in-memory database
    if (!inMemoryDb[table]) {
      inMemoryDb[table] = [];
    }

    switch (operation) {
      case 'select':
        try {
          let result = [...inMemoryDb[table]]; // Create a copy

          // Apply where conditions
          if (where) {
            if (where.column && where.value !== undefined) {
              result = result.filter(item => item[where.column] == where.value);
            }
            
            // Apply additional conditions if provided
            if (where.additionalConditions && Array.isArray(where.additionalConditions)) {
              where.additionalConditions.forEach(condition => {
                if (condition.column && condition.value !== undefined) {
                  result = result.filter(item => item[condition.column] == condition.value);
                }
              });
            }
          }

          // Apply ordering if specified
          if (orderBy && result.length > 0) {
            result.sort((a, b) => {
              if (a[orderBy.column] < b[orderBy.column]) {
                return orderBy.direction === 'desc' ? 1 : -1;
              }
              if (a[orderBy.column] > b[orderBy.column]) {
                return orderBy.direction === 'desc' ? -1 : 1;
              }
              return 0;
            });
          }

          // Apply limit and offset
          if (limit) {
            const start = offset || 0;
            result = result.slice(start, start + limit);
          }

          return result;
        } catch (queryError) {
          console.error(`Error in select query for ${table}:`, queryError);
          return [];
        }

      case 'insert':
        try {
          const newItem = {
            id: Date.now() + Math.floor(Math.random() * 1000), // Simple ID generation
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...data
          };
          
          inMemoryDb[table].push(newItem);
          return [newItem];
        } catch (insertError) {
          console.error(`Error in insert query for ${table}:`, insertError);
          return [];
        }

      case 'update':
        try {
          let itemsToUpdate = [...inMemoryDb[table]];
          let itemsToReturn = [];
          
          if (where && where.column && where.value !== undefined) {
            itemsToReturn = itemsToUpdate.filter(item => item[where.column] == where.value);
            
            // Apply additional conditions if provided
            if (where.additionalConditions && Array.isArray(where.additionalConditions)) {
              where.additionalConditions.forEach(condition => {
                if (condition.column && condition.value !== undefined) {
                  itemsToReturn = itemsToReturn.filter(item => item[condition.column] == condition.value);
                }
              });
            }
          } else {
            // If no where clause, update all items (like in reset-game)
            itemsToReturn = itemsToUpdate;
          }

          const updatedItems = [];
          inMemoryDb[table].forEach((item, index) => {
            const matchedItem = itemsToReturn.find(returnItem => 
              where && where.column && where.value !== undefined ? 
                item[where.column] == where.value : true);
                
            if (matchedItem) {
              // Check additional conditions for this specific item
              let matchesAdditional = true;
              if (where && where.additionalConditions && Array.isArray(where.additionalConditions)) {
                for (const condition of where.additionalConditions) {
                  if (condition.column && condition.value !== undefined) {
                    if (item[condition.column] != condition.value) {
                      matchesAdditional = false;
                      break;
                    }
                  }
                }
              }
              
              if (matchesAdditional) {
                Object.assign(item, data, { updated_at: new Date().toISOString() });
                updatedItems.push(item);
              }
            }
          });

          return updatedItems;
        } catch (updateError) {
          console.error(`Error in update query for ${table}:`, updateError);
          return [];
        }

      case 'delete':
        try {
          const initialLength = inMemoryDb[table].length;
          
          if (where && where.column && where.value !== undefined) {
            inMemoryDb[table] = inMemoryDb[table].filter(item => item[where.column] != where.value);
            
            // Apply additional conditions if provided
            if (where.additionalConditions && Array.isArray(where.additionalConditions)) {
              where.additionalConditions.forEach(condition => {
                if (condition.column && condition.value !== undefined) {
                  inMemoryDb[table] = inMemoryDb[table].filter(item => item[condition.column] != condition.value);
                }
              });
            }
          }

          return initialLength !== inMemoryDb[table].length;
        } catch (deleteError) {
          console.error(`Error in delete query for ${table}:`, deleteError);
          return false;
        }

      default:
        console.error(`Unknown operation: ${operation}`);
        return [];
    }
  } catch (error) {
    console.error('Database query error:', error);
    return operation === 'select' ? [] : false;
  }
}

export default inMemoryDb;
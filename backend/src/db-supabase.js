import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test connection
supabase.from('users').select('count').then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection error:', error);
  } else {
    console.log('Connected to Supabase database');
  }
});

// Helper function to execute queries
export const query = async (sqlOrTable, params = [], action = 'select', options = {}) => {
  try {
    // Check if first parameter is a raw SQL query (contains spaces, SELECT, INSERT, etc.)
    const isRawSQL = typeof sqlOrTable === 'string' &&
                     (sqlOrTable.includes(' ') ||
                      sqlOrTable.toUpperCase().includes('SELECT') ||
                      sqlOrTable.toUpperCase().includes('INSERT') ||
                      sqlOrTable.toUpperCase().includes('UPDATE') ||
                      sqlOrTable.toUpperCase().includes('DELETE'));
    
    if (isRawSQL) {
      // For raw SQL queries, we need to use Postgres RPC or handle differently
      // This is a limitation of Supabase client - it doesn't support raw SQL directly
      // We'll need to rewrite these queries to use Supabase's client methods
      
      // Parse basic SELECT queries
      if (sqlOrTable.toUpperCase().includes('SELECT')) {
        const tableMatch = sqlOrTable.match(/FROM\s+(\w+)/i);
        const whereMatch = sqlOrTable.match(/WHERE\s+(\w+)\s*=\s*\$?(\d+)/i);
        
        if (tableMatch) {
          const tableName = tableMatch[1];
          let query = supabase.from(tableName).select('*');
          
          if (whereMatch && params.length > 0) {
            const column = whereMatch[1];
            const value = params[0];
            query = query.eq(column, value);
          }
          
          const result = await query;
          
          if (result.error) {
            throw new Error(result.error.message);
          }
          
          return result.data || [];
        }
      }
      
      throw new Error('Raw SQL queries are not fully supported with Supabase client. Please use the Supabase client methods instead.');
    } else {
      // Use the table-based approach
      let result;
      const table = sqlOrTable;
      
      switch (action) {
        case 'select':
          result = await supabase.from(table).select(options.select || '*');
          if (options.where) result = result.eq(options.where.column, options.where.value);
          if (options.order) result = result.order(options.order.column, { ascending: options.order.ascending });
          if (options.limit) result = result.limit(options.limit);
          result = await result;
          break;
          
        case 'insert':
          result = await supabase.from(table).insert(options.data);
          if (options.select) result = result.select(options.select);
          result = await result;
          break;
          
        case 'update':
          result = supabase.from(table).update(options.data);
          if (options.where) result = result.eq(options.where.column, options.where.value);
          if (options.select) result = result.select(options.select);
          result = await result;
          break;
          
        case 'delete':
          result = supabase.from(table).delete();
          if (options.where) result = result.eq(options.where.column, options.where.value);
          result = await result;
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result.data || [];
    }
  } catch (error) {
    console.error(`Database query error:`, error);
    throw error;
  }
};

// Export the Supabase client for direct use if needed
export default supabase;
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
export const query = async (table, action = 'select', options = {}) => {
  try {
    let result;
    
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
    
    return result;
  } catch (error) {
    console.error(`Database query error on ${table}:`, error);
    throw error;
  }
};

// Export the Supabase client for direct use if needed
export default supabase;
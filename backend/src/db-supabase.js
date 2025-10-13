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
export const query = async (table, actionOrOptions, options = {}) => {
  try {
    // Handle different calling patterns:
    // 1. query(table, action, options)
    // 2. query(table, options) - when action is omitted
    
    let action = 'select';
    let queryOptions = {};
    
    if (typeof actionOrOptions === 'string') {
      action = actionOrOptions;
      queryOptions = options || {};
    } else if (typeof actionOrOptions === 'object') {
      queryOptions = actionOrOptions;
    }
    
    let result;
    
    switch (action) {
      case 'select':
        let query = supabase.from(table).select(queryOptions.select || '*');
        if (queryOptions.where) query = query.eq(queryOptions.where.column, queryOptions.where.value);
        if (queryOptions.order) query = query.order(queryOptions.order.column, { ascending: queryOptions.order.ascending });
        if (queryOptions.limit) query = query.limit(queryOptions.limit);
        result = await query;
        break;
        
      case 'insert':
        query = supabase.from(table).insert(queryOptions.data);
        if (queryOptions.select) query = query.select(queryOptions.select);
        result = await query;
        break;
        
      case 'update':
        query = supabase.from(table).update(queryOptions.data);
        if (queryOptions.where) query = query.eq(queryOptions.where.column, queryOptions.where.value);
        if (queryOptions.select) query = query.select(queryOptions.select);
        result = await query;
        break;
        
      case 'delete':
        query = supabase.from(table).delete();
        if (queryOptions.where) query = query.eq(queryOptions.where.column, queryOptions.where.value);
        result = await query;
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    return result.data || [];
  } catch (error) {
    console.error(`Database query error:`, error);
    throw error;
  }
};

// Export the Supabase client for direct use if needed
export default supabase;
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
    } else if (typeof actionOrOptions === 'object' && actionOrOptions !== null) {
      queryOptions = actionOrOptions;
    }
    
    let queryBuilder;
    let result;
    
    switch (action) {
      case 'select':
        queryBuilder = supabase.from(table).select(queryOptions.select || '*');
        if (queryOptions.where) queryBuilder = queryBuilder.eq(queryOptions.where.column, queryOptions.where.value);
        if (queryOptions.order) queryBuilder = queryBuilder.order(queryOptions.order.column, { ascending: queryOptions.order.ascending });
        if (queryOptions.limit) queryBuilder = queryBuilder.limit(queryOptions.limit);
        result = await queryBuilder;
        break;
        
      case 'insert':
        queryBuilder = supabase.from(table).insert(queryOptions.data);
        if (queryOptions.select) queryBuilder = queryBuilder.select(queryOptions.select);
        result = await queryBuilder;
        break;
        
      case 'update':
        queryBuilder = supabase.from(table).update(queryOptions.data);
        if (queryOptions.where) queryBuilder = queryBuilder.eq(queryOptions.where.column, queryOptions.where.value);
        if (queryOptions.select) queryBuilder = queryBuilder.select(queryOptions.select);
        result = await queryBuilder;
        break;
        
      case 'delete':
        queryBuilder = supabase.from(table).delete();
        if (queryOptions.where) queryBuilder = queryBuilder.eq(queryOptions.where.column, queryOptions.where.value);
        result = await queryBuilder;
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    if (result.error) {
      // Check if it's a table doesn't exist error
      if (result.error.code === 'PGRST116' || result.error.message.includes('relation') && result.error.message.includes('does not exist')) {
        console.error(`Table ${table} does not exist. Please run database initialization.`);
        throw new Error(`Table ${table} does not exist`);
      }
      throw new Error(result.error.message);
    }
    
    return result.data || [];
  } catch (error) {
    console.error(`Database query error for table ${table}:`, error.message);
    throw error;
  }
};

// Export the Supabase client for direct use if needed
export default supabase;
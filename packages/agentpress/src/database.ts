import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Centralized database connection management for AgentPress using Supabase.
 * Direct port from Python services/supabase.py
 */
export class DBConnection {
  private static instance: DBConnection | null = null;
  private static initialized = false;
  private client: SupabaseClient | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  static getInstance(): DBConnection {
    if (!DBConnection.instance) {
      DBConnection.instance = new DBConnection();
    }
    return DBConnection.instance;
  }

  /**
   * Initialize the database connection
   */
  async initialize(): Promise<void> {
    if (DBConnection.initialized) {
      return;
    }

    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
      }

      this.client = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      DBConnection.initialized = true;
      console.log('Database connection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  /**
   * Get the Supabase client instance
   */
  async getClient(): Promise<SupabaseClient> {
    if (!DBConnection.initialized || !this.client) {
      await this.initialize();
    }
    
    if (!this.client) {
      throw new Error('Database client not initialized');
    }
    
    return this.client;
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const { data, error } = await client.from('threads').select('count').limit(1);
      
      if (error) {
        console.error('Database connection test failed:', error);
        return false;
      }
      
      console.log('Database connection test successful');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.client) {
      // Supabase client doesn't have explicit close method
      this.client = null;
      DBConnection.initialized = false;
      console.log('Database connection closed');
    }
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static reset(): void {
    DBConnection.instance = null;
    DBConnection.initialized = false;
  }
}

/**
 * Convenience function to get Supabase client
 * Matches Python get_supabase_client() function
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  const db = DBConnection.getInstance();
  return await db.getClient();
}

/**
 * Database utility functions matching Python patterns
 */
export class DatabaseUtils {
  /**
   * Execute a query with error handling
   */
  static async executeQuery<T>(
    queryFn: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>
  ): Promise<T> {
    try {
      const client = await getSupabaseClient();
      const { data, error } = await queryFn(client);
      
      if (error) {
        throw new Error();
      }
      
      if (data === null) {
        throw new Error('Query returned null data');
      }
      
      return data;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Insert data with automatic error handling
   */
  static async insert<T>(
    table: string,
    data: Record<string, any>
  ): Promise<T> {
    return this.executeQuery(async (client) => {
      return await client.from(table).insert(data).select().single();
    });
  }

  /**
   * Update data with automatic error handling
   */
  static async update<T>(
    table: string,
    data: Record<string, any>,
    filter: Record<string, any>
  ): Promise<T> {
    return this.executeQuery(async (client) => {
      let query = client.from(table).update(data);
      
      // Apply filters
      for (const [key, value] of Object.entries(filter)) {
        query = query.eq(key, value);
      }
      
      return await query.select().single();
    });
  }

  /**
   * Select data with automatic error handling
   */
  static async select<T>(
    table: string,
    columns: string = '*',
    filter?: Record<string, any>
  ): Promise<T[]> {
    return this.executeQuery(async (client) => {
      let query = client.from(table).select(columns);
      
      // Apply filters if provided
      if (filter) {
        for (const [key, value] of Object.entries(filter)) {
          query = query.eq(key, value);
        }
      }
      
      return await query;
    });
  }

  /**
   * Delete data with automatic error handling
   */
  static async delete(
    table: string,
    filter: Record<string, any>
  ): Promise<void> {
    await this.executeQuery(async (client) => {
      let query = client.from(table).delete();
      
      // Apply filters
      for (const [key, value] of Object.entries(filter)) {
        query = query.eq(key, value);
      }
      
      return await query;
    });
  }
}

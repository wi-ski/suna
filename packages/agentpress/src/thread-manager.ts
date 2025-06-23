import { SupabaseClient } from '@supabase/supabase-js';
import { DBConnection, getSupabaseClient } from './database.js';

export interface ThreadData {
  thread_id: string;
  project_id: string;
  account_id: string;
  agent_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MessageData {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Thread Manager for handling conversation state and persistence
 * Direct port from Python agentpress/thread_manager.py
 */
export class ThreadManager {
  private db: DBConnection;
  private threadId: string;
  private projectId: string;
  private accountId: string;
  private agentId?: string;
  private metadata: Record<string, any>;

  constructor(
    threadId: string,
    projectId: string,
    accountId: string,
    agentId?: string,
    metadata: Record<string, any> = {}
  ) {
    this.db = DBConnection.getInstance();
    this.threadId = threadId;
    this.projectId = projectId;
    this.accountId = accountId;
    this.agentId = agentId;
    this.metadata = metadata;
  }

  /**
   * Initialize thread manager and ensure thread exists
   */
  async initialize(): Promise<void> {
    try {
      await this.db.initialize();
      await this.ensureThreadExists();
    } catch (error) {
      console.error('Failed to initialize ThreadManager:', error);
      throw error;
    }
  }

  /**
   * Ensure thread exists in database
   */
  private async ensureThreadExists(): Promise<void> {
    try {
      const client = await getSupabaseClient();
      
      // Check if thread exists
      const { data: existingThread, error: selectError } = await client
        .from('threads')
        .select('*')
        .eq('thread_id', this.threadId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (!existingThread) {
        // Create new thread
        const { error: insertError } = await client
          .from('threads')
          .insert({
            thread_id: this.threadId,
            project_id: this.projectId,
            account_id: this.accountId,
            agent_id: this.agentId,
            metadata: this.metadata,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          throw insertError;
        }

        console.log();
      } else {
        console.log();
      }
    } catch (error) {
      console.error('Failed to ensure thread exists:', error);
      throw error;
    }
  }

  /**
   * Add message to thread
   */
  async addMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<MessageData> {
    try {
      const client = await getSupabaseClient();
      
      const messageData = {
        thread_id: this.threadId,
        role,
        content,
        metadata,
        created_at: new Date().toISOString()
      };

      const { data, error } = await client
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update thread timestamp
      await this.updateThreadTimestamp();

      return data as MessageData;
    } catch (error) {
      console.error('Failed to add message:', error);
      throw error;
    }
  }

  /**
   * Get thread messages with optional limit
   */
  async getMessages(limit?: number): Promise<MessageData[]> {
    try {
      const client = await getSupabaseClient();
      
      let query = client
        .from('messages')
        .select('*')
        .eq('thread_id', this.threadId)
        .order('created_at', { ascending: true });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as MessageData[];
    } catch (error) {
      console.error('Failed to get messages:', error);
      throw error;
    }
  }

  /**
   * Get recent messages (last N messages)
   */
  async getRecentMessages(count: number = 10): Promise<MessageData[]> {
    try {
      const client = await getSupabaseClient();
      
      const { data, error } = await client
        .from('messages')
        .select('*')
        .eq('thread_id', this.threadId)
        .order('created_at', { ascending: false })
        .limit(count);

      if (error) {
        throw error;
      }

      // Reverse to get chronological order
      return (data as MessageData[]).reverse();
    } catch (error) {
      console.error('Failed to get recent messages:', error);
      throw error;
    }
  }

  /**
   * Update thread metadata
   */
  async updateMetadata(newMetadata: Record<string, any>): Promise<void> {
    try {
      const client = await getSupabaseClient();
      
      this.metadata = { ...this.metadata, ...newMetadata };

      const { error } = await client
        .from('threads')
        .update({
          metadata: this.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('thread_id', this.threadId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update thread metadata:', error);
      throw error;
    }
  }

  /**
   * Update thread timestamp
   */
  private async updateThreadTimestamp(): Promise<void> {
    try {
      const client = await getSupabaseClient();
      
      const { error } = await client
        .from('threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('thread_id', this.threadId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update thread timestamp:', error);
      throw error;
    }
  }

  /**
   * Get thread data
   */
  async getThreadData(): Promise<ThreadData | null> {
    try {
      const client = await getSupabaseClient();
      
      const { data, error } = await client
        .from('threads')
        .select('*')
        .eq('thread_id', this.threadId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Thread not found
        }
        throw error;
      }

      return data as ThreadData;
    } catch (error) {
      console.error('Failed to get thread data:', error);
      throw error;
    }
  }

  /**
   * Delete thread and all associated messages
   */
  async deleteThread(): Promise<void> {
    try {
      const client = await getSupabaseClient();
      
      // Delete messages first (due to foreign key constraints)
      const { error: messagesError } = await client
        .from('messages')
        .delete()
        .eq('thread_id', this.threadId);

      if (messagesError) {
        throw messagesError;
      }

      // Delete thread
      const { error: threadError } = await client
        .from('threads')
        .delete()
        .eq('thread_id', this.threadId);

      if (threadError) {
        throw threadError;
      }

      console.log();
    } catch (error) {
      console.error('Failed to delete thread:', error);
      throw error;
    }
  }

  /**
   * Get conversation context for LLM
   */
  async getConversationContext(maxMessages: number = 20): Promise<string> {
    try {
      const messages = await this.getRecentMessages(maxMessages);
      
      return messages
        .map(msg => )
        .join('\n\n');
    } catch (error) {
      console.error('Failed to get conversation context:', error);
      throw error;
    }
  }

  // Getters
  get threadIdValue(): string { return this.threadId; }
  get projectIdValue(): string { return this.projectId; }
  get accountIdValue(): string { return this.accountId; }
  get agentIdValue(): string | undefined { return this.agentId; }
  get metadataValue(): Record<string, any> { return this.metadata; }
}

/**
 * Factory function to create ThreadManager instances
 */
export async function createThreadManager(
  threadId: string,
  projectId: string,
  accountId: string,
  agentId?: string,
  metadata: Record<string, any> = {}
): Promise<ThreadManager> {
  const threadManager = new ThreadManager(threadId, projectId, accountId, agentId, metadata);
  await threadManager.initialize();
  return threadManager;
}

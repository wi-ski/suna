import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getSupabaseClient, ThreadManager } from '@suna/agentpress';
import { runAgent } from '../agent/runner.js';

// Request schemas
const RunAgentSchema = z.object({
  thread_id: z.string(),
  project_id: z.string(),
  message: z.string().optional(),
  stream: z.boolean().default(false),
  model_name: z.string().default('anthropic/claude-3-sonnet-20240229'),
  max_iterations: z.number().default(100),
  enable_thinking: z.boolean().default(false)
});

const StopAgentSchema = z.object({
  agent_run_id: z.string()
});

export async function agentRoutes(fastify: FastifyInstance) {
  
  // Run agent endpoint - direct port from Python agent/api.py
  fastify.post('/agent/run', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = RunAgentSchema.parse(request.body);
      const client = await getSupabaseClient();

      // Check for running agents (matching Python logic)
      const projectThreads = await client
        .from('threads')
        .select('thread_id')
        .eq('project_id', body.project_id);

      if (projectThreads.error) {
        throw projectThreads.error;
      }

      const projectThreadIds = projectThreads.data.map(t => t.thread_id);
      
      if (projectThreadIds.length > 0) {
        const activeRuns = await client
          .from('agent_runs')
          .select('id')
          .in('thread_id', projectThreadIds)
          .eq('status', 'running');

        if (activeRuns.error) {
          throw activeRuns.error;
        }

        if (activeRuns.data.length > 0) {
          return reply.status(409).send({
            error: 'Agent already running',
            message: 'An agent is already running for this project. Please stop it before starting a new one.',
            running_agent_ids: activeRuns.data.map(r => r.id)
          });
        }
      }

      // Get thread data
      const threadResult = await client
        .from('threads')
        .select('project_id, account_id, agent_id, metadata')
        .eq('thread_id', body.thread_id)
        .single();

      if (threadResult.error) {
        throw threadResult.error;
      }

      const threadData = threadResult.data;

      // Create agent run record
      const agentRunId = crypto.randomUUID();
      const agentRun = await client
        .from('agent_runs')
        .insert({
          id: agentRunId,
          thread_id: body.thread_id,
          project_id: body.project_id,
          account_id: threadData.account_id,
          status: 'running',
          model_name: body.model_name,
          max_iterations: body.max_iterations,
          enable_thinking: body.enable_thinking,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (agentRun.error) {
        throw agentRun.error;
      }

      // Add user message if provided
      if (body.message) {
        const threadManager = new ThreadManager(
          body.thread_id,
          body.project_id,
          threadData.account_id,
          threadData.agent_id,
          threadData.metadata || {}
        );
        
        await threadManager.initialize();
        await threadManager.addMessage('user', body.message);
      }

      // Start agent execution
      if (body.stream) {
        // Streaming response
        reply.type('text/event-stream');
        reply.header('Cache-Control', 'no-cache');
        reply.header('Connection', 'keep-alive');

        const stream = await runAgent({
          threadId: body.thread_id,
          projectId: body.project_id,
          agentRunId,
          stream: true,
          modelName: body.model_name,
          maxIterations: body.max_iterations,
          enableThinking: body.enable_thinking
        });

        for await (const chunk of stream) {
          reply.raw.write();
        }
        
        reply.raw.end();
      } else {
        // Non-streaming response
        const result = await runAgent({
          threadId: body.thread_id,
          projectId: body.project_id,
          agentRunId,
          stream: false,
          modelName: body.model_name,
          maxIterations: body.max_iterations,
          enableThinking: body.enable_thinking
        });

        return {
          success: true,
          agent_run_id: agentRunId,
          result
        };
      }

    } catch (error) {
      fastify.log.error('Agent run error:', error);
      return reply.status(500).send({
        error: 'Agent execution failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Stop agent endpoint
  fastify.post('/agent/stop', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = StopAgentSchema.parse(request.body);
      const client = await getSupabaseClient();

      // Update agent run status
      const { error } = await client
        .from('agent_runs')
        .update({
          status: 'stopped',
          updated_at: new Date().toISOString()
        })
        .eq('id', body.agent_run_id);

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Agent stopped successfully'
      };

    } catch (error) {
      fastify.log.error('Agent stop error:', error);
      return reply.status(500).send({
        error: 'Failed to stop agent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get agent run status
  fastify.get('/agent/run/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const client = await getSupabaseClient();
      
      const agentRun = await client
        .from('agent_runs')
        .select('*')
        .eq('id', request.params.id)
        .single();

      if (agentRun.error) {
        throw agentRun.error;
      }

      return {
        success: true,
        agent_run: agentRun.data
      };

    } catch (error) {
      fastify.log.error('Get agent run error:', error);
      return reply.status(500).send({
        error: 'Failed to get agent run',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

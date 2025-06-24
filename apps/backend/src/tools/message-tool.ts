import { Tool, ToolResult, openApiSchema, xmlSchema } from '@suna/agentpress';
import { promises as fs } from 'fs';
import { resolve } from 'path';

/**
 * Message Tool for user communication
 * Direct port from Python agent/tools/message_tool.py
 */
export class MessageTool extends Tool {
  private workspacePath = '/workspace';

  constructor() {
    super();
  }

  private cleanPath(filePath: string): string {
    if (filePath.startsWith('/workspace/')) filePath = filePath.substring(11);
    if (filePath.startsWith('/workspace')) filePath = filePath.substring(10);
    if (filePath.startsWith('/')) filePath = filePath.substring(1);
    return resolve(this.workspacePath, filePath);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  @openApiSchema({
    name: 'ask',
    description: 'Ask the user a question and wait for their response. Use this when you need user input, clarification, or approval.',
    parameters: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The question or message to send to the user'
        },
        attachments: {
          type: 'string',
          description: 'Optional comma-separated list of file paths to attach',
          default: ''
        }
      },
      required: ['text']
    }
  })
  @xmlSchema({
    name: 'ask',
    description: 'Ask the user a question and wait for their response',
    parameters: [
      { name: 'text', type: 'string', description: 'The question or message to send to the user' },
      { name: 'attachments', type: 'string', description: 'Optional comma-separated list of file paths to attach' }
    ]
  })
  async ask(text: string, attachments: string = ''): Promise<ToolResult> {
    try {
      const attachmentList: string[] = [];
      
      if (attachments.trim()) {
        const paths = attachments.split(',').map(p => p.trim());
        
        for (const path of paths) {
          if (path) {
            const fullPath = this.cleanPath(path);
            if (await this.fileExists(fullPath)) {
              attachmentList.push(path);
            }
          }
        }
      }

      // This would integrate with the frontend to show the message to the user
      // For now, we'll return a structured response that the agent runner can handle
      return {
        success: true,
        output: 'Message sent to user. Waiting for response...',
        metadata: {
          type: 'user_interaction',
          action: 'ask',
          text,
          attachments: attachmentList,
          requires_response: true
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: ,
        metadata: {
          type: 'user_interaction',
          action: 'ask',
          error_type: error.name || 'UnknownError'
        }
      };
    }
  }

  @openApiSchema({
    name: 'complete',
    description: 'Signal that the task is complete and end the agent execution',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  })
  @xmlSchema({
    name: 'complete',
    description: 'Signal that the task is complete and end the agent execution',
    parameters: []
  })
  async complete(): Promise<ToolResult> {
    return {
      success: true,
      output: 'Task completed successfully.',
      metadata: {
        type: 'execution_control',
        action: 'complete',
        should_terminate: true
      }
    };
  }
}

import { promises as fs } from 'fs';
import { resolve } from 'path';
import { Tool, ToolResult, openApiSchema, xmlSchema } from '@suna/agentpress';
import { LLMService } from '../services/llm.js';

/**
 * Vision Tool for image analysis
 * Direct port from Python agent/tools/sb_vision_tool.py
 */
export class VisionTool extends Tool {
  private llmService: LLMService;
  private workspacePath = '/workspace';

  constructor() {
    super();
    this.llmService = new LLMService();
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

  private async getImageBase64(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return buffer.toString('base64');
  }

  private getImageMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  @openApiSchema({
    name: 'see_image',
    description: 'Analyze and describe images from the workspace',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Path to the image file in the workspace'
        },
        question: {
          type: 'string',
          description: 'Optional specific question about the image',
          default: 'Describe what you see in this image in detail.'
        }
      },
      required: ['file_path']
    }
  })
  @xmlSchema({
    name: 'see-image',
    description: 'Analyze and describe images from the workspace',
    parameters: [
      { name: 'file_path', type: 'string', description: 'Path to the image file in the workspace' },
      { name: 'question', type: 'string', description: 'Optional specific question about the image' }
    ]
  })
  async seeImage(filePath: string, question: string = 'Describe what you see in this image in detail.'): Promise<ToolResult> {
    try {
      const fullPath = this.cleanPath(filePath);
      
      // Check if file exists
      if (!(await this.fileExists(fullPath))) {
        return {
          success: false,
          error: 
        };
      }

      // Get file stats
      const stats = await fs.stat(fullPath);
      const maxSize = 10 * 1024 * 1024; // 10MB limit
      
      if (stats.size > maxSize) {
        return {
          success: false,
          error: 
        };
      }

      // Get image as base64
      const imageBase64 = await this.getImageBase64(fullPath);
      const mimeType = this.getImageMimeType(fullPath);

      // Analyze image with vision model
      const response = await this.llmService.generateWithVision(
        question,
        [{
          type: 'base64',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: imageBase64
          }
        }]
      );

      return {
        success: true,
        output: ,
        metadata: {
          file_path: filePath,
          full_path: fullPath,
          file_size: stats.size,
          mime_type: mimeType,
          analysis: response.content,
          usage: response.usage
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: ,
        metadata: {
          file_path: filePath,
          error_type: error.name || 'UnknownError'
        }
      };
    }
  }
}

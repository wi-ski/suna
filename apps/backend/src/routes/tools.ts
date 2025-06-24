import { FastifyInstance } from 'fastify';
import { FileTool } from '../tools/file-tool.js';
import { ShellTool } from '../tools/shell-tool.js';
import { BrowserTool } from '../tools/browser-tool.js';
import { WebSearchTool } from '../tools/web-search-tool.js';
import { VisionTool } from '../tools/vision-tool.js';
import { MessageTool } from '../tools/message-tool.js';

export async function toolRoutes(fastify: FastifyInstance) {
  const fileTool = new FileTool();
  const shellTool = new ShellTool();
  const browserTool = new BrowserTool();
  const webSearchTool = new WebSearchTool();
  const visionTool = new VisionTool();
  const messageTool = new MessageTool();

  // File operations
  fastify.post('/tools/file/create', async (request, reply) => {
    const { file_path, file_contents } = request.body as any;
    const result = await fileTool.createFile(file_path, file_contents);
    return result;
  });

  fastify.post('/tools/file/read', async (request, reply) => {
    const { file_path } = request.body as any;
    const result = await fileTool.readFile(file_path);
    return result;
  });

  // Shell operations
  fastify.post('/tools/shell/execute', async (request, reply) => {
    const { command, session_name, blocking } = request.body as any;
    const result = await shellTool.executeCommand(command, session_name, blocking);
    return result;
  });

  // Browser operations
  fastify.post('/tools/browser/navigate', async (request, reply) => {
    const { url } = request.body as any;
    const result = await browserTool.navigateTo(url);
    return result;
  });

  // Web search
  fastify.post('/tools/search', async (request, reply) => {
    const { query, num_results } = request.body as any;
    const result = await webSearchTool.search(query, num_results);
    return result;
  });

  // Vision analysis
  fastify.post('/tools/vision/analyze', async (request, reply) => {
    const { file_path } = request.body as any;
    const result = await visionTool.seeImage(file_path);
    return result;
  });

  // Message tool
  fastify.post('/tools/message/ask', async (request, reply) => {
    const { text, attachments } = request.body as any;
    const result = await messageTool.ask(text, attachments);
    return result;
  });
}

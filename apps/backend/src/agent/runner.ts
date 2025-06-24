import { LLMService } from '../services/llm.js';
import { ToolRegistry } from '@suna/agentpress';
import { FileTool } from '../tools/file-tool.js';
import { ShellTool } from '../tools/shell-tool.js';
import { BrowserTool } from '../tools/browser-tool.js';
import { WebSearchTool } from '../tools/web-search-tool.js';
import { VisionTool } from '../tools/vision-tool.js';
import { MessageTool } from '../tools/message-tool.js';

export class AgentRunner {
  private llm: LLMService;
  private tools: ToolRegistry;

  constructor() {
    this.llm = new LLMService();
    this.tools = new ToolRegistry();
    this.registerTools();
  }

  private registerTools() {
    this.tools.registerTool(FileTool);
    this.tools.registerTool(ShellTool);
    this.tools.registerTool(BrowserTool);
    this.tools.registerTool(WebSearchTool);
    this.tools.registerTool(VisionTool);
    this.tools.registerTool(MessageTool);
  }

  async runAgent(message: string): Promise<string> {
    const response = await this.llm.generateResponse(message);
    return response.content;
  }
}

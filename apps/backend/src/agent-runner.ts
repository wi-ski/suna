import { FileTool } from "./tools/file-tool.js";
import { ShellTool } from "./tools/shell-tool.js";
import { ToolRegistry } from "@suna/agentpress";

export class AgentRunner {
  private toolRegistry = new ToolRegistry();

  constructor() {
    this.toolRegistry.registerTool(FileTool);
    this.toolRegistry.registerTool(ShellTool);
  }

  async runAgent(message: string): Promise<string> {
    // Basic agent runner - would integrate with LLM here
    return ;
  }
}

import { spawn } from "child_process";
import { Tool, ToolResult } from "@suna/agentpress";

export class ShellTool extends Tool {
  async executeCommand(command: string): Promise<ToolResult> {
    return new Promise((resolve) => {
      const proc = spawn("bash", ["-c", command], { cwd: "/workspace" });
      let output = "";
      proc.stdout.on("data", (data) => output += data);
      proc.on("close", (code) => {
        resolve({ success: code === 0, output });
      });
    });
  }
}

import { AgentRunner } from "./apps/backend/src/agent-runner.js";

async function test() {
  console.log("🚀 Testing Suna TypeScript Migration");
  
  const runner = new AgentRunner();
  const result = await runner.runAgent("Hello TypeScript Suna!");
  
  console.log("✅ Result:", result);
  console.log("✅ TypeScript Suna is working!");
}

test().catch(console.error);

import { Tool, OpenAPISchema, XMLSchema, SchemaType } from './tool.js';

export interface ToolInfo {
  instance: Tool;
  schemas: Record<string, { type: SchemaType; schema: OpenAPISchema | XMLSchema }>;
  functionNames?: string[];
}

/**
 * Registry for managing and accessing tools.
 * 
 * Maintains a collection of tool instances and their schemas, allowing for
 * selective registration of tool functions and easy access to tool capabilities.
 * 
 * Direct port from Python AgentPress ToolRegistry
 */
export class ToolRegistry {
  private tools: Record<string, ToolInfo> = {};
  private xmlTools: Record<string, ToolInfo> = {};

  constructor() {
    console.log('Initialized new ToolRegistry instance');
  }

  /**
   * Register a tool with optional function filtering
   * @param toolClass Tool class constructor
   * @param functionNames Optional list of function names to register
   * @param options Additional options for tool registration
   */
  registerTool<T extends Tool>(
    toolClass: new (...args: any[]) => T,
    functionNames?: string[],
    ...args: any[]
  ): void {
    try {
      // Create tool instance
      const toolInstance = new toolClass(...args);
      const toolName = toolClass.name;

      // Get schemas from the tool class
      const allSchemas = (toolClass as any).getSchemas();
      
      // Filter schemas if function names are specified
      let filteredSchemas = allSchemas;
      if (functionNames && functionNames.length > 0) {
        filteredSchemas = {};
        for (const funcName of functionNames) {
          if (allSchemas[funcName]) {
            filteredSchemas[funcName] = allSchemas[funcName];
          }
        }
      }

      const toolInfo: ToolInfo = {
        instance: toolInstance,
        schemas: filteredSchemas,
        functionNames
      };

      // Register in main tools registry
      this.tools[toolName] = toolInfo;

      // Also register XML tools separately for easy access
      const xmlSchemas = Object.entries(filteredSchemas).filter(
        ([_, schemaInfo]) => schemaInfo.type === 'xml'
      );
      
      if (xmlSchemas.length > 0) {
        this.xmlTools[toolName] = toolInfo;
      }

      console.log();
    } catch (error) {
      console.error(, error);
      throw error;
    }
  }

  /**
   * Get a specific tool by name
   */
  getTool(toolName: string): Tool | null {
    const toolInfo = this.tools[toolName];
    return toolInfo ? toolInfo.instance : null;
  }

  /**
   * Get a tool by XML tag name
   */
  getXMLTool(xmlTagName: string): Tool | null {
    // Search through XML tools for matching tag
    for (const [toolName, toolInfo] of Object.entries(this.xmlTools)) {
      for (const [funcName, schemaInfo] of Object.entries(toolInfo.schemas)) {
        if (schemaInfo.type === 'xml') {
          const xmlSchema = schemaInfo.schema as XMLSchema;
          if (xmlSchema.name === xmlTagName) {
            return toolInfo.instance;
          }
        }
      }
    }
    return null;
  }

  /**
   * Get OpenAPI schemas for function calling
   */
  getOpenAPISchemas(): Record<string, OpenAPISchema> {
    const schemas: Record<string, OpenAPISchema> = {};
    
    for (const [toolName, toolInfo] of Object.entries(this.tools)) {
      for (const [funcName, schemaInfo] of Object.entries(toolInfo.schemas)) {
        if (schemaInfo.type === 'openapi') {
          const openApiSchema = schemaInfo.schema as OpenAPISchema;
          schemas[] = openApiSchema;
        }
      }
    }
    
    return schemas;
  }

  /**
   * Get XML examples for tool usage
   */
  getXMLExamples(): Record<string, string> {
    const examples: Record<string, string> = {};
    
    for (const [toolName, toolInfo] of Object.entries(this.xmlTools)) {
      for (const [funcName, schemaInfo] of Object.entries(toolInfo.schemas)) {
        if (schemaInfo.type === 'xml') {
          const xmlSchema = schemaInfo.schema as XMLSchema;
          examples[xmlSchema.name] = xmlSchema.example;
        }
      }
    }
    
    return examples;
  }

  /**
   * Get all registered tools
   */
  getAllTools(): Record<string, Tool> {
    const tools: Record<string, Tool> = {};
    for (const [toolName, toolInfo] of Object.entries(this.tools)) {
      tools[toolName] = toolInfo.instance;
    }
    return tools;
  }

  /**
   * Get tool schemas by tool name
   */
  getToolSchemas(toolName: string): Record<string, { type: SchemaType; schema: OpenAPISchema | XMLSchema }> | null {
    const toolInfo = this.tools[toolName];
    return toolInfo ? toolInfo.schemas : null;
  }

  /**
   * Check if a tool is registered
   */
  hasTool(toolName: string): boolean {
    return toolName in this.tools;
  }

  /**
   * Get list of all registered tool names
   */
  getToolNames(): string[] {
    return Object.keys(this.tools);
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools = {};
    this.xmlTools = {};
    console.log('Cleared all registered tools');
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalTools: number;
    totalFunctions: number;
    xmlTools: number;
    openApiTools: number;
  } {
    let totalFunctions = 0;
    let xmlTools = 0;
    let openApiTools = 0;

    for (const toolInfo of Object.values(this.tools)) {
      totalFunctions += Object.keys(toolInfo.schemas).length;
      
      const hasXML = Object.values(toolInfo.schemas).some(s => s.type === 'xml');
      const hasOpenAPI = Object.values(toolInfo.schemas).some(s => s.type === 'openapi');
      
      if (hasXML) xmlTools++;
      if (hasOpenAPI) openApiTools++;
    }

    return {
      totalTools: Object.keys(this.tools).length,
      totalFunctions,
      xmlTools,
      openApiTools
    };
  }
}

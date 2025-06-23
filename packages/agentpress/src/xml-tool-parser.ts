/**
 * XML Tool Parser for AgentPress
 * Direct port from Python agentpress/xml_tool_parser.py
 */

export interface ParsedToolCall {
  toolName: string;
  functionName: string;
  parameters: Record<string, any>;
  rawXml: string;
}

export interface ParseResult {
  success: boolean;
  toolCalls: ParsedToolCall[];
  errors: string[];
  remainingText: string;
}

/**
 * Parse XML tool calls from agent responses
 */
export class XMLToolParser {
  private static readonly FUNCTION_CALLS_PATTERN = /<function_calls>(.*?)<\/function_calls>/gs;
  private static readonly INVOKE_PATTERN = /<invoke\s+name="([^"]+)">(.*?)<\/invoke>/gs;
  private static readonly PARAMETER_PATTERN = /<parameter\s+name="([^"]+)">(.*?)<\/parameter>/gs;

  /**
   * Parse XML tool calls from text
   */
  static parseToolCalls(text: string): ParseResult {
    const result: ParseResult = {
      success: true,
      toolCalls: [],
      errors: [],
      remainingText: text
    };

    try {
      // Find all function_calls blocks
      const functionCallsMatches = Array.from(text.matchAll(this.FUNCTION_CALLS_PATTERN));
      
      if (functionCallsMatches.length === 0) {
        return result; // No tool calls found, not an error
      }

      for (const functionCallsMatch of functionCallsMatches) {
        const functionCallsContent = functionCallsMatch[1];
        
        // Find all invoke blocks within this function_calls block
        const invokeMatches = Array.from(functionCallsContent.matchAll(this.INVOKE_PATTERN));
        
        for (const invokeMatch of invokeMatches) {
          const toolName = invokeMatch[1];
          const invokeContent = invokeMatch[2];
          
          try {
            const toolCall = this.parseInvokeBlock(toolName, invokeContent, invokeMatch[0]);
            result.toolCalls.push(toolCall);
          } catch (error) {
            result.errors.push();
            result.success = false;
          }
        }
      }

      // Remove parsed function_calls blocks from remaining text
      result.remainingText = text.replace(this.FUNCTION_CALLS_PATTERN, '').trim();

    } catch (error) {
      result.errors.push();
      result.success = false;
    }

    return result;
  }

  /**
   * Parse a single invoke block
   */
  private static parseInvokeBlock(toolName: string, content: string, rawXml: string): ParsedToolCall {
    const parameters: Record<string, any> = {};
    
    // Find all parameter blocks
    const parameterMatches = Array.from(content.matchAll(this.PARAMETER_PATTERN));
    
    for (const paramMatch of parameterMatches) {
      const paramName = paramMatch[1];
      const paramValue = paramMatch[2].trim();
      
      // Try to parse parameter value
      parameters[paramName] = this.parseParameterValue(paramValue);
    }

    return {
      toolName,
      functionName: toolName, // In XML format, tool name is the function name
      parameters,
      rawXml
    };
  }

  /**
   * Parse parameter value with type inference
   */
  private static parseParameterValue(value: string): any {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, try boolean
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      
      // Try number
      const numValue = Number(value);
      if (!isNaN(numValue) && isFinite(numValue)) {
        return numValue;
      }
      
      // Return as string
      return value;
    }
  }

  /**
   * Validate tool call structure
   */
  static validateToolCall(toolCall: ParsedToolCall): boolean {
    return !!(
      toolCall.toolName &&
      toolCall.functionName &&
      typeof toolCall.parameters === 'object' &&
      toolCall.rawXml
    );
  }

  /**
   * Extract tool names from text
   */
  static extractToolNames(text: string): string[] {
    const toolNames: string[] = [];
    const matches = Array.from(text.matchAll(this.INVOKE_PATTERN));
    
    for (const match of matches) {
      const toolName = match[1];
      if (!toolNames.includes(toolName)) {
        toolNames.push(toolName);
      }
    }
    
    return toolNames;
  }
}

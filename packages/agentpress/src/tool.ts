import { z } from 'zod';

// Tool result interface matching Python version
export interface ToolResult {
  success: boolean;
  output?: any;
  error?: string;
  metadata?: Record<string, any>;
}

// Schema types for tool definitions
export type SchemaType = 'openapi' | 'xml';

export interface OpenAPISchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface XMLSchema {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
  example: string;
}

// Decorator for OpenAPI schema
export function openApiSchema(schema: OpenAPISchema) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target.constructor._schemas) {
      target.constructor._schemas = {};
    }
    target.constructor._schemas[propertyKey] = {
      type: 'openapi',
      schema
    };
  };
}

// Decorator for XML schema
export function xmlSchema(schema: XMLSchema) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    if (!target.constructor._schemas) {
      target.constructor._schemas = {};
    }
    target.constructor._schemas[propertyKey] = {
      type: 'xml',
      schema
    };
  };
}

// Base Tool class - direct port from Python AgentPress
export abstract class Tool {
  private static _schemas: Record<string, { type: SchemaType; schema: OpenAPISchema | XMLSchema }> = {};

  constructor() {}

  // Get all schemas for this tool class
  static getSchemas(): Record<string, { type: SchemaType; schema: OpenAPISchema | XMLSchema }> {
    return this._schemas || {};
  }

  // Get OpenAPI schemas only
  static getOpenAPISchemas(): Record<string, OpenAPISchema> {
    const schemas: Record<string, OpenAPISchema> = {};
    for (const [name, schemaInfo] of Object.entries(this.getSchemas())) {
      if (schemaInfo.type === 'openapi') {
        schemas[name] = schemaInfo.schema as OpenAPISchema;
      }
    }
    return schemas;
  }

  // Get XML schemas only
  static getXMLSchemas(): Record<string, XMLSchema> {
    const schemas: Record<string, XMLSchema> = {};
    for (const [name, schemaInfo] of Object.entries(this.getSchemas())) {
      if (schemaInfo.type === 'xml') {
        schemas[name] = schemaInfo.schema as XMLSchema;
      }
    }
    return schemas;
  }

  // Get XML examples for tool usage
  static getXMLExamples(): Record<string, string> {
    const examples: Record<string, string> = {};
    for (const [name, schemaInfo] of Object.entries(this.getSchemas())) {
      if (schemaInfo.type === 'xml') {
        const xmlSchema = schemaInfo.schema as XMLSchema;
        examples[name] = xmlSchema.example;
      }
    }
    return examples;
  }

  // Validate parameters against schema
  protected validateParameters(methodName: string, parameters: any): boolean {
    const schemas = (this.constructor as typeof Tool).getSchemas();
    const schemaInfo = schemas[methodName];
    
    if (!schemaInfo) {
      return true; // No schema defined, assume valid
    }

    // Basic validation - could be enhanced with Zod
    if (schemaInfo.type === 'openapi') {
      const schema = schemaInfo.schema as OpenAPISchema;
      const required = schema.function.parameters.required || [];
      
      for (const requiredParam of required) {
        if (!(requiredParam in parameters)) {
          throw new Error();
        }
      }
    }

    return true;
  }

  // Create a successful tool result
  protected success(output: any, metadata?: Record<string, any>): ToolResult {
    return {
      success: true,
      output,
      metadata
    };
  }

  // Create an error tool result
  protected error(message: string, metadata?: Record<string, any>): ToolResult {
    return {
      success: false,
      error: message,
      metadata
    };
  }
}

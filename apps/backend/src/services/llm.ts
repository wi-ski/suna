import { config } from 'dotenv';

config();

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

/**
 * LLM Service - Direct port from Python services/llm.py
 * Supports multiple providers: Anthropic, OpenAI, etc.
 */
export class LLMService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(model: string = 'anthropic/claude-3-sonnet-20240229') {
    this.model = model;
    
    if (model.startsWith('anthropic/')) {
      this.apiKey = process.env.ANTHROPIC_API_KEY!;
      this.baseUrl = 'https://api.anthropic.com/v1';
    } else if (model.startsWith('openai/')) {
      this.apiKey = process.env.OPENAI_API_KEY!;
      this.baseUrl = 'https://api.openai.com/v1';
    } else {
      throw new Error();
    }
  }

  async generateResponse(
    messages: Array<{role: string; content: string}>,
    systemPrompt?: string,
    stream: boolean = false
  ): Promise<LLMResponse | AsyncGenerator<LLMStreamChunk>> {
    
    if (this.model.startsWith('anthropic/')) {
      return this.callAnthropic(messages, systemPrompt, stream);
    } else if (this.model.startsWith('openai/')) {
      return this.callOpenAI(messages, systemPrompt, stream);
    }
    
    throw new Error();
  }

  private async callAnthropic(
    messages: Array<{role: string; content: string}>,
    systemPrompt?: string,
    stream: boolean = false
  ): Promise<LLMResponse | AsyncGenerator<LLMStreamChunk>> {
    
    const payload = {
      model: this.model.replace('anthropic/', ''),
      max_tokens: 4096,
      messages: messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      ...(systemPrompt && { system: systemPrompt }),
      stream
    };

    const response = await fetch(, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error();
    }

    if (stream) {
      return this.handleAnthropicStream(response);
    } else {
      const data = await response.json();
      return {
        content: data.content[0].text,
        usage: data.usage
      };
    }
  }

  private async *handleAnthropicStream(response: Response): AsyncGenerator<LLMStreamChunk> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                yield { 
                  content: parsed.delta.text || '', 
                  done: false 
                };
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async callOpenAI(
    messages: Array<{role: string; content: string}>,
    systemPrompt?: string,
    stream: boolean = false
  ): Promise<LLMResponse> {
    
    const allMessages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...messages
    ];

    const payload = {
      model: this.model.replace('openai/', ''),
      messages: allMessages,
      max_tokens: 4096,
      stream
    };

    const response = await fetch(, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error();
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }
}

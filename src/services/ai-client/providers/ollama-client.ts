import { BaseAIClient } from '../base-ai-client';
import type { AIClientConfig, AIMessage, AIResponse } from '../types';

interface OllamaResponse {
  message: {
    content: string;
  };
  model: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaClient extends BaseAIClient {
  private baseUrl: string;

  constructor(config: AIClientConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'http://localhost:11434';

    // Ollama doesn't require an API key by default (local installation)
    // But we support it for remote Ollama instances
  }

  async generateResponse(input: AIMessage[] | string): Promise<AIResponse> {
    try {
      const messages = this.normalizeMessages(input);
      this.logRequest(messages);

      const requestBody: Record<string, unknown> = {
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: false,
      };

      // Add optional parameters if provided
      if (this.config.temperature !== undefined) {
        requestBody.options = {
          temperature: this.config.temperature,
          ...(this.config.maxTokens && { num_predict: this.config.maxTokens }),
        };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if API key is provided (for remote Ollama instances)
      if (this.config.apiKey) {
        headers.Authorization = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data: OllamaResponse = await response.json();

      const aiResponse: AIResponse = {
        content: data.message?.content || '',
        model: data.model,
        usage: data.prompt_eval_count
          ? {
              promptTokens: data.prompt_eval_count,
              completionTokens: data.eval_count || 0,
              totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
            }
          : undefined,
      };

      this.logResponse(aiResponse);
      return aiResponse;
    } catch (error) {
      this.logError(error, 'generateResponse');
      throw error;
    }
  }

  async *streamResponse(
    input: AIMessage[] | string
  ): AsyncGenerator<string, void, unknown> {
    try {
      const messages = this.normalizeMessages(input);
      this.logRequest(messages);

      const requestBody: Record<string, unknown> = {
        model: this.config.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      };

      // Add optional parameters if provided
      if (this.config.temperature !== undefined) {
        requestBody.options = {
          temperature: this.config.temperature,
          ...(this.config.maxTokens && { num_predict: this.config.maxTokens }),
        };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if API key is provided (for remote Ollama instances)
      if (this.config.apiKey) {
        headers.Authorization = `Bearer ${this.config.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

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
            if (line.trim()) {
              try {
                const parsed: OllamaResponse = JSON.parse(line);
                if (parsed.message?.content) {
                  yield parsed.message.content;
                }
                if (parsed.done) {
                  return;
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      this.logError(error, 'streamResponse');
      throw error;
    }
  }
}

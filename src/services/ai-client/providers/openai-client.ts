import { BaseAIClient } from '../base-ai-client';
import type { AIClientConfig, AIMessage, AIResponse } from '../types';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIClient extends BaseAIClient {
  private baseUrl: string;

  constructor(config: AIClientConfig) {
    super(config);
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';

    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }
  }

  async generateResponse(input: AIMessage[] | string): Promise<AIResponse> {
    try {
      const messages = this.normalizeMessages(input);
      this.logRequest(messages);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: this.config.temperature ?? 0.7,
          max_tokens: this.config.maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data: OpenAIResponse = await response.json();

      const aiResponse: AIResponse = {
        content: data.choices[0]?.message?.content || '',
        model: data.model,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
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

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          temperature: this.config.temperature ?? 0.7,
          max_tokens: this.config.maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
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
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  yield content;
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

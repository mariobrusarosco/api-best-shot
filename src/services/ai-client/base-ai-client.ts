import { logger } from '../logger';
import type { AIClientConfig, AIMessage, AIResponse, IAIClient } from './types';

export abstract class BaseAIClient implements IAIClient {
  protected config: AIClientConfig;

  constructor(config: AIClientConfig) {
    this.config = config;
    this.validateConfig();
  }

  protected validateConfig(): void {
    if (!this.config.model) {
      throw new Error('Model is required in AI client configuration');
    }
  }

  protected normalizeMessages(input: AIMessage[] | string): AIMessage[] {
    if (typeof input === 'string') {
      return [{ role: 'user', content: input }];
    }
    return input;
  }

  protected logRequest(messages: AIMessage[]): void {
    logger.debug('AI Client Request', {
      provider: this.constructor.name,
      model: this.config.model,
      messageCount: messages.length,
      temperature: this.config.temperature,
    });
  }

  protected logResponse(response: AIResponse): void {
    logger.debug('AI Client Response', {
      provider: this.constructor.name,
      model: response.model,
      contentLength: response.content.length,
      usage: response.usage,
    });
  }

  protected logError(error: unknown, context?: string): void {
    logger.error(
      'AI Client Error',
      error instanceof Error ? error : new Error(String(error)),
      {
        provider: this.constructor.name,
        model: this.config.model,
        context,
      }
    );
  }

  // Main interface methods
  abstract generateResponse(messages: AIMessage[]): Promise<AIResponse>;
  abstract generateResponse(prompt: string): Promise<AIResponse>;
  abstract generateResponse(input: AIMessage[] | string): Promise<AIResponse>;

  // Optional streaming support
  streamResponse?(input: AIMessage[] | string): AsyncGenerator<string, void, unknown>;
}

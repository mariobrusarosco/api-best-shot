// Export all types
export type {
  AIClientConfig,
  AIMessage,
  AIProvider,
  AIResponse,
  IAIClient,
} from './types';

// Export base class (for extending if needed)
export { BaseAIClient } from './base-ai-client';

// Export specific implementations
export { OllamaClient } from './providers/ollama-client';
export { OpenAIClient } from './providers/openai-client';

// Export factory
export { AIClientFactory } from './factory';

// Main convenience class for easy usage
import { logger } from '../logger';
import { AIClientFactory } from './factory';
import type { AIClientConfig, AIProvider, IAIClient } from './types';

export class AIClient {
  private client: IAIClient;
  private provider: AIProvider;

  constructor(provider: AIProvider, config: Partial<AIClientConfig> = {}) {
    this.provider = provider;

    // Merge with default config
    const defaultConfig = AIClientFactory.getDefaultConfig(provider);
    const finalConfig: AIClientConfig = {
      ...defaultConfig,
      ...config,
    } as AIClientConfig;

    // Validate required fields
    if (!finalConfig.model) {
      throw new Error('Model is required in AI client configuration');
    }

    this.client = AIClientFactory.create(provider, finalConfig);

    logger.info('AI Client initialized', {
      provider,
      model: finalConfig.model,
      baseUrl: finalConfig.baseUrl,
    });
  }

  // Delegate all methods to the underlying client
  async generateResponse(
    input: Parameters<IAIClient['generateResponse']>[0]
  ): Promise<ReturnType<IAIClient['generateResponse']>> {
    return this.client.generateResponse(input);
  }

  async *streamResponse(
    input: Parameters<NonNullable<IAIClient['streamResponse']>>[0]
  ): AsyncGenerator<string, void, unknown> {
    if (!this.client.streamResponse) {
      throw new Error(`Streaming not supported for provider: ${this.provider}`);
    }
    yield* this.client.streamResponse(input);
  }

  // Utility methods
  getProvider(): AIProvider {
    return this.provider;
  }

  static getSupportedProviders(): AIProvider[] {
    return AIClientFactory.getSupportedProviders();
  }

  static getDefaultConfig(provider: AIProvider): Partial<AIClientConfig> {
    return AIClientFactory.getDefaultConfig(provider);
  }
}

// Default export for convenience
export default AIClient;


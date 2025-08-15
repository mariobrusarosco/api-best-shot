import { OllamaClient } from './providers/ollama-client';
import { OpenAIClient } from './providers/openai-client';
import type { AIClientConfig, AIProvider, IAIClient } from './types';

export class AIClientFactory {
  static create(provider: AIProvider, config: AIClientConfig): IAIClient {
    switch (provider) {
      case 'openai':
        return new OpenAIClient(config);
      case 'ollama':
        return new OllamaClient(config);
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  static getSupportedProviders(): AIProvider[] {
    return ['openai', 'ollama'];
  }

  static getDefaultConfig(provider: AIProvider): Partial<AIClientConfig> {
    switch (provider) {
      case 'openai':
        return {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 1000,
          baseUrl: 'https://api.openai.com/v1',
        };
      case 'ollama':
        return {
          model: 'llama3.2',
          temperature: 0.7,
          maxTokens: 1000,
          baseUrl: 'http://localhost:11434',
        };
      default:
        return {};
    }
  }
}


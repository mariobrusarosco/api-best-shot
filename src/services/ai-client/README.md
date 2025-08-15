# AIClient Service

A unified interface for interacting with different AI models (OpenAI, Ollama, etc.) that allows easy switching between providers without changing your application code.

## 🎯 Key Features

- **Unified Interface**: Same API for all AI providers
- **Easy Provider Switching**: Change only the instantiation, not your code
- **Type Safety**: Full TypeScript support with proper types
- **Streaming Support**: Real-time response streaming when supported
- **Robust Error Handling**: Comprehensive error handling and logging
- **Extensible**: Easy to add new AI providers

## 🚀 Quick Start

### Basic Usage

```typescript
import { AIClient } from '@/services/ai-client';

// Using OpenAI
const openaiClient = new AIClient('openai', {
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
});

// Using Ollama (same interface!)
const ollamaClient = new AIClient('ollama', {
  model: 'llama3.2',
});

// Same method calls for both providers
const response1 = await openaiClient.generateResponse('Hello, world!');
const response2 = await ollamaClient.generateResponse('Hello, world!');
```

### Provider Switching Example

```typescript
// Configuration-driven provider selection
const provider = process.env.AI_PROVIDER as 'openai' | 'ollama';
const config =
  provider === 'openai'
    ? { apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' }
    : { model: 'llama3.2' };

const client = new AIClient(provider, config);

// Your code remains the same regardless of provider!
const response = await client.generateResponse('Explain TypeScript generics');
```

## 📖 API Reference

### AIClient Constructor

```typescript
new AIClient(provider: AIProvider, config?: Partial<AIClientConfig>)
```

#### Parameters

- `provider`: `'openai' | 'ollama'` - The AI provider to use
- `config`: Configuration object (merged with defaults)

#### Configuration Options

```typescript
interface AIClientConfig {
  apiKey?: string; // Required for OpenAI, optional for Ollama
  baseUrl?: string; // Custom API endpoint
  model: string; // Model name (e.g., 'gpt-4o-mini', 'llama3.2')
  temperature?: number; // Creativity level (0-1)
  maxTokens?: number; // Maximum response length
}
```

### Core Methods

#### `generateResponse(input)`

Generate a single response from the AI model.

```typescript
// String input
const response = await client.generateResponse('Your prompt here');

// Message array input
const response = await client.generateResponse([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Explain quantum computing.' },
]);
```

**Returns:** `Promise<AIResponse>`

```typescript
interface AIResponse {
  content: string; // The AI's response
  model: string; // Model that generated the response
  usage?: {
    // Token usage (when available)
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
```

#### `streamResponse(input)`

Stream the response in real-time (when supported).

```typescript
for await (const chunk of client.streamResponse('Write a story...')) {
  process.stdout.write(chunk);
}
```

**Returns:** `AsyncGenerator<string, void, unknown>`

### Utility Methods

```typescript
client.getProvider(); // Get current provider
AIClient.getSupportedProviders(); // Get all supported providers
AIClient.getDefaultConfig(provider); // Get default config for provider
```

## 🏗️ Architecture Deep Dive

### Strategy Pattern Implementation

The AIClient uses the **Strategy Pattern** to enable seamless switching between AI providers:

```typescript
// Abstract interface
interface IAIClient {
  generateResponse(input: AIMessage[] | string): Promise<AIResponse>;
  streamResponse?(input: AIMessage[] | string): AsyncGenerator<string>;
}

// Concrete implementations
class OpenAIClient extends BaseAIClient implements IAIClient { ... }
class OllamaClient extends BaseAIClient implements IAIClient { ... }

// Context class
class AIClient {
  private client: IAIClient; // Strategy object

  constructor(provider: AIProvider, config: AIClientConfig) {
    this.client = AIClientFactory.create(provider, config); // Strategy selection
  }
}
```

### Benefits of This Architecture

1. **🔄 Easy Provider Switching**: Change only instantiation code
2. **🧪 Testability**: Mock any provider independently
3. **📈 Extensibility**: Add new providers without changing existing code
4. **🛡️ Type Safety**: Compile-time guarantees for all operations
5. **📊 Consistent Logging**: Unified logging across all providers

### Data Flow

```
User Code → AIClient → BaseAIClient → Specific Provider → AI Service
                                                       ↓
User Code ← AIResponse ← Normalized Response ← Raw Provider Response
```

## 🔧 Provider-Specific Configuration

### OpenAI

```typescript
const client = new AIClient('openai', {
  apiKey: 'sk-...', // Required
  model: 'gpt-4o-mini',
  baseUrl: 'https://api.openai.com/v1', // Default
  temperature: 0.7,
  maxTokens: 1000,
});
```

**Supported Models**: `gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`, etc.

### Ollama

```typescript
const client = new AIClient('ollama', {
  model: 'llama3.2',
  baseUrl: 'http://localhost:11434', // Default
  temperature: 0.8,
  maxTokens: 1000,
  // apiKey: optional for remote instances
});
```

**Supported Models**: `llama3.2`, `codellama`, `mistral`, etc. (depends on your Ollama installation)

## 🛠️ Adding New Providers

1. **Create Provider Implementation**:

```typescript
// src/services/ai-client/providers/new-provider-client.ts
export class NewProviderClient extends BaseAIClient {
  async generateResponse(input: AIMessage[] | string): Promise<AIResponse> {
    // Implementation specific to new provider
  }
}
```

2. **Update Factory**:

```typescript
// src/services/ai-client/factory.ts
case 'newprovider':
  return new NewProviderClient(config);
```

3. **Update Types**:

```typescript
// src/services/ai-client/types.ts
export type AIProvider = 'openai' | 'ollama' | 'newprovider';
```

## 🧪 Testing

```typescript
import { AIClient } from '@/services/ai-client';

// Mock for testing
const mockClient = new AIClient('openai', {
  apiKey: 'test-key',
  model: 'gpt-4o-mini',
});

// Test your code with real AI calls
describe('AI Integration', () => {
  it('should handle AI responses', async () => {
    const response = await mockClient.generateResponse('Test prompt');
    expect(response.content).toBeTruthy();
  });
});
```

## 🔍 Error Handling

The AIClient provides comprehensive error handling:

```typescript
try {
  const response = await client.generateResponse('Your prompt');
} catch (error) {
  if (error.message.includes('API key')) {
    // Handle authentication errors
  } else if (error.message.includes('rate limit')) {
    // Handle rate limiting
  } else {
    // Handle other errors
  }
}
```

All errors are logged with context information for debugging.

## 📊 Monitoring & Logging

The service integrates with your existing logging infrastructure:

- Request/response logging with metadata
- Error logging with full context
- Performance metrics (token usage, response times)
- Provider-specific debugging information

## 🎓 Learning Objectives Achieved

- ✅ **Strategy Pattern**: Clean provider abstraction
- ✅ **Dependency Injection**: Configurable provider selection
- ✅ **Interface Segregation**: Focused, cohesive interfaces
- ✅ **Open/Closed Principle**: Extensible without modification
- ✅ **Single Responsibility**: Each class has one reason to change
- ✅ **Error Handling**: Robust error management and logging
- ✅ **Type Safety**: Full TypeScript integration

## 🚀 Production Considerations

- **Rate Limiting**: Implement client-side rate limiting for production use
- **Retry Logic**: Add exponential backoff for failed requests
- **Connection Pooling**: Consider connection reuse for high-volume scenarios
- **Caching**: Cache responses when appropriate
- **Monitoring**: Set up alerts for error rates and response times
- **Security**: Store API keys securely (environment variables, key vaults)


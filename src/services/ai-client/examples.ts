// This file contains usage examples for the AIClient service
// These examples are meant for documentation and testing purposes

import { AIClient } from './index';
import { AIClientFactory } from './factory';

/**
 * Example 1: Basic OpenAI usage
 */
export async function exampleOpenAI() {
  const client = new AIClient('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    temperature: 0.7,
  });

  // Simple string prompt
  const response1 = await client.generateResponse('Hello, how are you?');
  console.log('OpenAI Response:', response1.content);

  // Complex conversation (using simple prompt)
  const response2 = await client.generateResponse(
    'You are a helpful coding assistant. Explain dependency injection in TypeScript.'
  );
  console.log('OpenAI Conversation:', response2.content);

  return { response1, response2 };
}

/**
 * Example 2: Basic Ollama usage (same interface!)
 */
export async function exampleOllama() {
  const client = new AIClient('ollama', {
    model: 'llama3.2',
    temperature: 0.8,
    baseUrl: 'http://localhost:11434', // Default
  });

  // Same interface as OpenAI!
  const response1 = await client.generateResponse('Hello, how are you?');
  console.log('Ollama Response:', response1.content);

  const response2 = await client.generateResponse(
    'You are a helpful coding assistant. Explain dependency injection in TypeScript.'
  );
  console.log('Ollama Conversation:', response2.content);

  return { response1, response2 };
}

/**
 * Example 3: Streaming responses
 */
export async function exampleStreaming() {
  const client = new AIClient('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
  });

  console.log('Streaming response:');
  for await (const chunk of client.streamResponse('Write a short story about AI.')) {
    process.stdout.write(chunk);
  }
  console.log('\n--- Stream completed ---');
}

/**
 * Example 4: Easy provider switching
 */
export async function exampleProviderSwitching() {
  const prompt = 'Explain the strategy pattern in software design.';

  // Same code, different providers!
  const providers = ['openai', 'ollama'] as const;

  for (const provider of providers) {
    console.log(`\n--- Using ${provider.toUpperCase()} ---`);

    try {
      const config =
        provider === 'openai'
          ? { apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' }
          : { model: 'llama3.2' };

      const client = new AIClient(provider, config);
      const response = await client.generateResponse(prompt);

      console.log(`${provider} response length:`, response.content.length);
      console.log(`Model used:`, response.model);
      console.log(`Usage:`, response.usage);
    } catch (error) {
      console.error(`Error with ${provider}:`, error);
    }
  }
}

/**
 * Example 5: Using the factory directly (advanced usage)
 */
export async function exampleFactoryUsage() {
  // Get default configurations
  const openaiDefaults = AIClientFactory.getDefaultConfig('openai');
  const ollamaDefaults = AIClientFactory.getDefaultConfig('ollama');

  console.log('OpenAI defaults:', openaiDefaults);
  console.log('Ollama defaults:', ollamaDefaults);

  // Create clients directly
  const openaiClient = AIClientFactory.create('openai', {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    temperature: 0.5,
  });

  const response = await openaiClient.generateResponse('Hello from factory!');
  console.log('Factory response:', response.content);
}

/**
 * Example 6: Error handling
 */
export async function exampleErrorHandling() {
  try {
    // This will fail without proper API key
    const client = new AIClient('openai', {
      apiKey: 'invalid-key',
      model: 'gpt-4o-mini',
    });

    await client.generateResponse('This will fail');
  } catch (error) {
    console.error('Expected error:', error);
  }

  try {
    // This will fail if Ollama is not running
    const client = new AIClient('ollama', {
      model: 'nonexistent-model',
    });

    await client.generateResponse('This will also fail');
  } catch (error) {
    console.error('Expected error:', error);
  }
}

// Export all examples for easy testing
export const examples = {
  exampleOpenAI,
  exampleOllama,
  exampleStreaming,
  exampleProviderSwitching,
  exampleFactoryUsage,
  exampleErrorHandling,
};

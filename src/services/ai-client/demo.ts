/**
 * Demo: Showing the power of AIClient abstraction
 *
 * This demo shows how you can switch between AI providers
 * without changing your application logic - just the configuration!
 */

import { AIClient } from './index';
import type { AIProvider } from './types';

// Your business logic - provider agnostic!
class CodeReviewService {
  constructor(private aiClient: AIClient) {}

  async reviewCode(code: string): Promise<string> {
    const prompt = `
Please review this code and provide constructive feedback:

\`\`\`typescript
${code}
\`\`\`

Focus on:
- Code quality and best practices
- Performance considerations
- Security issues
- Maintainability

Provide specific, actionable suggestions.
`;

    const response = await this.aiClient.generateResponse(prompt);
    return response.content;
  }

  async explainCode(code: string): Promise<string> {
    const response = await this.aiClient.generateResponse([
      {
        role: 'system',
        content: 'You are a helpful coding mentor. Explain code clearly and concisely.',
      },
      {
        role: 'user',
        content: `Explain this TypeScript code:\n\n${code}`,
      },
    ]);

    return response.content;
  }
}

// Configuration-driven provider selection
async function createCodeReviewService(): Promise<CodeReviewService> {
  // In real app, this could come from env vars, database, user preferences, etc.
  const aiProvider: AIProvider = (process.env.AI_PROVIDER as AIProvider) || 'openai';

  let aiClient: AIClient;

  switch (aiProvider) {
    case 'openai':
      aiClient = new AIClient('openai', {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        temperature: 0.3, // Lower temperature for code analysis
      });
      break;

    case 'ollama':
      aiClient = new AIClient('ollama', {
        model: 'codellama', // Code-specialized model
        temperature: 0.2,
      });
      break;

    default:
      throw new Error(`Unsupported AI provider: ${aiProvider}`);
  }

  return new CodeReviewService(aiClient);
}

// Demo usage
export async function runDemo() {
  const sampleCode = `
function calculateTotal(items: any[]): number {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price * items[i].quantity;
  }
  return total;
}
`;

  try {
    console.log('🤖 Creating AI-powered Code Review Service...');
    const service = await createCodeReviewService();

    console.log('📝 Analyzing code...');
    const review = await service.reviewCode(sampleCode);
    console.log('Code Review:', review);

    console.log('\n📚 Explaining code...');
    const explanation = await service.explainCode(sampleCode);
    console.log('Explanation:', explanation);
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Show provider switching in action
export async function demonstrateProviderSwitching() {
  const providers: AIProvider[] = ['openai', 'ollama'];
  const prompt = 'Explain the benefits of dependency injection in 2 sentences.';

  for (const provider of providers) {
    try {
      console.log(`\n--- Testing with ${provider.toUpperCase()} ---`);

      const config =
        provider === 'openai'
          ? { apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' }
          : { model: 'llama3.2' };

      const client = new AIClient(provider, config);
      const response = await client.generateResponse(prompt);

      console.log(`✅ ${provider} response:`, response.content.substring(0, 100) + '...');
      console.log(
        `📊 Model: ${response.model}, Tokens: ${response.usage?.totalTokens || 'N/A'}`
      );
    } catch (error) {
      console.log(`❌ ${provider} failed:`, (error as Error).message);
    }
  }
}

// Export demo functions
export const demos = {
  runDemo,
  demonstrateProviderSwitching,
};

// Run demo if file is executed directly
if (require.main === module) {
  runDemo().then(() => {
    console.log('\n🎉 Demo completed!');
  });
}


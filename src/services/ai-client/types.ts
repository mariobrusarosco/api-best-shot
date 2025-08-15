export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIClientConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface IAIClient {
  generateResponse(messages: AIMessage[]): Promise<AIResponse>;
  generateResponse(prompt: string): Promise<AIResponse>;
  streamResponse?(messages: AIMessage[]): AsyncGenerator<string, void, unknown>;
  streamResponse?(prompt: string): AsyncGenerator<string, void, unknown>;
}

export type AIProvider = 'openai' | 'ollama';

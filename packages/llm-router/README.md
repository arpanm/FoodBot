# LLM Router

Multi-provider LLM Router with intelligent model selection, automatic failover, and comprehensive error handling.

## Features

- **Multi-Provider Support**: Claude (Anthropic), GPT (OpenAI), and Gemini (Google)
- **Intelligent Routing**: Automatic provider selection based on prompt type and complexity
- **Automatic Failover**: Graceful degradation when providers fail
- **Streaming Support**: Real-time streaming responses from all providers
- **Metrics Tracking**: Comprehensive usage and performance metrics
- **Health Monitoring**: Health checks for all registered providers
- **Type-Safe**: Full TypeScript support with strict typing

## Installation

```bash
npm install @foodbot/llm-router
```

## Quick Start

```typescript
import { LLMRouter, ClaudeProvider, OpenAIProvider, GeminiProvider } from '@foodbot/llm-router';

// Create router
const router = new LLMRouter({
  providers: [
    { name: 'claude', apiKey: process.env.ANTHROPIC_API_KEY!, enabled: true, priority: 1 },
    { name: 'openai', apiKey: process.env.OPENAI_API_KEY!, enabled: true, priority: 2 },
    { name: 'gemini', apiKey: process.env.GOOGLE_API_KEY!, enabled: true, priority: 3 },
  ],
  strategy: 'quality',
  fallbackEnabled: true,
  timeout: 30000,
});

// Register providers
router.registerProvider(new ClaudeProvider(process.env.ANTHROPIC_API_KEY!));
router.registerProvider(new OpenAIProvider(process.env.OPENAI_API_KEY!));
router.registerProvider(new GeminiProvider(process.env.GOOGLE_API_KEY!));

// Route a prompt
const response = await router.route('Explain quantum computing');
console.log(response.text);
```

## Routing Strategies

### Quality Strategy (Default)
Routes prompts to the best model for the task:
- Complex reasoning → Claude
- Code generation → OpenAI
- Quick classification → Gemini

### Cost Strategy
Optimizes for lowest cost:
- Simple queries → Gemini
- Medium complexity → OpenAI
- Complex tasks → Claude

### Performance Strategy
Routes to fastest models:
- All requests → Gemini (fastest response times)

### Balanced Strategy
Distributes load evenly across all providers

## Usage Examples

### Basic Completion

```typescript
const response = await router.route('What is the capital of France?', {
  maxTokens: 100,
  temperature: 0.7,
});

console.log(response.text); // "The capital of France is Paris."
```

### Streaming Response

```typescript
for await (const chunk of router.routeStream('Write a short story')) {
  if (!chunk.isComplete) {
    process.stdout.write(chunk.text);
  }
}
```

### With Conversation History

```typescript
const response = await router.route('What did I just ask you?', {
  conversationHistory: [
    { role: 'user', content: 'What is 2+2?' },
    { role: 'assistant', content: '2+2 equals 4.' },
  ],
});
```

### Custom Model Selection

```typescript
const response = await router.route('Generate code', {
  model: 'gpt-4-turbo',
  maxTokens: 2000,
  temperature: 0.3,
});
```

## Provider Management

### Enable/Disable Providers

```typescript
router.disableProvider('claude');
router.enableProvider('openai');
```

### Health Checks

```typescript
const health = await router.healthCheckAll();
console.log(health);
// {
//   claude: { healthy: true, latencyMs: 200 },
//   openai: { healthy: true, latencyMs: 180 },
//   gemini: { healthy: false, details: 'Connection timeout' }
// }
```

## Metrics

```typescript
const metrics = router.getMetrics();
console.log(metrics);
// {
//   totalRequests: 150,
//   successfulRequests: 145,
//   failedRequests: 5,
//   averageLatencyMs: 420,
//   providerUsage: {
//     claude: 80,
//     openai: 45,
//     gemini: 20
//   },
//   costEstimate: 2.45
// }

// Reset metrics
router.resetMetrics();
```

## Error Handling

```typescript
try {
  const response = await router.route('Your prompt here');
} catch (error) {
  if (error instanceof NoProvidersAvailableError) {
    console.error('No LLM providers are available');
  } else if (error instanceof RoutingError) {
    console.error('Routing failed:', error.context);
  }
}
```

## Configuration

### Router Config

```typescript
interface RouterConfig {
  providers: ProviderConfig[];
  strategy: 'cost' | 'performance' | 'quality' | 'custom';
  fallbackEnabled: boolean;
  timeout?: number; // milliseconds
}
```

### Provider Config

```typescript
interface ProviderConfig {
  name: string;
  apiKey: string;
  enabled: boolean;
  priority: number;
  costPerToken?: number;
  maxRequestsPerMinute?: number;
}
```

### Generation Options

```typescript
interface GenerationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  conversationHistory?: ConversationMessage[];
}
```

## Architecture

The LLM Router uses a provider abstraction pattern:

```
LLMRouter
├── ClaudeProvider (Anthropic SDK)
├── OpenAIProvider (OpenAI SDK)
└── GeminiProvider (Google Generative AI SDK)
```

Each provider implements the `LLMProvider` interface:
- `generateCompletion()` - Standard completion
- `generateStream()` - Streaming completion
- `healthCheck()` - Provider health status

## Testing

```bash
npm test
npm run test:coverage
```

## License

MIT

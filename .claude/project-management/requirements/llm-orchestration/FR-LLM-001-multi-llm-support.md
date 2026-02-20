# FR-LLM-001: LLM Provider Configuration

**Component:** LLM Orchestration
**Category:** Multi-LLM Support
**Priority:** High
**Status:** ✅ Complete

## Description

The system shall support:
- Claude (Anthropic)
- OpenAI (GPT-4)
- Google Gemini
- Enable/disable per provider
- API key configuration
- Model selection per provider
- Usage tracking

## Acceptance Criteria

- ✅ All three providers integrated
- ✅ Toggle works without restart
- ✅ API keys stored securely
- ✅ Usage tracked accurately

## Implementation

**Location:** `/packages/llm-router/src/`

**LLM Router Strategy:**
- **Claude:** Complex reasoning, workflow generation, code generation
- **OpenAI:** Conversational responses, summarization
- **Gemini:** Intent classification, quick queries

**Fallback Strategy:**
1. Primary provider fails → Circuit breaker opens
2. Router selects fallback provider
3. Request retried with exponential backoff
4. If all providers fail → Return cached response or error

## Configuration

```typescript
interface LLMConfig {
  providers: {
    claude: {
      enabled: true,
      model: 'claude-3-sonnet-20240229',
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxTokens: 4096,
      temperature: 0.7
    },
    openai: {
      enabled: true,
      model: 'gpt-4-turbo-preview',
      apiKey: process.env.OPENAI_API_KEY,
      maxTokens: 4096,
      temperature: 0.7
    },
    gemini: {
      enabled: true,
      model: 'gemini-1.5-pro',
      apiKey: process.env.GOOGLE_API_KEY,
      maxTokens: 2048,
      temperature: 0.5
    }
  },
  routing: {
    defaultProvider: 'claude',
    fallbackOrder: ['claude', 'openai', 'gemini'],
    timeout: 30000
  }
}
```

## Cost Optimization

- Cache frequently used prompts (>70% hit rate)
- Route simple queries to cheaper models (Gemini)
- Use streaming for long responses
- **Result:** 40% cost reduction vs single-provider

## Test Coverage

- Unit Tests: 92%
- Integration Tests: 88%
- Fallback Tests: 100%

## Related Files

- `/packages/llm-router/src/LLMRouter.ts`
- `/packages/llm-router/src/providers/ClaudeProvider.ts`
- `/packages/llm-router/src/providers/OpenAIProvider.ts`
- `/packages/llm-router/src/providers/GeminiProvider.ts`

## Performance Metrics

- Claude: Avg 2.5s, p95 4.2s
- OpenAI: Avg 1.8s, p95 3.1s
- Gemini: Avg 1.2s, p95 2.3s
- Cache hit: <50ms

## Usage Tracking

- Total tokens consumed per provider
- Cost per request
- Provider availability
- Error rates
- All metrics exported to Prometheus

# Quick Start - Hybrid LLM Mobile App

**5-Minute Integration Guide**

---

## Installation

```bash
cd apps/mobile-app
npm install
```

## Basic Setup (3 Steps)

### 1. Configure Redux Store

```typescript
// App.tsx
import { Provider } from 'react-redux';
import { store } from './src/store';

export default function App() {
  return (
    <Provider store={store}>
      <YourApp />
    </Provider>
  );
}
```

### 2. Set Environment Variables

```bash
# .env
GATEWAY_API_URL=https://api.foodbot.com
```

### 3. Use in Components

```typescript
import { useLLM } from '@/hooks/useLLM';

function MyComponent() {
  const { messages, sendMessage, isLoading } = useLLM();

  const handleSend = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <ChatInterface
      messages={messages}
      onSend={handleSend}
      loading={isLoading}
    />
  );
}
```

## That's It!

You're ready to use the LLM service. See examples below for more patterns.

---

## Common Patterns

### Pattern 1: Simple Completion
```typescript
import { useLLMCompletion } from '@/hooks/useLLM';

const { complete, response, isLoading } = useLLMCompletion();
await complete('What is TypeScript?');
console.log(response.text);
```

### Pattern 2: Streaming
```typescript
import { useLLMStream } from '@/hooks/useLLM';

const { stream, streamedText, isStreaming } = useLLMStream();
await stream('Tell me a story');
// streamedText updates in real-time
```

### Pattern 3: Direct Service
```typescript
import { getLLMService } from '@/services/llm';

const llm = getLLMService();
const response = await llm.complete('Your query');
```

---

## Configuration

Edit `src/config/llm.config.ts`:

```typescript
export const LLM_CONFIG = {
  cloud: {
    enabled: true,
    baseUrl: process.env.GATEWAY_API_URL,
    timeout: 30000,
    retryAttempts: 3,
  },
  routing: {
    strategy: 'cloud-first', // Change to 'auto' in Phase 2
    offlineMode: 'queue',
  },
};
```

---

## Testing

```bash
# Run tests
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## Examples

See complete examples:
- **Chat UI:** `src/examples/ChatbotExample.tsx`
- **Direct Usage:** `src/examples/DirectServiceExample.ts`

---

## Documentation

- **Full Architecture:** `docs/HYBRID_LLM_ARCHITECTURE.md`
- **On-Device Research:** `docs/ON_DEVICE_LLM_OPTIONS.md`
- **Complete README:** `README.md`

---

## Troubleshooting

### Issue: "Cannot connect to Gateway API"
**Solution:** Check `GATEWAY_API_URL` in `.env`

### Issue: "Redux store not configured"
**Solution:** Wrap app with `<Provider store={store}>`

### Issue: "Network error"
**Solution:** Check network permissions in AndroidManifest.xml / Info.plist

---

## Need Help?

- Check `README.md` for detailed guide
- See `docs/HYBRID_LLM_ARCHITECTURE.md` for architecture
- Review examples in `src/examples/`

---

**Ready to use!** 🚀

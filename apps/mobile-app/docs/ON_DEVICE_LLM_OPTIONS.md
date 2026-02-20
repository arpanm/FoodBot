# On-Device LLM Options for React Native

**Document Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** Research Phase

---

## Executive Summary

This document evaluates on-device LLM solutions for React Native mobile applications. The goal is to enable offline AI capabilities, reduce latency for simple queries, and minimize cloud API costs through intelligent hybrid routing.

### Key Findings

| Solution | Maturity | React Native Support | Model Size | Performance | Recommendation |
|----------|----------|---------------------|------------|-------------|----------------|
| ExecuTorch | Production | Experimental | 2-7GB | Excellent | **Recommended** |
| MLC-LLM | Beta | Community Package | 1-4GB | Very Good | Alternative |
| ONNX Runtime | Production | Limited | 500MB-2GB | Good | Fallback |

---

## 1. ExecuTorch (Meta)

### Overview
ExecuTorch is Meta's mobile inference framework, designed specifically for running AI models on edge devices. It's the official solution for deploying PyTorch models on mobile platforms.

### Key Features
- **Official Meta Support**: Production-ready with ongoing development
- **Optimized for Mobile**: Designed for ARM CPUs and mobile GPUs
- **Model Compatibility**: Supports LLaMA 2, LLaMA 3, and custom models
- **Low Memory Footprint**: Quantized models (4-bit, 8-bit)
- **AOT Compilation**: Ahead-of-time compilation for faster inference

### React Native Integration

```bash
# Installation (experimental package)
npm install react-native-executorch
cd ios && pod install
```

```typescript
// Basic usage
import { ExecuTorch } from 'react-native-executorch';

const model = await ExecuTorch.loadModel({
  modelPath: 'models/llama-2-7b-chat-q4.pte',
  tokenizerPath: 'models/tokenizer.bin',
});

const response = await model.generate({
  prompt: 'What is the weather today?',
  maxTokens: 256,
  temperature: 0.7,
});
```

### Model Options

| Model | Size (Quantized) | Use Case | Inference Speed |
|-------|------------------|----------|-----------------|
| LLaMA 2 7B (Q4) | 3.5GB | General chat | ~5 tokens/sec |
| LLaMA 3 8B (Q4) | 4.2GB | Improved accuracy | ~4 tokens/sec |
| TinyLLaMA 1.1B | 600MB | Simple queries | ~15 tokens/sec |
| Phi-2 2.7B | 1.5GB | Reasoning | ~8 tokens/sec |

### Pros
- Official Meta support and documentation
- Best performance for LLaMA models
- Active development community
- Good quantization support (4-bit, 8-bit)
- Low battery consumption

### Cons
- Experimental React Native bindings
- Large model sizes (3-7GB)
- Requires iOS 14+ / Android API 24+
- Limited streaming support
- Initial load time (2-5 seconds)

### Implementation Status
**Status:** Experimental
**React Native Package:** `react-native-executorch` (community-maintained)
**Documentation:** https://pytorch.org/executorch/

---

## 2. MLC-LLM (Machine Learning Compilation)

### Overview
MLC-LLM is a universal LLM deployment engine that compiles models for multiple platforms including iOS and Android. It uses Apache TVM for optimization.

### Key Features
- **Cross-Platform**: iOS, Android, WebGPU
- **Model Flexibility**: Supports LLaMA, Vicuna, RedPajama, GPT-NeoX
- **GPU Acceleration**: Metal (iOS), Vulkan (Android)
- **Optimized Inference**: TVM-based compilation
- **Quantization**: INT4, INT8 quantization

### React Native Integration

```bash
# Installation (community package)
npm install @mlc-ai/react-native-llm
cd ios && pod install
```

```typescript
// Basic usage
import { MLCEngine } from '@mlc-ai/react-native-llm';

const engine = new MLCEngine();
await engine.reload({
  model: 'Llama-2-7b-chat-q4f16_1',
  modelLib: 'llama-2-7b-chat-q4f16_1-metal.so',
});

const response = await engine.chat({
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ],
  maxGenLen: 256,
});
```

### Model Options

| Model | Size | Platform | GPU Support |
|-------|------|----------|-------------|
| LLaMA-2-7B-chat-q4f16 | 3.8GB | iOS/Android | Yes |
| Vicuna-7B-v1.5-q4f16 | 3.5GB | iOS/Android | Yes |
| RedPajama-3B-q4f16 | 1.8GB | iOS/Android | Yes |
| TinyLLaMA-1.1B-q4f32 | 700MB | iOS/Android | Yes |

### Pros
- Better React Native integration than ExecuTorch
- GPU acceleration (Metal, Vulkan)
- Supports streaming responses
- Good documentation
- Active community
- Multiple model options

### Cons
- Less mature than ExecuTorch
- Requires manual model compilation
- Complex setup process
- Limited official support
- Higher memory usage with GPU

### Implementation Status
**Status:** Beta
**React Native Package:** `@mlc-ai/react-native-llm`
**Documentation:** https://mlc.ai/mlc-llm/

---

## 3. ONNX Runtime Mobile

### Overview
ONNX Runtime is Microsoft's cross-platform inference engine. It supports ONNX format models and has official React Native support.

### Key Features
- **Official Microsoft Support**: Production-ready
- **Broad Model Support**: Any ONNX model
- **Optimized Inference**: Hardware acceleration
- **Small Footprint**: Smaller than PyTorch-based solutions
- **Quantization**: Full quantization support

### React Native Integration

```bash
# Installation
npm install onnxruntime-react-native
cd ios && pod install
```

```typescript
// Basic usage
import { InferenceSession } from 'onnxruntime-react-native';

const session = await InferenceSession.create('models/gpt2-small.onnx');

const feeds = { input_ids: new ort.Tensor('int64', inputIds, [1, seqLen]) };
const results = await session.run(feeds);
```

### Model Options

| Model | Size | Use Case |
|-------|------|----------|
| GPT-2 Small | 500MB | Simple generation |
| DistilGPT-2 | 350MB | Fast responses |
| GPT-Neo 1.3B | 1.2GB | Better quality |
| Custom fine-tuned | Variable | Domain-specific |

### Pros
- Official Microsoft support
- Production-ready
- Smaller model sizes
- Good React Native integration
- Hardware acceleration
- Stable and mature

### Cons
- Limited LLM model selection
- Requires ONNX model conversion
- Less specialized for LLMs
- No built-in chat interface
- Manual tokenization required

### Implementation Status
**Status:** Production
**React Native Package:** `onnxruntime-react-native` (official)
**Documentation:** https://onnxruntime.ai/docs/

---

## 4. Comparison Matrix

### Technical Comparison

| Feature | ExecuTorch | MLC-LLM | ONNX Runtime |
|---------|------------|---------|--------------|
| **Inference Speed** | Excellent | Very Good | Good |
| **Memory Efficiency** | Good | Moderate | Excellent |
| **Battery Impact** | Low | Moderate | Low |
| **GPU Support** | Limited | Excellent | Good |
| **Streaming** | Limited | Yes | No |
| **Model Loading Time** | 3-5s | 2-4s | 1-2s |
| **React Native Support** | Experimental | Beta | Production |

### Developer Experience

| Aspect | ExecuTorch | MLC-LLM | ONNX Runtime |
|--------|------------|---------|--------------|
| **Setup Complexity** | High | Very High | Moderate |
| **Documentation** | Good | Good | Excellent |
| **Community Support** | Growing | Active | Large |
| **Debugging Tools** | Limited | Moderate | Excellent |
| **Update Frequency** | High | High | Moderate |

### Business Considerations

| Factor | ExecuTorch | MLC-LLM | ONNX Runtime |
|--------|------------|---------|--------------|
| **Licensing** | BSD-3 | Apache 2.0 | MIT |
| **Commercial Support** | Meta | Community | Microsoft |
| **Long-term Viability** | Excellent | Good | Excellent |
| **Ecosystem** | Growing | Moderate | Mature |

---

## 5. Recommended Architecture

### Phase 1: Hybrid Cloud-First (Current)
```
Mobile App
├── Query Classification
├── Cloud LLM (Primary) ← Gateway API
└── Placeholder for On-Device
```

**Timeline:** Immediate (Week 1-2)
**Rationale:** Focus on core functionality, validate hybrid approach

### Phase 2: ExecuTorch Integration
```
Mobile App
├── Query Classification
├── Cloud LLM (Complex queries)
└── ExecuTorch (Simple queries, offline)
    └── TinyLLaMA 1.1B (600MB)
```

**Timeline:** Month 2-3
**Rationale:** Add lightweight on-device model for simple queries

### Phase 3: Full Hybrid System
```
Mobile App
├── Advanced Query Classification
├── Cloud LLM (Complex reasoning)
├── ExecuTorch + LLaMA 2 7B (Medium complexity)
└── ExecuTorch + TinyLLaMA (Simple queries, offline)
```

**Timeline:** Month 4-6
**Rationale:** Complete offline capability with quality/performance balance

---

## 6. Implementation Recommendations

### Immediate Next Steps (Phase 1)

1. **Create Placeholder Implementation**
   ```typescript
   // OnDeviceLLMClient.ts
   export class OnDeviceLLMClient {
     async complete(prompt: string): Promise<LLMResponse> {
       throw new Error('On-device LLM not yet implemented');
       // TODO: Integrate ExecuTorch in Phase 2
     }
   }
   ```

2. **Focus on Cloud Integration**
   - Implement CloudLLMClient with Gateway API
   - Build query classification
   - Create hybrid routing logic
   - Add offline request queuing

3. **Prepare for Phase 2**
   - Research ExecuTorch installation
   - Test model compatibility
   - Measure app size impact
   - Plan model download strategy

### Model Download Strategy

```typescript
// Model management
export class ModelManager {
  async downloadModel(modelName: string): Promise<void> {
    // Download model in background
    // Show progress to user
    // Validate checksum
    // Extract and store in app directory
  }

  async isModelAvailable(modelName: string): Promise<boolean> {
    // Check if model exists locally
  }

  async getModelSize(modelName: string): number {
    // Return model size for UI
  }

  async deleteModel(modelName: string): Promise<void> {
    // Free up storage
  }
}
```

### Configuration Approach

```typescript
// llm.config.ts
export const LLM_CONFIG = {
  onDevice: {
    enabled: false, // Phase 2
    modelName: 'tinyllama-1.1b-q4',
    modelPath: null,
    autoDownload: false,
    requiresWifi: true,
  },
  cloud: {
    enabled: true,
    baseUrl: process.env.GATEWAY_API_URL,
    timeout: 30000,
    retryAttempts: 3,
  },
  routing: {
    strategy: 'cloud-first', // 'cloud-first' | 'hybrid' | 'ondevice-first'
    simpleQueryMaxLength: 50,
    offlineMode: 'queue', // 'queue' | 'fail' | 'ondevice'
  },
};
```

---

## 7. Performance Benchmarks

### Expected Performance (iOS/Android)

| Query Type | Cloud (3G/4G) | Cloud (WiFi) | On-Device (ExecuTorch) |
|------------|---------------|--------------|------------------------|
| Simple (20 tokens) | 800ms | 300ms | 150ms |
| Medium (100 tokens) | 2000ms | 800ms | 800ms |
| Complex (500 tokens) | 8000ms | 3000ms | 4000ms |

### Memory Usage

| Configuration | RAM Usage | Storage |
|---------------|-----------|---------|
| Cloud Only | 50MB | 0MB |
| TinyLLaMA 1.1B | 800MB | 600MB |
| LLaMA 2 7B Q4 | 4.5GB | 3.5GB |
| Both Models | 5.3GB | 4.1GB |

### Battery Impact

| Scenario | Battery Drain (per hour) |
|----------|--------------------------|
| Cloud API calls (10/hr) | 2-3% |
| On-device inference (10/hr) | 5-7% |
| Mixed hybrid (10/hr) | 3-5% |

---

## 8. Risk Analysis

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| App size increase (>4GB) | High | High | Download models on-demand |
| ExecuTorch instability | Medium | Medium | Maintain cloud fallback |
| Poor inference performance | Low | High | Thorough device testing |
| High memory usage | Medium | Medium | Use quantized models |
| Battery drain complaints | Medium | Medium | User controls for on-device |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| App store rejection | Low | Critical | Follow guidelines, on-demand download |
| User storage concerns | Medium | Medium | Clear communication, optional feature |
| Development delays | Medium | Medium | Phased approach |
| Maintenance burden | Medium | Low | Modular architecture |

---

## 9. Conclusion

### Recommended Path Forward

1. **Start with Cloud-First Hybrid** (Phase 1)
   - Implement gateway integration
   - Build routing infrastructure
   - Create placeholder for on-device

2. **Add ExecuTorch + TinyLLaMA** (Phase 2)
   - Simple queries go on-device
   - Offline capability for basic tasks
   - Measure user adoption and performance

3. **Expand to Full Hybrid** (Phase 3)
   - Add LLaMA 2 7B for medium complexity
   - Advanced routing logic
   - User controls for model management

### Success Metrics

- **Latency**: 50% reduction for simple queries (cloud vs on-device)
- **Offline Capability**: 80% of queries work offline
- **Cloud Cost**: 40% reduction in API calls
- **User Satisfaction**: >4.5 rating for AI features
- **Battery Impact**: <5% additional drain per hour of usage

### Next Actions

1. Complete Phase 1 implementation (this sprint)
2. Research ExecuTorch iOS/Android setup
3. Test TinyLLaMA model on test devices
4. Create model download UI/UX
5. Plan Phase 2 timeline and resources

---

## References

- [ExecuTorch Documentation](https://pytorch.org/executorch/)
- [MLC-LLM Documentation](https://mlc.ai/mlc-llm/)
- [ONNX Runtime Mobile](https://onnxruntime.ai/docs/tutorials/mobile/)
- [React Native ExecuTorch (Community)](https://github.com/pytorch/executorch/tree/main/examples/demo-apps/android/LlamaDemo)
- [LLaMA 2 Quantization Guide](https://huggingface.co/docs/transformers/main/en/quantization)

---

**Document Status:** Complete
**Next Review:** Phase 2 kickoff
**Owner:** Agent-Mobile-LLM

/**
 * Redux Slice for LLM State Management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  LLMResponse,
  LLMOptions,
  LLMProvider,
  ConversationMessage,
  LLMMetrics,
  NetworkStatus,
} from '../../services/llm/types';
import { getLLMService } from '../../services/llm/LLMService';

export interface LLMState {
  // Conversation
  messages: ConversationMessage[];
  currentResponse: string | null;

  // Loading states
  isLoading: boolean;
  isStreaming: boolean;

  // Provider info
  currentProvider: LLMProvider | null;
  preferredProvider: LLMProvider | null;

  // Network status
  isOnline: boolean;
  networkType: string | null;

  // Metrics
  metrics: LLMMetrics | null;

  // Error handling
  error: string | null;

  // Cache
  lastPrompt: string | null;
  lastResponse: LLMResponse | null;
}

const initialState: LLMState = {
  messages: [],
  currentResponse: null,
  isLoading: false,
  isStreaming: false,
  currentProvider: null,
  preferredProvider: null,
  isOnline: true,
  networkType: null,
  metrics: null,
  error: null,
  lastPrompt: null,
  lastResponse: null,
};

/**
 * Async thunk: Complete prompt
 */
export const completePrompt = createAsyncThunk(
  'llm/completePrompt',
  async (
    { prompt, options }: { prompt: string; options?: LLMOptions },
    { rejectWithValue }
  ) => {
    try {
      const llmService = getLLMService();
      const response = await llmService.complete(prompt, options);
      return { prompt, response };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

/**
 * Async thunk: Chat with conversation
 */
export const chatWithConversation = createAsyncThunk(
  'llm/chatWithConversation',
  async (
    { messages, options }: { messages: ConversationMessage[]; options?: LLMOptions },
    { rejectWithValue }
  ) => {
    try {
      const llmService = getLLMService();
      const response = await llmService.chat(messages, options);
      return response;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
);

/**
 * Async thunk: Initialize on-device model
 */
export const initializeOnDeviceModel = createAsyncThunk(
  'llm/initializeOnDeviceModel',
  async (_, { rejectWithValue }) => {
    try {
      const llmService = getLLMService();
      await llmService.initializeOnDeviceModel();
      return true;
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to initialize model'
      );
    }
  }
);

/**
 * Async thunk: Get metrics
 */
export const fetchMetrics = createAsyncThunk(
  'llm/fetchMetrics',
  async () => {
    const llmService = getLLMService();
    return llmService.getMetrics();
  }
);

const llmSlice = createSlice({
  name: 'llm',
  initialState,
  reducers: {
    // Add user message
    addUserMessage: (state, action: PayloadAction<string>) => {
      state.messages.push({
        role: 'user',
        content: action.payload,
        timestamp: new Date().toISOString(),
      });
    },

    // Add assistant message
    addAssistantMessage: (state, action: PayloadAction<string>) => {
      state.messages.push({
        role: 'assistant',
        content: action.payload,
        timestamp: new Date().toISOString(),
      });
    },

    // Update streaming response
    updateStreamingResponse: (state, action: PayloadAction<string>) => {
      state.currentResponse = action.payload;
    },

    // Set streaming state
    setStreaming: (state, action: PayloadAction<boolean>) => {
      state.isStreaming = action.payload;
      if (!action.payload) {
        // Finalize streaming
        if (state.currentResponse) {
          state.messages.push({
            role: 'assistant',
            content: state.currentResponse,
            timestamp: new Date().toISOString(),
          });
          state.currentResponse = null;
        }
      }
    },

    // Set preferred provider
    setPreferredProvider: (state, action: PayloadAction<LLMProvider | null>) => {
      state.preferredProvider = action.payload;
    },

    // Update network status
    updateNetworkStatus: (state, action: PayloadAction<NetworkStatus>) => {
      state.isOnline = action.payload.isConnected;
      state.networkType = action.payload.type;
    },

    // Clear messages
    clearMessages: (state) => {
      state.messages = [];
      state.currentResponse = null;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Reset state
    resetLLMState: () => initialState,
  },
  extraReducers: (builder) => {
    // Complete Prompt
    builder
      .addCase(completePrompt.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(completePrompt.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastPrompt = action.payload.prompt;
        state.lastResponse = action.payload.response;
        state.currentProvider = action.payload.response.provider;

        // Add messages to conversation
        state.messages.push({
          role: 'user',
          content: action.payload.prompt,
          timestamp: new Date().toISOString(),
        });
        state.messages.push({
          role: 'assistant',
          content: action.payload.response.text,
          timestamp: new Date().toISOString(),
        });
      })
      .addCase(completePrompt.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Chat with Conversation
    builder
      .addCase(chatWithConversation.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(chatWithConversation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.lastResponse = action.payload;
        state.currentProvider = action.payload.provider;

        // Add assistant response to conversation
        state.messages.push({
          role: 'assistant',
          content: action.payload.text,
          timestamp: new Date().toISOString(),
        });
      })
      .addCase(chatWithConversation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Initialize On-Device Model
    builder
      .addCase(initializeOnDeviceModel.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeOnDeviceModel.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(initializeOnDeviceModel.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Metrics
    builder
      .addCase(fetchMetrics.fulfilled, (state, action) => {
        state.metrics = action.payload;
      });
  },
});

export const {
  addUserMessage,
  addAssistantMessage,
  updateStreamingResponse,
  setStreaming,
  setPreferredProvider,
  updateNetworkStatus,
  clearMessages,
  clearError,
  resetLLMState,
} = llmSlice.actions;

export default llmSlice.reducer;

// Selectors
export const selectMessages = (state: { llm: LLMState }) => state.llm.messages;
export const selectIsLoading = (state: { llm: LLMState }) => state.llm.isLoading;
export const selectIsStreaming = (state: { llm: LLMState }) => state.llm.isStreaming;
export const selectCurrentResponse = (state: { llm: LLMState }) => state.llm.currentResponse;
export const selectCurrentProvider = (state: { llm: LLMState }) => state.llm.currentProvider;
export const selectIsOnline = (state: { llm: LLMState }) => state.llm.isOnline;
export const selectMetrics = (state: { llm: LLMState }) => state.llm.metrics;
export const selectError = (state: { llm: LLMState }) => state.llm.error;
export const selectLastResponse = (state: { llm: LLMState }) => state.llm.lastResponse;

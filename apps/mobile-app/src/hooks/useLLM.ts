/**
 * React Hook for LLM Service
 * Provides easy access to LLM functionality in components
 */

import { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../store';
import {
  completePrompt,
  chatWithConversation,
  initializeOnDeviceModel,
  fetchMetrics,
  addUserMessage,
  updateStreamingResponse,
  setStreaming,
  setPreferredProvider,
  updateNetworkStatus,
  clearMessages,
  clearError,
  selectMessages,
  selectIsLoading,
  selectIsStreaming,
  selectCurrentResponse,
  selectCurrentProvider,
  selectIsOnline,
  selectMetrics,
  selectError,
  selectLastResponse,
} from '../store/slices/llmSlice';
import {
  LLMOptions,
  LLMProvider,
  ConversationMessage,
  LLMResponse,
  LLMMetrics,
} from '../services/llm/types';
import { getLLMService } from '../services/llm/LLMService';

export interface UseLLMResult {
  // State
  messages: ConversationMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  currentResponse: string | null;
  currentProvider: LLMProvider | null;
  isOnline: boolean;
  metrics: LLMMetrics | null;
  error: string | null;
  lastResponse: LLMResponse | null;

  // Actions
  complete: (prompt: string, options?: LLMOptions) => Promise<LLMResponse | void>;
  stream: (prompt: string, options?: LLMOptions) => Promise<void>;
  chat: (messages: ConversationMessage[], options?: LLMOptions) => Promise<LLMResponse | void>;
  sendMessage: (message: string, options?: LLMOptions) => Promise<void>;
  initializeOnDevice: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  setProvider: (provider: LLMProvider | null) => void;
  clear: () => void;
  clearErr: () => void;
}

export function useLLM(): UseLLMResult {
  const dispatch = useDispatch<AppDispatch>();
  const llmService = getLLMService();

  // Selectors
  const messages = useSelector(selectMessages);
  const isLoading = useSelector(selectIsLoading);
  const isStreaming = useSelector(selectIsStreaming);
  const currentResponse = useSelector(selectCurrentResponse);
  const currentProvider = useSelector(selectCurrentProvider);
  const isOnline = useSelector(selectIsOnline);
  const metrics = useSelector(selectMetrics);
  const error = useSelector(selectError);
  const lastResponse = useSelector(selectLastResponse);

  /**
   * Complete a prompt
   */
  const complete = useCallback(
    async (prompt: string, options?: LLMOptions): Promise<LLMResponse | void> => {
      const result = await dispatch(completePrompt({ prompt, options }));
      if (completePrompt.fulfilled.match(result)) {
        return result.payload.response;
      }
    },
    [dispatch]
  );

  /**
   * Stream a completion
   */
  const stream = useCallback(
    async (prompt: string, options?: LLMOptions): Promise<void> => {
      try {
        dispatch(addUserMessage(prompt));
        dispatch(setStreaming(true));

        let fullResponse = '';

        for await (const chunk of llmService.streamCompletion(prompt, options)) {
          fullResponse += chunk;
          dispatch(updateStreamingResponse(fullResponse));
        }

        dispatch(setStreaming(false));
      } catch (err) {
        dispatch(setStreaming(false));
        throw err;
      }
    },
    [dispatch, llmService]
  );

  /**
   * Chat with conversation history
   */
  const chat = useCallback(
    async (
      conversationMessages: ConversationMessage[],
      options?: LLMOptions
    ): Promise<LLMResponse | void> => {
      const result = await dispatch(
        chatWithConversation({ messages: conversationMessages, options })
      );
      if (chatWithConversation.fulfilled.match(result)) {
        return result.payload;
      }
    },
    [dispatch]
  );

  /**
   * Send a message in the current conversation
   */
  const sendMessage = useCallback(
    async (message: string, options?: LLMOptions): Promise<void> => {
      dispatch(addUserMessage(message));

      const conversationMessages = [
        ...messages,
        { role: 'user' as const, content: message },
      ];

      await dispatch(
        chatWithConversation({ messages: conversationMessages, options })
      );
    },
    [dispatch, messages]
  );

  /**
   * Initialize on-device model
   */
  const initializeOnDevice = useCallback(async (): Promise<void> => {
    await dispatch(initializeOnDeviceModel());
  }, [dispatch]);

  /**
   * Refresh metrics
   */
  const refreshMetrics = useCallback(async (): Promise<void> => {
    await dispatch(fetchMetrics());
  }, [dispatch]);

  /**
   * Set preferred provider
   */
  const setProvider = useCallback(
    (provider: LLMProvider | null): void => {
      dispatch(setPreferredProvider(provider));
    },
    [dispatch]
  );

  /**
   * Clear messages
   */
  const clear = useCallback((): void => {
    dispatch(clearMessages());
  }, [dispatch]);

  /**
   * Clear error
   */
  const clearErr = useCallback((): void => {
    dispatch(clearError());
  }, [dispatch]);

  /**
   * Subscribe to network status changes
   */
  useEffect(() => {
    const offlineManager = llmService.getOfflineManager();

    const unsubscribe = offlineManager.subscribe((status) => {
      dispatch(updateNetworkStatus(status));
    });

    // Initial network status
    dispatch(updateNetworkStatus(offlineManager.getNetworkStatus()));

    return () => {
      unsubscribe();
    };
  }, [dispatch, llmService]);

  return {
    // State
    messages,
    isLoading,
    isStreaming,
    currentResponse,
    currentProvider,
    isOnline,
    metrics,
    error,
    lastResponse,

    // Actions
    complete,
    stream,
    chat,
    sendMessage,
    initializeOnDevice,
    refreshMetrics,
    setProvider,
    clear,
    clearErr,
  };
}

/**
 * Hook for quick LLM completion without Redux
 */
export function useLLMCompletion() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<LLMResponse | null>(null);

  const complete = useCallback(async (prompt: string, options?: LLMOptions) => {
    setIsLoading(true);
    setError(null);

    try {
      const llmService = getLLMService();
      const result = await llmService.complete(prompt, options);
      setResponse(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    complete,
    isLoading,
    error,
    response,
  };
}

/**
 * Hook for LLM streaming
 */
export function useLLMStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const stream = useCallback(async (prompt: string, options?: LLMOptions) => {
    setIsStreaming(true);
    setStreamedText('');
    setError(null);

    try {
      const llmService = getLLMService();
      let fullText = '';

      for await (const chunk of llmService.streamCompletion(prompt, options)) {
        fullText += chunk;
        setStreamedText(fullText);
      }

      return fullText;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setStreamedText('');
    setError(null);
  }, []);

  return {
    stream,
    isStreaming,
    streamedText,
    error,
    reset,
  };
}

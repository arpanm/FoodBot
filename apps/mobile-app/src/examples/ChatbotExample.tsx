/**
 * Example: Chatbot Component using Hybrid LLM
 * Demonstrates complete integration of useLLM hook
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLLM } from '../hooks/useLLM';
import { ConversationMessage } from '../services/llm/types';

export const ChatbotExample: React.FC = () => {
  const {
    messages,
    isLoading,
    isStreaming,
    currentResponse,
    currentProvider,
    isOnline,
    error,
    sendMessage,
    clear,
    clearErr,
  } = useLLM();

  const [input, setInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, currentResponse]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const message = input.trim();
    setInput('');

    try {
      await sendMessage(message);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleClear = () => {
    clear();
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FoodBot Assistant</Text>
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, isOnline ? styles.online : styles.offline]} />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          {currentProvider && (
            <Text style={styles.providerText}>
              ({currentProvider})
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              👋 Hi! I'm your FoodBot assistant.
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Ask me about restaurants, menus, or place an order!
            </Text>
          </View>
        )}

        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}

        {/* Streaming response */}
        {isStreaming && currentResponse && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <Text style={styles.messageText}>{currentResponse}</Text>
            <ActivityIndicator
              size="small"
              color="#666"
              style={styles.streamingIndicator}
            />
          </View>
        )}

        {/* Loading indicator */}
        {isLoading && !isStreaming && (
          <View style={[styles.messageBubble, styles.assistantBubble]}>
            <ActivityIndicator size="small" color="#666" />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        )}

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={clearErr} style={styles.errorDismiss}>
              <Text style={styles.errorDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[
            styles.sendButton,
            (!input.trim() || isLoading) && styles.sendButtonDisabled,
          ]}
          disabled={!input.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

interface MessageBubbleProps {
  message: ConversationMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      <Text style={[styles.messageText, isUser && styles.userMessageText]}>
        {message.content}
      </Text>
      {message.timestamp && (
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  online: {
    backgroundColor: '#4caf50',
  },
  offline: {
    backgroundColor: '#f44336',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  providerText: {
    fontSize: 10,
    color: '#999',
    marginLeft: 4,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#2196f3',
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#2196f3',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  streamingIndicator: {
    marginTop: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef5350',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
    flex: 1,
  },
  errorDismiss: {
    padding: 4,
  },
  errorDismissText: {
    fontSize: 12,
    color: '#c62828',
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#2196f3',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

/**
 * Usage in your app:
 *
 * import { ChatbotExample } from './examples/ChatbotExample';
 *
 * <NavigationContainer>
 *   <Stack.Screen name="Chatbot" component={ChatbotExample} />
 * </NavigationContainer>
 */

/**
 * Features Demonstrated:
 * - Message display (user/assistant)
 * - Streaming response visualization
 * - Loading states
 * - Error handling
 * - Online/offline indicator
 * - Provider display (cloud/ondevice)
 * - Auto-scroll to new messages
 * - Clear conversation
 * - Keyboard handling
 * - Responsive UI
 */

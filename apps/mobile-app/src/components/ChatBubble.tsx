import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {ChatMessage} from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
}

/**
 * Chat Bubble Component
 * Reusable component for rendering chat messages
 */
export const ChatBubble: React.FC<ChatBubbleProps> = ({message}) => {
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}>
      <Text
        style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
        {message.content}
      </Text>
      <Text style={styles.timestamp}>
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B6B',
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
});

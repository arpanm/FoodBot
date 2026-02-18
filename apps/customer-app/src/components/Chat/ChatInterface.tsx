import React, { useEffect, useRef, useCallback } from 'react';

import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { sendMessage } from '../../store/slices/chatSlice';
import { ErrorMessage } from '../common/ErrorMessage';

import { InputField } from './InputField';
import { LoadingIndicator } from './LoadingIndicator';
import { MessageCard } from './MessageCard';

export interface ChatInterfaceProps {
  'data-testid'?: string;
}

/**
 * Main chat interface component
 * Uses useCallback to optimize event handlers and prevent unnecessary re-renders
 */
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  'data-testid': testId,
}) => {
  const dispatch = useAppDispatch();
  const { messages, loading, error } = useAppSelector((state) => state.chat);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memoize scroll function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Memoize message send handler
  const handleSendMessage = useCallback(async (message: string) => {
    if (message.trim()) {
      await dispatch(sendMessage(message.trim()));
    }
  }, [dispatch]);

  // Memoize retry handler
  const handleRetry = useCallback(() => {
    // Retry last message
  }, []);

  return (
    <div className="chat-interface" data-testid={testId || 'chat-interface'}>
      <div className="chat-messages" data-testid="chat-messages">
        {messages.map((message) => (
          <MessageCard key={message.id} message={message} />
        ))}
        {loading && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onRetry={handleRetry}
        />
      )}

      <div className="chat-input" data-testid="chat-input-area">
        <InputField onSend={handleSendMessage} disabled={loading} />
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';

export interface InputFieldProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  'data-testid'?: string;
}

/**
 * Chat input field component with send button
 */
export const InputField: React.FC<InputFieldProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
  'data-testid': testId,
}) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-field" data-testid={testId || 'input-field'}>
      <input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        data-testid="chat-input"
        aria-label="Chat message input"
      />
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        data-testid="send-button"
        aria-label="Send message"
      >
        Send
      </button>
    </div>
  );
};

import React, { useEffect, useRef, useCallback, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../hooks/useRedux';
import { useJobPolling } from '../../hooks/useJobPolling';
import { chatbotService } from '../../services/chatbot.service';
import { addMessage } from '../../store/slices/chatSlice';
import type { Message, Job, Restaurant, Dish } from '../../types/models';
import { ErrorMessage } from '../common/ErrorMessage';
import { JobResultRenderer } from '../Job/JobResultRenderer';
import { ProgressTracker } from '../Job/ProgressTracker';

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
  const { messages, error } = useAppSelector((state) => state.chat);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Poll active job status
  const { status, progress, result, error: jobError } = useJobPolling(
    activeJobId,
    {
      interval: 2000,
      maxAttempts: 60,
      onComplete: (result) => {
        handleJobComplete(result);
      },
      onError: (error) => {
        handleJobError(error);
      },
    }
  );

  // Update current job when polling updates
  useEffect(() => {
    if (activeJobId && status) {
      setCurrentJob((prev) => ({
        ...(prev || ({} as Job)),
        id: activeJobId,
        status: status as Job['status'],
        progress,
        result,
        updatedAt: new Date(),
      }));
    }
  }, [activeJobId, status, progress, result]);

  // Memoize scroll function
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle job completion
  const handleJobComplete = useCallback(
    (result: Message) => {
      const botMessage = chatbotService.createTextMessage(
        'Here are your results:',
        'bot'
      );
      dispatch(addMessage(botMessage));
      setActiveJobId(null);
      setIsProcessing(false);
    },
    [dispatch]
  );

  // Handle job error
  const handleJobError = useCallback(
    (error: Error) => {
      const errorMessage = chatbotService.createErrorMessage(error.message);
      dispatch(addMessage(errorMessage));
      setActiveJobId(null);
      setIsProcessing(false);
    },
    [dispatch]
  );

  // Memoize message send handler
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isProcessing) {
        return;
      }

      setIsProcessing(true);

      // Add user message
      const userMessage = chatbotService.createTextMessage(message, 'user');
      dispatch(addMessage(userMessage));

      try {
        // Process message with chatbot service
        const response = await chatbotService.processMessage(message);

        // Add bot response
        const botMessage = chatbotService.createTextMessage(
          response.message,
          'bot'
        );
        dispatch(addMessage(botMessage));

        // If a job was created, start polling
        if (response.type === 'job_created' && response.jobId) {
          setActiveJobId(response.jobId);
          setCurrentJob({
            id: response.jobId,
            action: response.intent?.type as Job['action'],
            platform: response.intent?.platform || 'mock',
            status: 'QUEUED',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          setIsProcessing(false);
        }
      } catch (err) {
        const error = err as Error;
        const errorMessage = chatbotService.createErrorMessage(error.message);
        dispatch(addMessage(errorMessage));
        setIsProcessing(false);
      }
    },
    [dispatch, isProcessing]
  );

  // Handle restaurant selection from results
  const handleRestaurantSelect = useCallback((restaurant: Restaurant) => {
    // Navigate to restaurant details or add to cart
    console.log('Restaurant selected:', restaurant);
  }, []);

  // Handle dish selection from results
  const handleDishSelect = useCallback((dish: Dish) => {
    // Navigate to dish details or add to cart
    console.log('Dish selected:', dish);
  }, []);

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

        {/* Show progress tracker for active job */}
        {currentJob && (
          <div className="job-progress-container">
            <ProgressTracker job={currentJob} />
          </div>
        )}

        {/* Show job results */}
        {currentJob && currentJob.status === 'COMPLETED' && (
          <div className="job-result-container">
            <JobResultRenderer
              job={currentJob}
              onRestaurantSelect={handleRestaurantSelect}
              onDishSelect={handleDishSelect}
            />
          </div>
        )}

        {isProcessing && !currentJob && <LoadingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <ErrorMessage
          message={error}
          onRetry={handleRetry}
        />
      )}

      {jobError && (
        <ErrorMessage
          message={jobError.message}
          onRetry={handleRetry}
        />
      )}

      <div className="chat-input" data-testid="chat-input-area">
        <InputField onSend={handleSendMessage} disabled={isProcessing} />
      </div>
    </div>
  );
};

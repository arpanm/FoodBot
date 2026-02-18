/**
 * Test data factory for chat messages
 */

export interface Message {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: Date;
  type: 'text' | 'card' | 'form' | 'status';
  metadata?: {
    cards?: MessageCard[];
    form?: FormField[];
    buttons?: CTAButton[];
    status?: StatusInfo;
  };
}

export interface MessageCard {
  id: string;
  title: string;
  description: string;
  image: string;
  price?: number;
  rating?: number;
  attributes?: Record<string, string>;
}

export interface FormField {
  id: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface CTAButton {
  id: string;
  label: string;
  action: string;
  variant: 'primary' | 'secondary' | 'outline';
}

export interface StatusInfo {
  stage: string;
  progress: number;
  message: string;
}

let messageIdCounter = 1;

/**
 * Generates a mock message
 * @param overrides - Partial message to override defaults
 * @returns Mock message object
 */
export function mockMessage(overrides: Partial<Message> = {}): Message {
  const id = `msg-${messageIdCounter++}`;
  return {
    id,
    sender: 'user',
    content: 'I want to order pizza',
    timestamp: new Date('2024-01-01T10:00:00Z'),
    type: 'text',
    ...overrides,
  };
}

/**
 * Generates multiple mock messages
 * @param count - Number of messages to generate
 * @param overrides - Partial message to override defaults
 * @returns Array of mock messages
 */
export function mockMessages(
  count: number,
  overrides: Partial<Message> = {}
): Message[] {
  return Array.from({ length: count }, (_, index) =>
    mockMessage({
      id: `msg-${index + 1}`,
      sender: index % 2 === 0 ? 'user' : 'bot',
      content: index % 2 === 0 ? `User message ${index + 1}` : `Bot response ${index + 1}`,
      timestamp: new Date(Date.now() - (count - index) * 60000),
      ...overrides,
    })
  );
}

/**
 * Generates a bot message with cards
 * @param cardCount - Number of cards to include
 * @param overrides - Partial message to override defaults
 * @returns Mock message with cards
 */
export function mockMessageWithCards(
  cardCount: number = 3,
  overrides: Partial<Message> = {}
): Message {
  return mockMessage({
    sender: 'bot',
    type: 'card',
    content: 'Here are some restaurant options:',
    metadata: {
      cards: Array.from({ length: cardCount }, (_, index) => ({
        id: `card-${index + 1}`,
        title: `Restaurant ${index + 1}`,
        description: `Description for restaurant ${index + 1}`,
        image: `https://example.com/restaurant${index + 1}.jpg`,
        price: 15 + index * 5,
        rating: 4.0 + index * 0.2,
        attributes: {
          cuisine: 'Italian',
          deliveryTime: '30-45 min',
        },
      })),
    },
    ...overrides,
  });
}

/**
 * Generates a bot message with form fields
 * @param overrides - Partial message to override defaults
 * @returns Mock message with form
 */
export function mockMessageWithForm(overrides: Partial<Message> = {}): Message {
  return mockMessage({
    sender: 'bot',
    type: 'form',
    content: 'Please provide your delivery details:',
    metadata: {
      form: [
        {
          id: 'address',
          type: 'textarea',
          label: 'Delivery Address',
          placeholder: 'Enter your delivery address',
          required: true,
        },
        {
          id: 'phone',
          type: 'text',
          label: 'Phone Number',
          placeholder: '+1 (555) 123-4567',
          required: true,
        },
        {
          id: 'instructions',
          type: 'textarea',
          label: 'Special Instructions',
          placeholder: 'Any special delivery instructions?',
          required: false,
        },
      ],
    },
    ...overrides,
  });
}

/**
 * Generates a bot message with CTA buttons
 * @param buttonCount - Number of buttons to include
 * @param overrides - Partial message to override defaults
 * @returns Mock message with buttons
 */
export function mockMessageWithButtons(
  buttonCount: number = 2,
  overrides: Partial<Message> = {}
): Message {
  return mockMessage({
    sender: 'bot',
    content: 'What would you like to do?',
    metadata: {
      buttons: Array.from({ length: buttonCount }, (_, index) => ({
        id: `btn-${index + 1}`,
        label: `Action ${index + 1}`,
        action: `action_${index + 1}`,
        variant: index === 0 ? 'primary' : 'secondary',
      })) as CTAButton[],
    },
    ...overrides,
  });
}

/**
 * Generates a status update message
 * @param stage - Current workflow stage
 * @param progress - Progress percentage (0-100)
 * @param overrides - Partial message to override defaults
 * @returns Mock status message
 */
export function mockStatusMessage(
  stage: string = 'processing',
  progress: number = 50,
  overrides: Partial<Message> = {}
): Message {
  return mockMessage({
    sender: 'bot',
    type: 'status',
    content: 'Processing your order...',
    metadata: {
      status: {
        stage,
        progress,
        message: `Current stage: ${stage}`,
      },
    },
    ...overrides,
  });
}

/**
 * Resets the message ID counter (useful for consistent test snapshots)
 */
export function resetMessageIdCounter(): void {
  messageIdCounter = 1;
}

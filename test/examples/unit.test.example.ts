/**
 * Example Unit Test
 * Demonstrates Jest unit testing patterns for FoodBot
 */

describe('Example Unit Test Suite', () => {
  // Setup before all tests
  beforeAll(() => {
    // Initialize test environment
  });

  // Cleanup after all tests
  afterAll(() => {
    // Cleanup test environment
  });

  // Setup before each test
  beforeEach(() => {
    // Reset mocks, clear state
    jest.clearAllMocks();
  });

  describe('Calculator Example', () => {
    // Simple function to test
    const add = (a: number, b: number): number => a + b;
    const divide = (a: number, b: number): number => {
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    };

    it('should add two numbers correctly.', () => {
      // Arrange
      const a = 5;
      const b = 3;

      // Act
      const result = add(a, b);

      // Assert
      expect(result).toBe(8);
    });

    it('should divide two numbers correctly.', () => {
      expect(divide(10, 2)).toBe(5);
      expect(divide(9, 3)).toBe(3);
    });

    it('should throw error when dividing by zero.', () => {
      expect(() => divide(10, 0)).toThrow('Division by zero');
    });
  });

  describe('Mock Example', () => {
    // Example service
    class UserService {
      async getUser(id: string): Promise<{ id: string; name: string }> {
        // Simulated API call
        await Promise.resolve(); // Simulate async operation
        return { id, name: 'John Doe' };
      }
    }

    it('should mock service method.', async () => {
      // Arrange
      const userService = new UserService();
      const mockGetUser = jest.spyOn(userService, 'getUser');
      mockGetUser.mockResolvedValue({ id: '123', name: 'Test User' });

      // Act
      const user = await userService.getUser('123');

      // Assert
      expect(user).toEqual({ id: '123', name: 'Test User' });
      expect(mockGetUser).toHaveBeenCalledWith('123');
      expect(mockGetUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('Async Example', () => {
    const fetchData = async (): Promise<string> => {
      return new Promise(resolve => {
        setTimeout(() => resolve('data'), 100);
      });
    };

    it('should handle async operations.', async () => {
      const data = await fetchData();
      expect(data).toBe('data');
    });

    it('should handle promises with resolves.', () => {
      return expect(fetchData()).resolves.toBe('data');
    });
  });

  describe('Custom Matchers Example', () => {
    it('should validate UUID format.', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const invalidUUID = 'not-a-uuid';

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      expect(validUUID).toBeValidUUID();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      expect(invalidUUID).not.toBeValidUUID();
    });

    it('should validate ISO date format.', () => {
      const validDate = new Date().toISOString();
      const invalidDate = '2024-13-45'; // Invalid date

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      expect(validDate).toBeValidISODate();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      expect(invalidDate).not.toBeValidISODate();
    });
  });
});

/**
 * Domain Error Example
 */
class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order ${orderId} not found`);
    this.name = 'OrderNotFoundError';
  }
}

describe('Domain Error Example', () => {
  const findOrder = (orderId: string): { id: string } | never => {
    if (orderId === 'invalid') {
      throw new OrderNotFoundError(orderId);
    }
    return { id: orderId };
  };

  it('should throw domain error for invalid order.', () => {
    expect(() => findOrder('invalid')).toThrow(OrderNotFoundError);
    expect(() => findOrder('invalid')).toThrow('Order invalid not found');
  });

  it('should return order for valid ID.', () => {
    const order = findOrder('valid-123');
    expect(order).toEqual({ id: 'valid-123' });
  });
});

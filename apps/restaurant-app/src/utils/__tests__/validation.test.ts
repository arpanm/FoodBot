import {
  validateEmail,
  validatePassword,
  validateRequired,
  validatePhone,
  validatePrice,
  validateDishForm,
} from '../validation';

describe('validateEmail', () => {
  it('should return error for empty email', () => {
    expect(validateEmail('')).toBe('Email is required');
  });

  it('should return error for invalid email', () => {
    expect(validateEmail('notanemail')).toBe('Please enter a valid email address');
  });

  it('should return null for valid email', () => {
    expect(validateEmail('test@example.com')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('should return error for empty password', () => {
    expect(validatePassword('')).toBe('Password is required');
  });

  it('should return error for short password', () => {
    expect(validatePassword('Ab1')).toBe('Password must be at least 8 characters long');
  });

  it('should return error for password without uppercase', () => {
    expect(validatePassword('abcdefg1')).toBe(
      'Password must contain at least one uppercase letter'
    );
  });

  it('should return error for password without lowercase', () => {
    expect(validatePassword('ABCDEFG1')).toBe(
      'Password must contain at least one lowercase letter'
    );
  });

  it('should return error for password without number', () => {
    expect(validatePassword('Abcdefgh')).toBe(
      'Password must contain at least one number'
    );
  });

  it('should return null for valid password', () => {
    expect(validatePassword('Abcdefg1')).toBeNull();
  });
});

describe('validateRequired', () => {
  it('should return error for empty string', () => {
    expect(validateRequired('', 'Name')).toBe('Name is required');
  });

  it('should return error for whitespace-only string', () => {
    expect(validateRequired('   ', 'Name')).toBe('Name is required');
  });

  it('should return null for non-empty string', () => {
    expect(validateRequired('John', 'Name')).toBeNull();
  });
});

describe('validatePhone', () => {
  it('should return null for empty phone (optional)', () => {
    expect(validatePhone('')).toBeNull();
  });

  it('should return error for invalid phone', () => {
    expect(validatePhone('123')).toBe('Please enter a valid phone number');
  });

  it('should return null for valid phone', () => {
    expect(validatePhone('+1-555-123-4567')).toBeNull();
  });
});

describe('validatePrice', () => {
  it('should return error for negative price', () => {
    expect(validatePrice(-1)).toBe('Price cannot be negative');
  });

  it('should return error for price exceeding maximum', () => {
    expect(validatePrice(100000)).toBe('Price exceeds maximum limit');
  });

  it('should return null for valid price', () => {
    expect(validatePrice(12.99)).toBeNull();
  });

  it('should return null for zero price', () => {
    expect(validatePrice(0)).toBeNull();
  });
});

describe('validateDishForm', () => {
  const validData = {
    name: 'Test Dish',
    description: 'A test dish',
    price: 12.99,
    category: 'Main Course',
    preparationTime: 15,
  };

  it('should return isValid=true for valid data', () => {
    const result = validateDishForm(validData);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('should return error for missing name', () => {
    const result = validateDishForm({ ...validData, name: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('should return error for missing description', () => {
    const result = validateDishForm({ ...validData, description: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.description).toBeDefined();
  });

  it('should return error for negative price', () => {
    const result = validateDishForm({ ...validData, price: -5 });
    expect(result.isValid).toBe(false);
    expect(result.errors.price).toBeDefined();
  });

  it('should return error for missing category', () => {
    const result = validateDishForm({ ...validData, category: '' });
    expect(result.isValid).toBe(false);
    expect(result.errors.category).toBeDefined();
  });

  it('should return error for zero preparation time', () => {
    const result = validateDishForm({ ...validData, preparationTime: 0 });
    expect(result.isValid).toBe(false);
    expect(result.errors.preparationTime).toBeDefined();
  });

  it('should return multiple errors when multiple fields invalid', () => {
    const result = validateDishForm({
      name: '',
      description: '',
      price: -1,
      category: '',
      preparationTime: 0,
    });
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThanOrEqual(4);
  });
});

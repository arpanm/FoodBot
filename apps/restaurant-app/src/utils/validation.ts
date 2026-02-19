/**
 * Validation utility functions
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateEmail(email: string): string | null {
  if (!email) {
    return 'Email is required';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || value.trim().length === 0) {
    return `${fieldName} is required`;
  }
  return null;
}

export function validatePhone(phone: string): string | null {
  if (!phone) {
    return null;
  }
  const phoneRegex = /^\+?[\d\s-()]{10,15}$/;
  if (!phoneRegex.test(phone)) {
    return 'Please enter a valid phone number';
  }
  return null;
}

export function validatePrice(price: number): string | null {
  if (price < 0) {
    return 'Price cannot be negative';
  }
  if (price > 99999) {
    return 'Price exceeds maximum limit';
  }
  return null;
}

export function validateDishForm(data: {
  name: string;
  description: string;
  price: number;
  category: string;
  preparationTime: number;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const nameError = validateRequired(data.name, 'Dish name');
  if (nameError) {
    errors.name = nameError;
  }

  const descError = validateRequired(data.description, 'Description');
  if (descError) {
    errors.description = descError;
  }

  const priceError = validatePrice(data.price);
  if (priceError) {
    errors.price = priceError;
  }

  const categoryError = validateRequired(data.category, 'Category');
  if (categoryError) {
    errors.category = categoryError;
  }

  if (data.preparationTime <= 0) {
    errors.preparationTime = 'Preparation time must be greater than 0';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

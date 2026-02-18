import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import type { FormField } from '../DynamicForm';
import { DynamicForm } from '../DynamicForm';

/**
 * DynamicForm Component Tests
 */

function createTextField(overrides: Partial<FormField> = {}): FormField {
  return {
    id: 'name',
    type: 'text',
    label: 'Name',
    placeholder: 'Enter name',
    required: false,
    ...overrides,
  };
}

function createSelectField(overrides: Partial<FormField> = {}): FormField {
  return {
    id: 'cuisine',
    type: 'select',
    label: 'Cuisine',
    required: false,
    options: ['Italian', 'Mexican', 'Japanese'],
    ...overrides,
  };
}

function createTextareaField(overrides: Partial<FormField> = {}): FormField {
  return {
    id: 'notes',
    type: 'textarea',
    label: 'Notes',
    placeholder: 'Any special instructions',
    required: false,
    ...overrides,
  };
}

describe('DynamicForm Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<DynamicForm fields={[]} onSubmit={jest.fn()} />);
      expect(screen.getByTestId('dynamic-form')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<DynamicForm fields={[]} onSubmit={jest.fn()} data-testid="my-form" />);
      expect(screen.getByTestId('my-form')).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<DynamicForm fields={[]} onSubmit={jest.fn()} />);
      expect(screen.getByTestId('form-submit')).toBeInTheDocument();
    });

    it('renders custom submit label', () => {
      render(<DynamicForm fields={[]} onSubmit={jest.fn()} submitLabel="Send" />);
      expect(screen.getByText('Send')).toBeInTheDocument();
    });

    it('renders default Submit label', () => {
      render(<DynamicForm fields={[]} onSubmit={jest.fn()} />);
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });

  describe('Field Rendering', () => {
    it('renders text input field', () => {
      const fields = [createTextField()];
      render(<DynamicForm fields={fields} onSubmit={jest.fn()} />);

      expect(screen.getByTestId('field-name')).toBeInTheDocument();
      expect(screen.getByTestId('input-name')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    it('renders text input with placeholder', () => {
      const fields = [createTextField({ placeholder: 'Enter your name' })];
      render(<DynamicForm fields={fields} onSubmit={jest.fn()} />);

      expect(screen.getByPlaceholderText('Enter your name')).toBeInTheDocument();
    });

    it('renders select field', () => {
      const fields = [createSelectField()];
      render(<DynamicForm fields={fields} onSubmit={jest.fn()} />);

      expect(screen.getByTestId('input-cuisine')).toBeInTheDocument();
      expect(screen.getByText('Select...')).toBeInTheDocument();
      expect(screen.getByText('Italian')).toBeInTheDocument();
      expect(screen.getByText('Mexican')).toBeInTheDocument();
      expect(screen.getByText('Japanese')).toBeInTheDocument();
    });

    it('renders textarea field', () => {
      const fields = [createTextareaField()];
      render(<DynamicForm fields={fields} onSubmit={jest.fn()} />);

      expect(screen.getByTestId('input-notes')).toBeInTheDocument();
    });

    it('renders number field', () => {
      const fields = [createTextField({ id: 'quantity', type: 'number', label: 'Quantity' })];
      render(<DynamicForm fields={fields} onSubmit={jest.fn()} />);

      expect(screen.getByTestId('input-quantity')).toBeInTheDocument();
    });

    it('renders required indicator for required fields', () => {
      const fields = [createTextField({ required: true })];
      render(<DynamicForm fields={fields} onSubmit={jest.fn()} />);

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders multiple fields', () => {
      const fields = [createTextField(), createSelectField(), createTextareaField()];
      render(<DynamicForm fields={fields} onSubmit={jest.fn()} />);

      expect(screen.getByTestId('field-name')).toBeInTheDocument();
      expect(screen.getByTestId('field-cuisine')).toBeInTheDocument();
      expect(screen.getByTestId('field-notes')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('handles text input changes', () => {
      const fields = [createTextField()];
      render(<DynamicForm fields={fields} onSubmit={jest.fn()} />);

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John' } });
      expect(screen.getByTestId('input-name')).toHaveValue('John');
    });

    it('handles select changes', () => {
      const fields = [createSelectField()];
      render(<DynamicForm fields={fields} onSubmit={jest.fn()} />);

      fireEvent.change(screen.getByTestId('input-cuisine'), { target: { value: 'Italian' } });
      expect(screen.getByTestId('input-cuisine')).toHaveValue('Italian');
    });

    it('handles textarea changes', () => {
      const fields = [createTextareaField()];
      render(<DynamicForm fields={fields} onSubmit={jest.fn()} />);

      fireEvent.change(screen.getByTestId('input-notes'), { target: { value: 'No onions' } });
      expect(screen.getByTestId('input-notes')).toHaveValue('No onions');
    });
  });

  describe('Validation', () => {
    it('shows error for empty required fields on submit', () => {
      const fields = [createTextField({ required: true })];
      const handleSubmit = jest.fn();
      render(<DynamicForm fields={fields} onSubmit={handleSubmit} />);

      fireEvent.submit(screen.getByTestId('dynamic-form'));

      expect(screen.getByTestId('error-name')).toHaveTextContent('Name is required');
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('shows error for whitespace-only required fields', () => {
      const fields = [createTextField({ required: true })];
      const handleSubmit = jest.fn();
      render(<DynamicForm fields={fields} onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: '   ' } });
      fireEvent.click(screen.getByTestId('form-submit'));

      expect(screen.getByTestId('error-name')).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });

    it('clears error when field is filled', () => {
      const fields = [createTextField({ required: true })];
      render(<DynamicForm fields={fields} onSubmit={jest.fn()} />);

      // Trigger validation error
      fireEvent.submit(screen.getByTestId('dynamic-form'));
      expect(screen.getByTestId('error-name')).toBeInTheDocument();

      // Fill in the field
      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John' } });
      expect(screen.queryByTestId('error-name')).not.toBeInTheDocument();
    });

    it('does not show error for optional empty fields', () => {
      const fields = [createTextField({ required: false })];
      const handleSubmit = jest.fn();
      render(<DynamicForm fields={fields} onSubmit={handleSubmit} />);

      fireEvent.click(screen.getByTestId('form-submit'));
      expect(screen.queryByTestId('error-name')).not.toBeInTheDocument();
      expect(handleSubmit).toHaveBeenCalled();
    });

    it('validates multiple required fields', () => {
      const fields = [
        createTextField({ required: true }),
        createSelectField({ required: true }),
      ];
      const handleSubmit = jest.fn();
      render(<DynamicForm fields={fields} onSubmit={handleSubmit} />);

      fireEvent.submit(screen.getByTestId('dynamic-form'));
      expect(screen.getByTestId('error-name')).toBeInTheDocument();
      expect(screen.getByTestId('error-cuisine')).toBeInTheDocument();
      expect(handleSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with form values', () => {
      const fields = [createTextField()];
      const handleSubmit = jest.fn();
      render(<DynamicForm fields={fields} onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John' } });
      fireEvent.click(screen.getByTestId('form-submit'));

      expect(handleSubmit).toHaveBeenCalledWith({ name: 'John' });
    });

    it('submits multiple field values', () => {
      const fields = [createTextField(), createTextareaField()];
      const handleSubmit = jest.fn();
      render(<DynamicForm fields={fields} onSubmit={handleSubmit} />);

      fireEvent.change(screen.getByTestId('input-name'), { target: { value: 'John' } });
      fireEvent.change(screen.getByTestId('input-notes'), { target: { value: 'Extra cheese' } });
      fireEvent.click(screen.getByTestId('form-submit'));

      expect(handleSubmit).toHaveBeenCalledWith({ name: 'John', notes: 'Extra cheese' });
    });
  });
});

import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  variant?: 'outlined' | 'filled' | 'standard';
  'data-testid'?: string;
}

/**
 * Input component with validation support
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      variant = 'outlined',
      className = '',
      'data-testid': testId,
      ...props
    },
    ref
  ) => {
    const inputClasses = [
      'input',
      `input-${variant}`,
      fullWidth ? 'input-full-width' : '',
      error ? 'input-error' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="input-container" data-testid={`${testId}-container`}>
        {label && (
          <label htmlFor={props.id} className="input-label">
            {label}
            {props.required && <span className="input-required">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={inputClasses}
          data-testid={testId || 'input'}
          aria-invalid={!!error}
          aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
          {...props}
        />
        {error && (
          <span id={`${props.id}-error`} className="input-error-text" role="alert">
            {error}
          </span>
        )}
        {helperText && !error && (
          <span id={`${props.id}-helper`} className="input-helper-text">
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

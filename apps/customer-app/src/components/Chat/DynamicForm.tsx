import React, { useState } from 'react';

export interface FormField {
  id: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface DynamicFormProps {
  fields: FormField[];
  onSubmit: (values: Record<string, string>) => void;
  submitLabel?: string;
  'data-testid'?: string;
}

/**
 * Dynamic form component that renders based on field definitions
 */
export const DynamicForm: React.FC<DynamicFormProps> = ({
  fields,
  onSubmit,
  submitLabel = 'Submit',
  'data-testid': testId,
}) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (fieldId: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.required && !values[field.id]?.trim()) {
        newErrors[field.id] = `${field.label} is required`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(values);
    }
  };

  return (
    <form
      className="dynamic-form"
      onSubmit={handleSubmit}
      data-testid={testId || 'dynamic-form'}
    >
      {fields.map((field) => (
        <div key={field.id} className="form-field" data-testid={`field-${field.id}`}>
          <label htmlFor={field.id}>
            {field.label}
            {field.required && <span className="required">*</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              id={field.id}
              value={values[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              data-testid={`input-${field.id}`}
            />
          ) : field.type === 'select' ? (
            <select
              id={field.id}
              value={values[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              required={field.required}
              data-testid={`input-${field.id}`}
            >
              <option value="">Select...</option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={field.id}
              type={field.type}
              value={values[field.id] || ''}
              onChange={(e) => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              data-testid={`input-${field.id}`}
            />
          )}
          {errors[field.id] && (
            <span className="field-error" data-testid={`error-${field.id}`}>
              {errors[field.id]}
            </span>
          )}
        </div>
      ))}
      <button type="submit" data-testid="form-submit">
        {submitLabel}
      </button>
    </form>
  );
};

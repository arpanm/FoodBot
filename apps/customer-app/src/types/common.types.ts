/**
 * Common Utility Types
 * Shared types and utility type definitions
 */

// ==================== Generic Utility Types ====================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Record<Exclude<Keys, K>, never>>;
  }[Keys];

// ==================== Component Prop Types ====================

export interface BaseComponentProps {
  className?: string;
  'data-testid'?: string;
  id?: string;
}

export interface ClickableComponentProps extends BaseComponentProps {
  onClick?: () => void;
  disabled?: boolean;
}

export interface LoadingProps {
  loading?: boolean;
  loadingText?: string;
}

export interface ErrorProps {
  error?: string | null;
  onErrorDismiss?: () => void;
}

// ==================== Form Types ====================

export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'radio';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: string | number | RegExp;
  message: string;
  validator?: (value: unknown) => boolean;
}

export interface FormState<T = Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface FormActions<T = Record<string, unknown>> {
  setValue: (field: keyof T, value: unknown) => void;
  setError: (field: keyof T, error: string) => void;
  setTouched: (field: keyof T, touched: boolean) => void;
  resetForm: () => void;
  submitForm: () => void;
}

// ==================== Event Handler Types ====================

export type ChangeHandler<T = HTMLInputElement> = (
  event: React.ChangeEvent<T>
) => void;

export type SubmitHandler = (event: React.FormEvent<HTMLFormElement>) => void;

export type ClickHandler<T = HTMLElement> = (
  event: React.MouseEvent<T>
) => void;

export type KeyboardHandler<T = HTMLElement> = (
  event: React.KeyboardEvent<T>
) => void;

// ==================== API & Service Types ====================

export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  signal?: AbortSignal;
}

export interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  retryCondition?: (error: Error) => boolean;
}

export interface CacheConfig {
  enabled?: boolean;
  ttl?: number;
  key?: string;
}

// ==================== Polling & Async Types ====================

export interface PollingOptions {
  interval?: number;
  maxAttempts?: number;
  stopCondition?: (result: unknown) => boolean;
  onProgress?: (progress: number) => void;
  onComplete?: (result: unknown) => void;
  onError?: (error: Error) => void;
}

export interface AsyncOperation<T> {
  status: 'idle' | 'pending' | 'success' | 'error';
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

// ==================== Storage Types ====================

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export interface StorageOptions {
  prefix?: string;
  serialize?: (value: unknown) => string;
  deserialize?: (value: string) => unknown;
}

// ==================== Theme Types ====================

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
}

export interface ThemeConfig {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    full: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
  };
}

// ==================== Route Types ====================

export interface RouteConfig {
  path: string;
  exact?: boolean;
  component: React.ComponentType;
  protected?: boolean;
  title?: string;
  meta?: Record<string, string>;
}

export interface NavigationItem {
  label: string;
  path: string;
  icon?: React.ComponentType;
  children?: NavigationItem[];
  exact?: boolean;
}

// ==================== Filter & Sort Types ====================

export interface SortOption<T = string> {
  field: T;
  direction: 'asc' | 'desc';
  label: string;
}

export interface FilterOption<T = unknown> {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: T;
}

// ==================== Test & Mock Types ====================

export interface MockFactory<T> {
  create: (overrides?: Partial<T>) => T;
  createMany: (count: number, overrides?: Partial<T>) => T[];
}

export interface TestIdProps {
  'data-testid'?: string;
}

// ==================== Image & Media Types ====================

export interface ImageSource {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
}

export interface ResponsiveImage extends ImageSource {
  srcSet?: string;
  sizes?: string;
}

// ==================== Pagination Component Types ====================

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  siblingCount?: number;
}

// ==================== Modal & Dialog Types ====================

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export interface DialogAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

// ==================== Toast/Notification Types ====================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
  id?: string;
  type: ToastType;
  message: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ==================== Analytics & Tracking Types ====================

export interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface TrackingConfig {
  enabled: boolean;
  anonymizeIp?: boolean;
  cookieConsent?: boolean;
}

import { GooglePlacesStatus } from '../../interfaces/google-places.types';

/**
 * Base error class for Google Places API errors
 */
export class GooglePlacesError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: GooglePlacesStatus,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GooglePlacesError';
  }
}

/**
 * API key is missing or invalid
 */
export class GooglePlacesApiKeyError extends GooglePlacesError {
  constructor(message = 'Google Places API key is not configured') {
    super('GOOGLE_PLACES_API_KEY_ERROR', message, GooglePlacesStatus.REQUEST_DENIED);
  }
}

/**
 * API request timeout
 */
export class GooglePlacesTimeoutError extends GooglePlacesError {
  constructor(url: string, timeoutMs: number) {
    super(
      'GOOGLE_PLACES_TIMEOUT',
      `Google Places API request timed out after ${timeoutMs}ms`,
      GooglePlacesStatus.UNKNOWN_ERROR,
      { url, timeoutMs },
    );
  }
}

/**
 * Network error during API call
 */
export class GooglePlacesNetworkError extends GooglePlacesError {
  constructor(message: string, url: string) {
    super('GOOGLE_PLACES_NETWORK_ERROR', `Network error: ${message}`, GooglePlacesStatus.UNKNOWN_ERROR, { url });
  }
}

/**
 * Over query limit (rate limiting)
 */
export class GooglePlacesRateLimitError extends GooglePlacesError {
  constructor(message = 'Google Places API rate limit exceeded') {
    super('GOOGLE_PLACES_RATE_LIMIT', message, GooglePlacesStatus.OVER_QUERY_LIMIT);
  }
}

/**
 * Invalid request parameters
 */
export class GooglePlacesInvalidRequestError extends GooglePlacesError {
  constructor(message: string, params?: Record<string, unknown>) {
    super('GOOGLE_PLACES_INVALID_REQUEST', message, GooglePlacesStatus.INVALID_REQUEST, params);
  }
}

/**
 * No results found
 */
export class GooglePlacesZeroResultsError extends GooglePlacesError {
  constructor(message = 'No results found') {
    super('GOOGLE_PLACES_ZERO_RESULTS', message, GooglePlacesStatus.ZERO_RESULTS);
  }
}

/**
 * Unexpected API response
 */
export class GooglePlacesUnexpectedError extends GooglePlacesError {
  constructor(message: string, status: GooglePlacesStatus, context?: Record<string, unknown>) {
    super('GOOGLE_PLACES_UNEXPECTED_ERROR', message, status, context);
  }
}

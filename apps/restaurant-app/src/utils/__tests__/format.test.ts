import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercentage,
  formatOrderNumber,
  truncateText,
} from '../format';

describe('formatCurrency', () => {
  it('should format positive amounts', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('should format small amounts', () => {
    expect(formatCurrency(0.5)).toBe('$0.50');
  });

  it('should format large amounts', () => {
    expect(formatCurrency(99999.99)).toBe('$99,999.99');
  });
});

describe('formatDate', () => {
  it('should format a date string', () => {
    const result = formatDate('2024-06-15T10:30:00Z');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });
});

describe('formatDateTime', () => {
  it('should include both date and time', () => {
    const result = formatDateTime('2024-06-15T10:30:00Z');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
  });
});

describe('formatPercentage', () => {
  it('should format positive percentages with plus sign', () => {
    expect(formatPercentage(15.5)).toBe('+15.5%');
  });

  it('should format negative percentages', () => {
    expect(formatPercentage(-8.2)).toBe('-8.2%');
  });

  it('should format zero', () => {
    expect(formatPercentage(0)).toBe('+0.0%');
  });

  it('should respect custom decimal places', () => {
    expect(formatPercentage(15.567, 2)).toBe('+15.57%');
  });
});

describe('formatOrderNumber', () => {
  it('should prepend hash symbol', () => {
    expect(formatOrderNumber('ORD-00001')).toBe('#ORD-00001');
  });
});

describe('truncateText', () => {
  it('should return text unchanged when shorter than max', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
  });

  it('should truncate text that exceeds max length', () => {
    expect(truncateText('Hello World', 5)).toBe('Hello...');
  });

  it('should return text unchanged when equal to max length', () => {
    expect(truncateText('Hello', 5)).toBe('Hello');
  });
});

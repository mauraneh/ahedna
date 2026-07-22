import { formatEuroPrice, toDateTimeInputValue } from './date-time';

describe('toDateTimeInputValue', () => {
  it('formats a date as a datetime-local input value (YYYY-MM-DDTHH:mm)', () => {
    const date = new Date(2027, 0, 5, 9, 7);
    expect(toDateTimeInputValue(date.toISOString())).toBe('2027-01-05T09:07');
  });

  it('pads single-digit months, days, hours and minutes', () => {
    const date = new Date(2027, 8, 3, 4, 5);
    expect(toDateTimeInputValue(date.toISOString())).toBe('2027-09-03T04:05');
  });
});

describe('formatEuroPrice', () => {
  const freeLabel = 'Gratuit';

  it('returns the free label for a zero, negative, missing or invalid amount', () => {
    expect(formatEuroPrice(0, 'fr-FR', freeLabel)).toBe(freeLabel);
    expect(formatEuroPrice(-5, 'fr-FR', freeLabel)).toBe(freeLabel);
    expect(formatEuroPrice(null, 'fr-FR', freeLabel)).toBe(freeLabel);
    expect(formatEuroPrice(undefined, 'fr-FR', freeLabel)).toBe(freeLabel);
    expect(formatEuroPrice('abc', 'fr-FR', freeLabel)).toBe(freeLabel);
  });

  it('formats a positive numeric amount as a EUR currency string', () => {
    const formatted = formatEuroPrice(12.5, 'fr-FR', freeLabel);
    expect(formatted).toContain('12,50');
    expect(formatted).toContain('€');
  });

  it('accepts a positive amount provided as a string', () => {
    const formatted = formatEuroPrice('20', 'fr-FR', freeLabel);
    expect(formatted).toContain('20');
  });
});

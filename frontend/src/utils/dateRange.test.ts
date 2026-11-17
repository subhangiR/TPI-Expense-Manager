import { isValidRange, presetRange } from './dateRange';

// Monday 16 Nov 2026 is a good day to test: the week, month, quarter and year all start on different dates.
const today = new Date(2026, 10, 16);

describe('presetRange', () => {
  it('runs each preset from its start up to today', () => {
    expect(presetRange('week', today)).toEqual({ preset: 'week', dateFrom: '2026-11-16', dateTo: '2026-11-16' });
    expect(presetRange('month', today)).toEqual({ preset: 'month', dateFrom: '2026-11-01', dateTo: '2026-11-16' });
    expect(presetRange('quarter', today)).toEqual({ preset: 'quarter', dateFrom: '2026-10-01', dateTo: '2026-11-16' });
    expect(presetRange('year', today)).toEqual({ preset: 'year', dateFrom: '2026-01-01', dateTo: '2026-11-16' });
  });

  it('starts the week on Monday, even on a Sunday', () => {
    expect(presetRange('week', new Date(2026, 10, 22)).dateFrom).toBe('2026-11-16');
  });

  it('has no dates for life time', () => {
    expect(presetRange('all', today)).toEqual({ preset: 'all' });
  });
});

describe('isValidRange', () => {
  it('needs both custom dates, in order', () => {
    expect(isValidRange({ preset: 'custom' })).toBe(false);
    expect(isValidRange({ preset: 'custom', dateFrom: '2026-11-10' })).toBe(false);
    expect(isValidRange({ preset: 'custom', dateFrom: '2026-11-10', dateTo: '2026-11-01' })).toBe(false);
    expect(isValidRange({ preset: 'custom', dateFrom: '2026-11-01', dateTo: '2026-11-10' })).toBe(true);
    expect(isValidRange({ preset: 'all' })).toBe(true);
  });
});

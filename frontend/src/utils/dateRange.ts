import { formatDate } from './format';

export type RangePreset = 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';

export interface DateRange {
  preset: RangePreset;
  dateFrom?: string; // "YYYY-MM-DD"; missing for Life time
  dateTo?: string;
}

export const PRESET_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'Life time' },
  { value: 'custom', label: 'Custom range' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Every preset runs from its start up to today ("month to date"), so future days never show as empty.
export function presetRange(preset: RangePreset, today = new Date()): DateRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  const dateTo = toIso(today);

  if (preset === 'week') {
    const sinceMonday = (today.getDay() + 6) % 7; // weeks start on Monday
    return { preset, dateFrom: toIso(new Date(y, m, today.getDate() - sinceMonday)), dateTo };
  }
  if (preset === 'month') return { preset, dateFrom: toIso(new Date(y, m, 1)), dateTo };
  if (preset === 'quarter') return { preset, dateFrom: toIso(new Date(y, m - (m % 3), 1)), dateTo };
  if (preset === 'year') return { preset, dateFrom: toIso(new Date(y, 0, 1)), dateTo };
  return { preset };
}

// A custom range needs both dates, in the right order. Presets are always valid.
export function isValidRange(range: DateRange): boolean {
  if (range.preset !== 'custom') return true;
  return !!range.dateFrom && !!range.dateTo && range.dateFrom <= range.dateTo;
}

export function rangeLabel(range: DateRange): string {
  if (!range.dateFrom || !range.dateTo) return '';
  return `${formatDate(range.dateFrom)} – ${formatDate(range.dateTo)}`;
}

// Remember the choice for this browser tab, so coming back from the Expenses table keeps it.
const STORAGE_KEY = 'dashboard-range';

export function loadRange(): DateRange {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as DateRange | null;
    if (saved?.preset === 'custom') return saved;
    if (saved) return presetRange(saved.preset); // presets are worked out again, so "this week" stays current
  } catch {
    // unreadable value: fall through to the default
  }
  return presetRange('all');
}

export const saveRange = (range: DateRange) => sessionStorage.setItem(STORAGE_KEY, JSON.stringify(range));

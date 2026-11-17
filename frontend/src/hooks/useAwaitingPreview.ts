import { useCallback, useEffect, useState } from 'react';
import { listExpenses } from '../api/expenses';
import useExpenseEvents from './useExpenseEvents';
import type { Expense } from '../types';

interface Options {
  enabled: boolean;
  count: number;
  dateFrom?: string;
  dateTo?: string;
}

export default function useAwaitingPreview({ enabled, count, dateFrom, dateTo }: Options): Expense | undefined {
  const [oldest, setOldest] = useState<Expense>();

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await listExpenses({ page: 1, pageSize: 1, status: 'APPROVAL_REQUIRED', dateFrom, dateTo, sortBy: 'created_at', sortOrder: 'asc' });
      setOldest(data.expenses[0]);
    } catch {
      setOldest(undefined);
    }
  }, [enabled, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load, count]);
  useExpenseEvents(load);

  return enabled ? oldest : undefined;
}

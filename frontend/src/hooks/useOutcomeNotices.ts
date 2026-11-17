// "Marked as read" is remembered in this browser, per user, by expense id. Both statuses are final,
// so an expense that was acknowledged never needs to be announced again, while a new rejection still shows up.
import { useCallback, useEffect, useState } from 'react';
import { listExpenses } from '../api/expenses';
import useExpenseEvents from './useExpenseEvents';
import type { Expense } from '../types';

const storageKey = (userId: number) => `read-expense-notices:${userId}`;

function readIds(userId: number): number[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

interface Options {
  enabled: boolean;
  userId: number | undefined;
  dateFrom?: string;
  dateTo?: string;
}

export default function useOutcomeNotices({ enabled, userId, dateFrom, dateTo }: Options) {
  const [rejected, setRejected] = useState<Expense[]>([]);
  const [failed, setFailed] = useState<Expense[]>([]);
  const [readIdsState, setReadIds] = useState<number[]>(() => (userId ? readIds(userId) : []));

  const load = useCallback(async () => {
    if (!enabled) return;
    const fetchStatus = async (status: string) =>
      (await listExpenses({ page: 1, pageSize: 100, status, dateFrom, dateTo, sortBy: 'created_at', sortOrder: 'desc' })).expenses;
    try {
      const [r, f] = await Promise.all([fetchStatus('REJECTED'), fetchStatus('FAILED')]);
      setRejected(r);
      setFailed(f);
    } catch {
      // the notices are a courtesy; the Expenses table still shows everything
    }
  }, [enabled, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);
  useExpenseEvents(load);

  const markRead = (expenses: Expense[]) => {
    if (!userId) return;
    const next = Array.from(new Set([...readIdsState, ...expenses.map((e) => e.id)]));
    localStorage.setItem(storageKey(userId), JSON.stringify(next));
    setReadIds(next);
  };

  const unread = (expenses: Expense[]) => expenses.filter((e) => !readIdsState.includes(e.id));
  return { rejected: unread(rejected), failed: unread(failed), markRead };
}

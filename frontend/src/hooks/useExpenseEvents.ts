import { useEffect } from 'react';

export const EXPENSE_EVENT = 'expense-updated';

export default function useExpenseEvents(onChange: () => void) {
  useEffect(() => {
    window.addEventListener(EXPENSE_EVENT, onChange);
    return () => window.removeEventListener(EXPENSE_EVENT, onChange);
  }, [onChange]);
}

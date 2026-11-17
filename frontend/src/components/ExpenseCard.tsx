import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import StatusChip from './StatusChip';
import { formatCurrency, formatDate } from '../utils/format';
import type { Expense } from '../types';

interface Props {
  expense: Expense;
  showEmployee?: boolean;
  showStatus?: boolean;
  actions: ReactNode;
}

export default function ExpenseCard({ expense, showEmployee, showStatus = true, actions }: Props) {
  const details = [
    showEmployee ? `${expense.employee_name} · ${expense.department}` : null,
    expense.category,
    formatDate(expense.expense_date),
  ].filter(Boolean);

  return (
    <Paper component="li" variant="outlined" sx={{ p: 1.5, listStyle: 'none' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontWeight: 600, wordBreak: 'break-word' }}>{expense.title}</Typography>
        <Typography sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency(expense.amount)}</Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{details.join(' · ')}</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        {showStatus ? <StatusChip status={expense.status} /> : <span />}
        {actions}
      </Box>
    </Paper>
  );
}

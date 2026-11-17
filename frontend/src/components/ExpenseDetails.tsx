import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import StatusChip from './StatusChip';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';
import type { Expense } from '../types';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography component="dt" variant="body2" color="text.secondary">{label}</Typography>
      <Typography component="dd" sx={{ m: 0, color: 'text.primary', overflowWrap: 'anywhere' }}>{children || '—'}</Typography>
    </Box>
  );
}

interface Props {
  expense: Expense;
  isAdmin: boolean; // a user has one department, so only an admin sees it
}

export default function ExpenseDetails({ expense, isAdmin }: Props) {
  const priority = expense.priority[0].toUpperCase() + expense.priority.slice(1);

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">Amount</Typography>
          <Typography component="p" variant="h2" sx={{ lineHeight: 1.2 }}>{formatCurrency(expense.amount)}</Typography>
        </Box>
        <StatusChip status={expense.status} />
      </Box>

      <Box component="dl" sx={{ m: 0, display: 'grid', gap: 1.5, columnGap: 3, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <Field label="Employee">{expense.employee_name}</Field>
        <Field label="Category">{expense.category}</Field>
        {isAdmin && <Field label="Department">{expense.department}</Field>}
        <Field label="Expense date">{formatDate(expense.expense_date)}</Field>
        <Field label="Priority">{priority}</Field>
      </Box>

      {expense.description && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">Description</Typography>
          <Typography sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{expense.description}</Typography>
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        Created {formatDateTime(expense.created_at)} · Last updated {formatDateTime(expense.updated_at)}
      </Typography>
    </>
  );
}

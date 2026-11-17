import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { listExpenses } from '../api/expenses';
import { getErrorMessage } from '../api/client';
import { Icons } from '../components/icons';
import ExpenseCard from '../components/ExpenseCard';
import ExpenseDetailsDialog from '../components/ExpenseDetailsDialog';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import LoadingState from '../components/LoadingState';
import Notice from '../components/Notice';
import PageHeader from '../components/PageHeader';
import ReviewButtons from '../components/ReviewButtons';
import useDocumentTitle from '../hooks/useDocumentTitle';
import useExpenseEvents from '../hooks/useExpenseEvents';
import { formatCurrency, formatDate } from '../utils/format';
import type { Expense } from '../types';

export default function ApprovalsPage() {
  useDocumentTitle('Approvals');
  const isPhone = useMediaQuery(useTheme().breakpoints.down('sm'));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [viewingId, setViewingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await listExpenses({ page: 1, pageSize: 100, status: 'APPROVAL_REQUIRED', sortBy: 'created_at', sortOrder: 'asc' });
      setExpenses(data.expenses);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useExpenseEvents(load);

  return (
    <>
      <PageHeader title="Approvals" subtitle="Expenses waiting for your decision, oldest first" />
      <Notice message={message} onClose={() => setMessage('')} />

      {loading && <LoadingState label="Loading approvals…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && expenses.length === 0 && <Paper><EmptyState title="No approvals pending" description="All expenses have been reviewed. New requests will appear here automatically." /></Paper>}
      {!loading && !error && expenses.length > 0 && isPhone && (
        <Box component="ul" aria-label="Expenses awaiting approval" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', gap: 1 }}>
          {expenses.map((e) => (
            <ExpenseCard
              key={e.id} expense={e} showEmployee showStatus={false}
              actions={
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button size="small" startIcon={<Icons.view />} onClick={() => setViewingId(e.id)} aria-label={`View expense ${e.display_id}: ${e.title}`}>View</Button>
                  <ReviewButtons expense={e} onDone={(m) => { setMessage(m); load(); }} />
                </Box>
              }
            />
          ))}
        </Box>
      )}
      {!loading && !error && expenses.length > 0 && !isPhone && (
        <TableContainer component={Paper}>
          <Table size="small" aria-label="Expenses awaiting approval">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell><TableCell>Title</TableCell><TableCell>Employee</TableCell><TableCell>Department</TableCell>
                <TableCell align="right">Amount</TableCell><TableCell>Expense date</TableCell><TableCell>Details</TableCell><TableCell>Decision</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id} hover>
                  <TableCell>{e.display_id}</TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>{e.title}</TableCell>
                  <TableCell>{e.employee_name}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(e.amount)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(e.expense_date)}</TableCell>
                  <TableCell><Button size="small" startIcon={<Icons.view />} onClick={() => setViewingId(e.id)} aria-label={`View expense ${e.display_id}: ${e.title}`}>View</Button></TableCell>
                  <TableCell><ReviewButtons expense={e} onDone={(m) => { setMessage(m); load(); }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {viewingId !== null && <ExpenseDetailsDialog expenseId={viewingId} onClose={() => setViewingId(null)} />}
    </>
  );
}

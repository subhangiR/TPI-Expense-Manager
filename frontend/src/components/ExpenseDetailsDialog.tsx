import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import { getExpense, getHistory, submitExpense } from '../api/expenses';
import { getErrorMessage } from '../api/client';
import { useAppSelector } from '../store/hooks';
import ExpenseDetails from './ExpenseDetails';
import { Icons } from './icons';
import HistoryTimeline from './HistoryTimeline';
import ModalTitle from './ModalTitle';
import { statusNote, submitMessage } from '../utils/messages';
import type { Expense, HistoryEntry } from '../types';

interface Props {
  expenseId: number;
  onClose: () => void;
  onSubmitted?: (message: string) => void;
}

const dialogMargin = { '& .MuiDialog-paper': { m: { xs: 1, sm: 4 }, width: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' }, maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' } } };

export default function ExpenseDetailsDialog({ expenseId, onClose, onSubmitted }: Props) {
  const role = useAppSelector((state) => state.auth.user?.role);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [e, h] = await Promise.all([getExpense(expenseId), getHistory(expenseId)]);
        setExpense(e);
        setHistory(h);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    })();
  }, [expenseId]);

  const submit = async () => {
    if (!expense) return;
    setSubmitting(true);
    try {
      const submitted = await submitExpense(expense.id);
      onSubmitted?.(submitMessage(submitted.title, submitted.status));
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  const note = expense ? statusNote(role, expense.status) : null;

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="expense-details-title" sx={dialogMargin}>
      <ModalTitle id="expense-details-title" onClose={onClose}>
        {expense ? expense.title : 'Expense details'}
        {expense && <Typography component="span" variant="body2" color="text.secondary">ID {expense.display_id}</Typography>}
      </ModalTitle>

      {/* Only the body scrolls; the title and the buttons stay in view. */}
      <DialogContent dividers>
        {error && <Alert severity="error" role="alert">{error}</Alert>}
        {!error && !expense && <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress aria-label="Loading expense" /></Box>}
        {expense && (
          <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '3fr 2fr' } }}>
            <Box component="section" aria-label="Details" sx={{ minWidth: 0 }}>
              {note && <Alert severity={note.severity} sx={{ mb: 2 }}>{note.text}</Alert>}
              <ExpenseDetails expense={expense} isAdmin={role === 'admin'} />
            </Box>
            <Box component="section" aria-label="Activity timeline" sx={{ minWidth: 0, pl: { md: 3 }, borderLeft: { md: '1px solid' }, borderColor: { md: 'divider' } }}>
              <Typography component="h3" variant="h3" sx={{ mb: 0.5 }}>Activity timeline</Typography>
              <HistoryTimeline history={history} />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        {expense?.status === 'DRAFT' && (
          <>
            <Button component={RouterLink} to={`/expenses/${expenseId}/edit`} startIcon={<Icons.edit />} sx={{ mr: 'auto' }}>Edit</Button>
            {onSubmitted && <Button variant="contained" onClick={submit} disabled={submitting} startIcon={<Icons.submit />}>{submitting ? 'Submitting…' : 'Submit for approval'}</Button>}
          </>
        )}
        <Button onClick={onClose} startIcon={<Icons.close />}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { Icons } from './icons';
import ModalTitle from './ModalTitle';
import { approveExpense, rejectExpense } from '../api/expenses';
import { getErrorMessage } from '../api/client';
import { approvedMessage, rejectedMessage } from '../utils/messages';
import type { Expense } from '../types';

interface Props {
  expense: Expense;
  onDone: (message: string) => void; // called after success, or with an error message prefixed "Error:"
}

export default function ReviewButtons({ expense, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      setOpen(false);
      setComment('');
      onDone(success);
    } catch (err) {
      onDone(`Error: ${getErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const reject = () => {
    if (!comment.trim()) {
      setFieldError('Please enter a reason for rejecting this expense.');
      return;
    }
    setFieldError('');
    run(() => rejectExpense(expense.id, comment.trim()), rejectedMessage(expense.title));
  };

  return (
    <>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="contained" disabled={busy} startIcon={<Icons.approve />} onClick={() => run(() => approveExpense(expense.id), approvedMessage(expense.title))} aria-label={`Approve expense ${expense.display_id}: ${expense.title}`}>
          Approve
        </Button>
        <Button size="small" variant="outlined" color="error" disabled={busy} startIcon={<Icons.reject />} onClick={() => setOpen(true)} aria-label={`Reject expense ${expense.display_id}: ${expense.title}`}>
          Reject
        </Button>
      </Stack>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" aria-labelledby={`reject-title-${expense.id}`}>
        <ModalTitle id={`reject-title-${expense.id}`} onClose={() => setOpen(false)}>Reject “{expense.title}”</ModalTitle>
        <DialogContent>
          <TextField
            autoFocus required fullWidth multiline minRows={3} margin="dense" label="Reason for rejection"
            value={comment} onChange={(e) => setComment(e.target.value)}
            error={!!fieldError} helperText={fieldError || 'The employee will be able to see this reason.'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} startIcon={<Icons.cancel />}>Cancel</Button>
          <Button color="error" variant="contained" disabled={busy} startIcon={<Icons.reject />} onClick={reject}>Reject expense</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

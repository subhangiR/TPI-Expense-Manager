import { useEffect, useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { createExpense, getExpense, submitExpense, updateExpense } from '../api/expenses';
import { getCategories, getDepartments } from '../api/lookups';
import { getErrorMessage, getFieldErrors } from '../api/client';
import { useAppSelector } from '../store/hooks';
import { Icons } from './icons';
import ModalTitle from './ModalTitle';
import { statusLabel } from './StatusChip';
import { createdMessage, submitMessage, updatedMessage } from '../utils/messages';
import { formatDateTime } from '../utils/format';
import type { LookupItem, Priority } from '../types';

interface FormValues {
  title: string;
  department_id: number | '';
  category_id: number | '';
  amount: number;
  expense_date: string;
  description: string;
  priority: Priority;
}

interface Props {
  expenseId?: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function Select({ name, label, control, options }: {
  name: 'department_id' | 'category_id' | 'priority';
  label: string;
  control: Control<FormValues>;
  options: { value: string | number; label: string }[];
}) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{ required: `Select a ${label.toLowerCase()}` }}
      render={({ field, fieldState }) => (
        <TextField select fullWidth required label={label} {...field} error={!!fieldState.error} helperText={fieldState.error?.message}>
          {options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      )}
    />
  );
}

const dialogMargin = { '& .MuiDialog-paper': { m: { xs: 1, sm: 4 }, width: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' }, maxHeight: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 64px)' } } };

export default function ExpenseFormDialog({ expenseId, onClose, onSaved }: Props) {
  const editing = expenseId !== undefined;
  const user = useAppSelector((state) => state.auth.user);

  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState('');
  const [action, setAction] = useState<'draft' | 'submit'>('draft'); // which button was pressed, for its "…ing" label
  const [times, setTimes] = useState<{ created: string; updated: string } | null>(null);

  const { register, handleSubmit, control, reset, setError, formState: { errors, isSubmitting, isValid } } = useForm<FormValues>({
    mode: 'all', // check as the user types and leaves a field, so the buttons know when the form is complete
    defaultValues: { title: '', department_id: user?.department_id ?? '', category_id: '', amount: undefined as unknown as number, expense_date: today(), description: '', priority: 'medium' },
  });

  useEffect(() => {
    (async () => {
      try {
        const [d, c] = await Promise.all([getDepartments(), getCategories()]);
        setDepartments(d);
        setCategories(c);

        if (editing) {
          const e = await getExpense(expenseId);
          setTimes({ created: formatDateTime(e.created_at), updated: formatDateTime(e.updated_at) });
          if (e.status !== 'DRAFT') return setServerError(`This expense is already ${statusLabel(e.status).toLowerCase()} and can no longer be edited. Only drafts can be edited.`);
          reset({ title: e.title, department_id: e.department_id, category_id: e.category_id, amount: e.amount, expense_date: e.expense_date, description: e.description ?? '', priority: e.priority });
        }
      } catch (err) {
        setServerError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [editing, expenseId, reset]);

  // submitNow: only for a NEW expense. "Submit" saves it and sends it for approval in one go, so the user skips the extra step
  // of opening the draft and submitting it; "Save as draft" keeps the two-step flow.
  const onSubmit = async (v: FormValues, submitNow = false) => {
    setServerError('');
    setAction(submitNow ? 'submit' : 'draft');
    const body = {
      title: v.title, department_id: Number(v.department_id), category_id: Number(v.category_id), amount: v.amount,
      expense_date: v.expense_date, description: v.description, priority: v.priority,
    };
    try {
      if (editing) {
        await updateExpense(expenseId, body);
        return onSaved(updatedMessage);
      }
      const created = await createExpense(body);
      if (!submitNow) return onSaved(createdMessage);

      try {
        const submitted = await submitExpense(created.id);
        onSaved(submitMessage(submitted.title, submitted.status));
      } catch (err) {
        // The expense exists as a draft, so nothing is lost; tell the user where to find it.
        onSaved(`Error: ${created.title} was saved as a draft, but could not be submitted. ${getErrorMessage(err)}`);
      }
    } catch (err) {
      setServerError(getErrorMessage(err));
      Object.entries(getFieldErrors(err)).forEach(([field, message]) => setError(field as keyof FormValues, { message }));
    }
  };

  const opts = (items: { id: number; name: string }[]) => items.map((i) => ({ value: i.id, label: i.name }));
  const canSave = isValid && !loading && !isSubmitting;
  const closeIfIdle = () => { if (!isSubmitting) onClose(); };

  return (
    <Dialog open onClose={closeIfIdle} fullWidth maxWidth="sm" aria-labelledby="expense-form-title" sx={dialogMargin}>
      <ModalTitle id="expense-form-title" onClose={closeIfIdle} disabled={isSubmitting}>
        {editing ? 'Edit expense' : 'New expense'}
      </ModalTitle>
      {/* The form must be a flex column too, otherwise the body and footer scroll together. */}
      <form onSubmit={handleSubmit((v) => onSubmit(v))} noValidate aria-busy={isSubmitting} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
        <DialogContent dividers sx={{ overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress aria-label="Loading form" /></Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, pt: 0.5 }}>
              {serverError && <Alert severity="error" role="alert" sx={{ gridColumn: '1 / -1' }}>{serverError}</Alert>}

              <TextField label="Title" required fullWidth autoFocus sx={{ gridColumn: '1 / -1' }} error={!!errors.title} helperText={errors.title?.message}
                {...register('title', { required: 'Enter a title', maxLength: { value: 150, message: 'Title must be 150 characters or fewer' } })} />

              <Select name="department_id" label="Department" control={control} options={opts(departments)} />
              <Select name="category_id" label="Category" control={control} options={opts(categories)} />

              <TextField label="Amount (₹)" type="number" required fullWidth error={!!errors.amount} helperText={errors.amount?.message}
                slotProps={{ htmlInput: { step: '0.01', min: '0' } }}
                {...register('amount', { valueAsNumber: true, validate: (v) => (Number.isNaN(v) ? 'Enter the amount' : v > 0 || 'Amount must be greater than zero') })} />

              <TextField label="Expense date" type="date" required fullWidth slotProps={{ inputLabel: { shrink: true } }} error={!!errors.expense_date} helperText={errors.expense_date?.message}
                {...register('expense_date', { required: 'Select the expense date' })} />

              <Select name="priority" label="Priority" control={control} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />

              {times && (
                <>
                  <TextField label="Created" value={times.created} disabled />
                  <TextField label="Last updated" value={times.updated} disabled />
                </>
              )}

              <TextField label="Description" multiline minRows={2} fullWidth sx={{ gridColumn: '1 / -1' }} error={!!errors.description} helperText={errors.description?.message}
                {...register('description', { maxLength: { value: 1000, message: 'Description must be 1000 characters or fewer' } })} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5, '& .MuiButton-root': { whiteSpace: 'nowrap', flexShrink: 0 } }}>
          {!loading && !isValid && (
            <Typography variant="body2" color="text.secondary" sx={{ flexBasis: '100%' }}>Fill in the required fields to continue.</Typography>
          )}
          <Button onClick={closeIfIdle} disabled={isSubmitting} startIcon={<Icons.cancel />}>Cancel</Button>
          {editing ? (
            <Button type="submit" variant="contained" disabled={!canSave} startIcon={<Icons.save />}>
              {isSubmitting ? 'Saving…' : 'Save changes'}
            </Button>
          ) : (
            <>
              {/* Enter in a field saves a draft (the safe choice); Submit has to be clicked on purpose. */}
              <Button type="submit" variant="outlined" disabled={!canSave} startIcon={<Icons.save />}>
                {isSubmitting && action === 'draft' ? 'Saving…' : 'Save as draft'}
              </Button>
              <Button variant="contained" disabled={!canSave} startIcon={<Icons.submit />} onClick={handleSubmit((v) => onSubmit(v, true))}>
                {isSubmitting && action === 'submit' ? 'Submitting…' : 'Submit'}
              </Button>
            </>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}

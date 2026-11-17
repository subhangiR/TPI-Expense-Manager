import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import type { ReactNode } from 'react';
import { Icons } from './icons';
import ModalTitle from './ModalTitle';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmIcon?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel, confirmIcon, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onClose={onCancel} aria-labelledby="confirm-title">
      <ModalTitle id="confirm-title" onClose={onCancel}>{title}</ModalTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} startIcon={<Icons.cancel />}>Cancel</Button>
        <Button color="error" variant="contained" onClick={onConfirm} startIcon={confirmIcon}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

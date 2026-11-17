import type { ReactNode } from 'react';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  id: string; // matches aria-labelledby on the Dialog
  children: ReactNode;
  onClose: () => void;
  disabled?: boolean;
}

export default function ModalTitle({ id, children, onClose, disabled }: Props) {
  return (
    <DialogTitle id={id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pr: 1.5 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>{children}</span>
      <IconButton aria-label="Close" onClick={onClose} disabled={disabled} size="small">
        <CloseIcon />
      </IconButton>
    </DialogTitle>
  );
}

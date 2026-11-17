import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { Icons } from './icons';
import type { AttentionNote } from '../utils/messages';

interface Props {
  notes: AttentionNote[];
  linkFor: (status: string) => string;
}

export default function AttentionAlerts({ notes, linkFor }: Props) {
  if (notes.length === 0) return null;
  return (
    <Stack spacing={1} sx={{ mb: 1.5 }} aria-label="Needs your attention">
      {notes.map((note) => (
        <Alert
          key={note.status}
          severity={note.severity}
          sx={{ alignItems: 'center' }}
          action={
            <Stack direction="row" spacing={1}>
              <Button color="inherit" size="small" component={RouterLink} to={linkFor(note.status)} endIcon={<Icons.next />}>
                {note.action}
              </Button>
              {note.onDismiss && (
                <Button color="inherit" size="small" variant="outlined" startIcon={<Icons.markRead />} onClick={note.onDismiss}>
                  Mark as read
                </Button>
              )}
            </Stack>
          }
        >
          {note.text}
        </Alert>
      ))}
    </Stack>
  );
}

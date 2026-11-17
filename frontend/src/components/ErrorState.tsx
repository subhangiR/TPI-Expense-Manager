import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { Icons } from './icons';

interface Props {
  message: string;
  onRetry?: () => void;
}

// role="alert" makes screen readers announce the error immediately.
export default function ErrorState({ message, onRetry }: Props) {
  return (
    <Alert
      severity="error"
      role="alert"
      action={
        onRetry && (
          <Button color="inherit" size="small" startIcon={<Icons.retry />} onClick={onRetry}>
            Try again
          </Button>
        )
      }
    >
      {message}
    </Alert>
  );
}

import Alert from '@mui/material/Alert';

interface Props {
  message: string; // an error is a message that starts with "Error:"
  onClose: () => void;
}

// aria-live makes screen readers announce it when it appears.
export default function Notice({ message, onClose }: Props) {
  const isError = message.startsWith('Error:');
  return (
    <div aria-live="polite">
      {message && (
        <Alert severity={isError ? 'error' : 'success'} sx={{ mb: 1.5 }} onClose={onClose}>
          {isError ? message.replace('Error:', '').trim() : message}
        </Alert>
      )}
    </div>
  );
}

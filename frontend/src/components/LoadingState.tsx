import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

// role="status" makes screen readers announce the text politely.
export default function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <Box role="status" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, py: 6 }}>
      <CircularProgress size={28} aria-hidden="true" />
      <Typography>{label}</Typography>
    </Box>
  );
}

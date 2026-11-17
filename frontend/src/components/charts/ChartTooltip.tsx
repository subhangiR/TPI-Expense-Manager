import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

interface Props {
  title: string;
  color?: string;
  lines: string[];
}

export default function ChartTooltip({ title, color, lines }: Props) {
  return (
    <Paper sx={{ px: 1.5, py: 1, boxShadow: 3, whiteSpace: 'nowrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {color && <Box aria-hidden="true" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />}
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{title}</Typography>
      </Box>
      {lines.map((line) => (
        <Typography key={line} variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{line}</Typography>
      ))}
    </Paper>
  );
}

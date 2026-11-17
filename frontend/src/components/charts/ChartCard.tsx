import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export const CHART_HEIGHT = 190; // all dashboard charts share one height so they line up in a row

interface Props {
  title: string;
  description: string;
  summary: string; // the same data as text, for screen readers
  height: number;
  children: ReactNode;
}

export default function ChartCard({ title, description, summary, height, children }: Props) {
  return (
    <Paper sx={{ p: 1.5, minWidth: 0 }}>
      <Typography component="h2" variant="h3">
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
        {description}
      </Typography>
      <Box role="img" aria-label={`${title}. ${summary}`} sx={{ height }}>
        {children}
      </Box>
    </Paper>
  );
}

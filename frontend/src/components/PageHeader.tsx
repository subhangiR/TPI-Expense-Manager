import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

// Every page starts with one <h1>, which screen readers use to announce where you are.
export default function PageHeader({ title, subtitle, action }: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2, flexWrap: 'wrap' }}>
      <Box>
        <Typography component="h1" variant="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.25 }} variant="body2">
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}

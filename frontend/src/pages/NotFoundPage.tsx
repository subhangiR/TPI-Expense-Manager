import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { Icons } from '../components/icons';
import { Link as RouterLink } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <EmptyState
        title="Page not found"
        description="The page you are looking for doesn't exist."
        action={
          <Button variant="contained" component={RouterLink} to="/dashboard" startIcon={<Icons.dashboard />}>
            Go to dashboard
          </Button>
        }
      />
    </Box>
  );
}

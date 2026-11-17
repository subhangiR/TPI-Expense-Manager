import Button from '@mui/material/Button';
import { Icons } from '../components/icons';
import { Link as RouterLink } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import useDocumentTitle from '../hooks/useDocumentTitle';

export default function ForbiddenPage() {
  useDocumentTitle('Access denied');
  return (
    <EmptyState
      title="You don't have access to this page"
      description="Your role does not have access to this page."
      action={
        <Button variant="contained" component={RouterLink} to="/dashboard" startIcon={<Icons.dashboard />}>
          Back to dashboard
        </Button>
      }
    />
  );
}

// Route guards. These only decide what to SHOW; the backend still checks permissions on every request.
import { Navigate, Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import { useAppSelector } from '../store/hooks';
import Layout from './Layout';
import LoadingState from './LoadingState';
import ForbiddenPage from '../pages/ForbiddenPage';
import type { Role } from '../types';

export default function ProtectedRoute() {
  const status = useAppSelector((state) => state.auth.status);

  if (status === 'loading') {
    // A saved token is being checked with the server (after a page refresh).
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <LoadingState label="Checking your session…" />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

export function RoleRoute({ roles }: { roles: Role[] }) {
  const user = useAppSelector((state) => state.auth.user);
  return user && roles.includes(user.role) ? <Outlet /> : <ForbiddenPage />;
}

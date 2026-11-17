import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { loadCurrentUser } from './store/authSlice';
import ProtectedRoute, { RoleRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
import ExpensesPage from "./pages/ExpensesPage";
import ApprovalsPage from './pages/ApprovalsPage';

export default function App() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.auth.status);

  // After a page refresh a saved token may exist: ask the server who it belongs to.
  useEffect(() => {
    if (status === 'loading') dispatch(loadCurrentUser());
    // Only on first load, so no dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        {/* Creating, editing and viewing an expense are modal windows opened by the list page, so these URLs show the list. */}
        <Route path="expenses" element={<ExpensesPage />} />
        <Route element={<RoleRoute roles={['user']} />}>
          <Route path="expenses/new" element={<ExpensesPage />} />
          <Route path="expenses/:id/edit" element={<ExpensesPage />} />
        </Route>
        <Route path="expenses/:id/view" element={<ExpensesPage />} />

        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="approvals" element={<ApprovalsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

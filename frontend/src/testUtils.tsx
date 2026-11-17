import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider } from '@mui/material/styles';
import { createAppStore } from './store/store';
import { theme } from './theme/theme';
import type { User } from './types';

const base: User = { id: 1, name: 'Admin User', email: 'alice@tpi.com', role: 'admin', status: 'active', department_id: 1, department: 'Sales', created_at: '', updated_at: '' };
export const adminUser = base;
export const normalUser: User = { ...base, id: 2, name: 'Bob Brown', role: 'user' };

export const loggedIn = (user: User) => ({ auth: { user, status: 'authenticated' as const } });
export const loggedOut = { auth: { user: null, status: 'unauthenticated' as const } };

export function renderWithProviders(ui: ReactElement, route = '/', state: ReturnType<typeof loggedIn> | typeof loggedOut = loggedOut) {
  return render(
    <Provider store={createAppStore(state)}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
}

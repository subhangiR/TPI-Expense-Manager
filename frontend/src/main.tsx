import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import App from './App';
import { store } from './store/store';
import { logout } from './store/authSlice';
import { setUnauthorizedHandler } from './api/client';
import ThemeModeProvider from './theme/ThemeModeProvider';

setUnauthorizedHandler(() => store.dispatch(logout()));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeModeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeModeProvider>
    </Provider>
  </StrictMode>
);

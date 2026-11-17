import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

// A function (not just a constant) so tests can create a fresh store each time.
export const createAppStore = (preloadedState?: Parameters<typeof rootReducerState>[0]) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState,
  });

const rootReducerState = (state?: { auth: ReturnType<typeof authReducer> }) => state;

export const store = createAppStore();

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

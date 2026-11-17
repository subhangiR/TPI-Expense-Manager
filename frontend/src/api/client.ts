import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '../types';

const TOKEN_KEY = 'expense_token';

// The login token lives in localStorage so a page refresh keeps you logged in.
export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const client = axios.create({ baseURL: '/api' });

client.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the server says "401" while we hold a token, the session is over: let the app log out.
// (A wrong password at login is also a 401, but then there is no token yet, so we skip it.)
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && tokenStorage.get()) onUnauthorized?.();
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (error.response?.data?.message) return error.response.data.message;
    if (!error.response) return 'Cannot reach the server. Check your connection and try again.';
  }
  return 'Something went wrong. Please try again.';
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return {};
  const fields: Record<string, string> = {};
  for (const item of error.response?.data?.errors ?? []) {
    if (item.field && !fields[item.field]) fields[item.field] = item.message;
  }
  return fields;
}

export default client;

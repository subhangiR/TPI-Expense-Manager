import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as authApi from '../api/auth';
import { getErrorMessage, tokenStorage } from '../api/client';
import type { User } from '../types';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

interface AuthState {
  user: User | null;
  status: AuthStatus;
}

const initialState: AuthState = {
  user: null,
  status: tokenStorage.get() ? 'loading' : 'unauthenticated',
};

export const login = createAsyncThunk<User, { email: string; password: string }, { rejectValue: string }>(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { token, user } = await authApi.login(email, password);
      tokenStorage.set(token);
      return user;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

export const loadCurrentUser = createAsyncThunk<User, void, { rejectValue: string }>(
  'auth/loadCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      return await authApi.getCurrentUser();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      tokenStorage.clear();
      state.user = null;
      state.status = 'unauthenticated';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
      })
      .addCase(loadCurrentUser.rejected, (state) => {
        tokenStorage.clear();
        state.user = null;
        state.status = 'unauthenticated';
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;

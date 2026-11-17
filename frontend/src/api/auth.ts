import client from './client';
import type { ApiResponse, User } from '../types';

export interface LoginResult {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const response = await client.post<ApiResponse<LoginResult>>('/auth/login', { email, password });
  return response.data.data;
}

export async function getCurrentUser(): Promise<User> {
  const response = await client.get<ApiResponse<{ user: User }>>('/auth/me');
  return response.data.data.user;
}

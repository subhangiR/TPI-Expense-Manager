import client from './client';
import type { ApiResponse, LookupItem } from '../types';

export async function getDepartments() {
  const response = await client.get<ApiResponse<{ departments: LookupItem[] }>>('/departments');
  return response.data.data.departments;
}

export async function getCategories() {
  const response = await client.get<ApiResponse<{ categories: LookupItem[] }>>('/categories');
  return response.data.data.categories;
}

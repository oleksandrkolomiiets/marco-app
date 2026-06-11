import { api } from '@/api/client';
import type { UpdateUserParams, User } from '@/types/api';

export const getMe = (): Promise<User> => api.get<User>('/api/v1/me');

export const updateMe = (data: UpdateUserParams): Promise<User> =>
  api.patch<User>('/api/v1/me', data);

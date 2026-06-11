import { api } from '@/api/client';
import type { GoogleAuthResponse, RefreshTokenResponse } from '@/types/api';

export const googleAuth = (idToken: string): Promise<GoogleAuthResponse> =>
  api.post('/auth/google', { id_token: idToken });

export const emailSignUp = (
  name: string,
  email: string,
  password: string,
): Promise<GoogleAuthResponse> =>
  api.post('/auth/signup', { name, email, password });

export const emailSignIn = (
  email: string,
  password: string,
): Promise<GoogleAuthResponse> =>
  api.post('/auth/signin', { email, password });

export const refreshTokens = (
  refreshToken: string,
): Promise<RefreshTokenResponse> =>
  api.post('/auth/refresh', { refresh_token: refreshToken });

export const signOut = (): Promise<void> => api.post('/auth/signout', {});

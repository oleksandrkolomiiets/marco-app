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

/**
 * Ask for a reset code. Resolves the same way whether or not the address has
 * an account — the server deliberately won't say, so the UI must not imply it
 * knows either.
 */
export const requestPasswordReset = (
  email: string,
): Promise<{ message: string }> => api.post('/auth/forgot-password', { email });

/** Exchange the emailed code for a new password and a signed-in session. */
export const resetPassword = (
  email: string,
  code: string,
  password: string,
): Promise<GoogleAuthResponse> =>
  api.post('/auth/reset-password', { email, code, password });

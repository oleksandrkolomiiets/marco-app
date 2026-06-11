import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useState } from 'react';
import { Platform } from 'react-native';
import { googleAuth } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';

WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setTokens = useAuthStore((s) => s.setTokens);

  const [request, , promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID!,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true,
  });

  const redirectUri = request?.redirectUri ?? AuthSession.makeRedirectUri({ scheme: 'marco' });

  const signInWithGoogle = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await promptAsync();
      if (result.type !== 'success') {
        if (result.type !== 'dismiss') setError('Google sign-in was cancelled');
        return;
      }
      const code = result.params.code;
      if (!code) {
        setError('Google did not return an authorization code');
        return;
      }
      if (!request?.codeVerifier) {
        setError('Missing PKCE verifier');
        return;
      }

      const platformClientId =
        Platform.OS === 'ios'
          ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!
          : Platform.OS === 'android'
            ? process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID!
            : process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!;

      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: platformClientId,
          code,
          redirectUri,
          extraParams: { code_verifier: request.codeVerifier },
        },
        discovery,
      );

      const idToken = tokenResponse.idToken;
      if (!idToken) {
        setError('Google did not return an ID token');
        return;
      }

      const data = await googleAuth(idToken);
      setTokens(data.access_token, data.refresh_token, data.user);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Sign-in failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return { signInWithGoogle, isLoading, error, setError, ready: !!request };
};

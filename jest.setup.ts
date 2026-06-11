// Global Jest setup (registered via "setupFiles" — runs before each test
// file's modules are loaded).

// client.ts captures EXPO_PUBLIC_API_URL at import time and authStore.ts /
// chat.ts read it at call time, so pin it before any application module is
// imported by a test.
process.env.EXPO_PUBLIC_API_URL = 'https://api.test';

// In-memory replacement for the native SecureStore module. Every test file
// gets its own module registry (and therefore its own map); within a file,
// tests can wipe stored values between cases via __reset().
jest.mock('expo-secure-store', () => {
  const data = new Map<string, string>();
  return {
    getItemAsync: jest.fn(
      async (key: string): Promise<string | null> => data.get(key) ?? null,
    ),
    setItemAsync: jest.fn(async (key: string, value: string): Promise<void> => {
      data.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string): Promise<void> => {
      data.delete(key);
    }),
    __reset: (): void => {
      data.clear();
    },
  };
});

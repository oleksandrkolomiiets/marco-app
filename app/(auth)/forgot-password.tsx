import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { requestPasswordReset, resetPassword } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { SketchyButton } from '@/components/ui/SketchyButton';
import { Field } from '@/components/ui/Field';
import { colors } from '@/constants/colors';

// Mirrors the server's wording, used only when a request fails without one —
// a dropped connection, say.
const GENERIC_SENT = 'If that email has an account, a reset code is on its way.';
const GENERIC_FAILURE = "That didn't go through. Try again.";

// The server issues six digits; anything longer is a typo, and trimming to the
// digits keeps a pasted "604 333" working.
const CODE_LENGTH = 6;

type Phase = 'request' | 'verify';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  // Prefilled from the sign-in screen when they'd already typed an address —
  // retyping it to recover an account you're locked out of is a poor welcome.
  const { email: initialEmail } = useLocalSearchParams<{ email?: string }>();

  const [phase, setPhase] = useState<Phase>('request');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const trimmedEmail = email.trim();
  const canRequest = trimmedEmail.length > 0 && !isLoading;
  const canSubmit =
    code.length === CODE_LENGTH && password.length > 0 && !isLoading;

  const handleRequest = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await requestPasswordReset(trimmedEmail);
      setNotice(data?.message || GENERIC_SENT);
      setPhase('verify');
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : GENERIC_FAILURE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await resetPassword(trimmedEmail, code, password);
      // The server signs them in as part of the reset, so there's no second
      // trip through the sign-in screen.
      setTokens(data.access_token, data.refresh_token, data.user);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : GENERIC_FAILURE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setCode('');
    setIsLoading(true);
    try {
      const data = await requestPasswordReset(trimmedEmail);
      // The server won't send twice inside a minute and won't say so. Promising
      // "sent!" would be a claim we can't back, hence the softer wording.
      setNotice(data?.message || GENERIC_SENT);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : GENERIC_FAILURE);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          onPress={() => (phase === 'verify' ? setPhase('request') : router.back())}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.back}
        >
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.lockup}>
            <MarcoAvatar size={42} />
            <Text style={styles.lockupLine}>
              {phase === 'request'
                ? 'Happens to everyone.\nLet’s get you back on court.'
                : 'Check your inbox —\nthe code lasts 15 minutes.'}
            </Text>
          </View>

          <Text style={styles.heading}>
            {phase === 'request' ? 'Reset password' : 'Enter your code'}
          </Text>

          {phase === 'request' ? (
            <View style={styles.form}>
              <Field
                label="Email"
                mono
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError(null);
                }}
                error={error}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="you@example.com"
              />
            </View>
          ) : (
            <View style={styles.form}>
              {notice ? <Text style={styles.notice}>{notice}</Text> : null}
              <Field
                label="6-digit code"
                mono
                value={code}
                onChangeText={(v) => {
                  // Strip everything but digits so a pasted "604 333" works.
                  setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH));
                  setError(null);
                }}
                error={error}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={CODE_LENGTH}
                placeholder="000000"
              />
              <Field
                label="New password"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError(null);
                }}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                placeholder="At least 8 characters, one number"
                trailing={
                  <Pressable
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Text style={styles.eyeToggle}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                }
              />
            </View>
          )}

          <View style={{ flex: 1 }} />

          {phase === 'request' ? (
            <SketchyButton
              label="Send me a code"
              variant="primary"
              disabled={!canRequest}
              loading={isLoading}
              onPress={() => void handleRequest()}
            />
          ) : (
            <>
              <SketchyButton
                label="Set new password"
                variant="primary"
                disabled={!canSubmit}
                loading={isLoading}
                onPress={() => void handleReset()}
              />
              <Pressable
                onPress={() => void handleResend()}
                disabled={isLoading}
                style={styles.footer}
              >
                <Text style={styles.footerText}>
                  Didn’t get it? <Text style={styles.footerLink}>Send another</Text>
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  safeArea: { flex: 1, backgroundColor: colors.bg },
  back: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingHorizontal: 24,
    height: 28,
  },
  backChevron: { fontSize: 22, lineHeight: 24, color: colors.inkSoft },
  backLabel: { fontSize: 14, fontWeight: '500' as const, color: colors.inkSoft },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28 },
  lockup: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 14,
  },
  lockupLine: {
    flex: 1,
    fontFamily: 'Caveat_400Regular',
    fontSize: 19,
    lineHeight: 21,
    color: colors.clay,
  },
  heading: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  form: { paddingTop: 22 },
  notice: { fontSize: 13.5, lineHeight: 19, color: colors.inkSoft, marginBottom: 16 },
  eyeToggle: { fontSize: 13, fontWeight: '500' as const, color: colors.inkSoft },
  footer: { alignItems: 'center' as const, paddingTop: 20 },
  footerText: { fontSize: 13.5, color: colors.inkSoft },
  footerLink: {
    color: colors.ink,
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
} as const;

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
import { useRouter } from 'expo-router';
import { emailSignIn } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { SketchyButton } from '@/components/ui/SketchyButton';
import { Field } from '@/components/ui/Field';
import { colors } from '@/constants/colors';

// Mirrors the server's wording (Laravel's auth.failed), used only when the
// request failed without one — e.g. the connection dropped before a response.
const INVALID_CREDENTIALS = 'These credentials do not match our records.';

export default function SignInScreen() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fieldsValid = email.trim().length > 0 && password.length > 0;
  const canSubmit = fieldsValid && !isLoading;

  const handleSignIn = async () => {
    setEmailError(null);
    setPasswordError(null);
    setIsLoading(true);
    try {
      const data = await emailSignIn(email.trim(), password);
      setTokens(data.access_token, data.refresh_token, data.user);
    } catch (e) {
      // One neutral message for every rejection. Saying "no account with this
      // email" told the user which half was wrong — and told anyone probing the
      // form which addresses are registered. The server now answers all three
      // rejection paths identically; this shows whatever it said, and only
      // falls back when there is no message at all (a dropped connection).
      const msg = e instanceof Error && e.message ? e.message : INVALID_CREDENTIALS;
      setEmailError(msg);
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
        {/* Back */}
        <Pressable
          onPress={() => router.back()}
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
          {/* Marco lockup — avatar beside a handwritten greeting */}
          <View style={styles.lockup}>
            <MarcoAvatar size={42} />
            <Text style={styles.lockupLine}>
              ¡Bienvenido de vuelta! Pick up{'\n'}where you left off.
            </Text>
          </View>

          <Text style={styles.heading}>Sign in</Text>

          <View style={styles.form}>
            <Field
              label="Email"
              mono
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                setEmailError(null);
              }}
              error={emailError}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
            />

            <Field
              label="Password"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setPasswordError(null);
              }}
              error={passwordError}
              secureTextEntry={!showPassword}
              textContentType="password"
              placeholder="••••••••"
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

            {/* No "Forgot password?" link until there is a reset flow behind
                it. The Pressable that used to sit here had no onPress at all,
                so the one person who most needs it — locked out of their own
                account — tapped an underlined link and got nothing. There is
                no /auth/reset endpoint and no mail sender; an absent link at
                least sends them to "Create account" instead of a dead end. */}
          </View>

          <View style={{ flex: 1 }} />

          <SketchyButton
            label="Sign in"
            variant="primary"
            disabled={!canSubmit}
            loading={isLoading}
            onPress={() => void handleSignIn()}
          />

          <Pressable onPress={() => router.replace('/(auth)/signup')} style={styles.footer}>
            <Text style={styles.footerText}>
              New here? <Text style={styles.footerLink}>Create account</Text>
            </Text>
          </Pressable>
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
  eyeToggle: { fontSize: 13, fontWeight: '500' as const, color: colors.inkSoft },
  footer: { alignItems: 'center' as const, paddingTop: 20 },
  footerText: { fontSize: 13.5, color: colors.inkSoft },
  footerLink: {
    color: colors.ink,
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
} as const;

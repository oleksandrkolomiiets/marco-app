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
import { emailSignUp } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { SketchyButton } from '@/components/ui/SketchyButton';
import { Field } from '@/components/ui/Field';
import { colors } from '@/constants/colors';

// The design's StrengthMeter is a 4-segment scale (weak/fair/good/strong),
// so the previous 3-level scale gains a "fair" step. The gate for submitting
// is unchanged: anything above "weak" passes.
type Strength = 'weak' | 'fair' | 'good' | 'strong';

const STRENGTH_ORDER: Strength[] = ['weak', 'fair', 'good', 'strong'];

// Segment colors straight from the prototype: two clay-ish warnings, then teal.
const STRENGTH_COLOR: Record<Strength, string> = {
  weak: '#C44A14',
  fair: '#D97844',
  good: colors.teal,
  strong: colors.teal,
};

function getStrength(p: string): Strength | null {
  if (p.length === 0) return null;
  const hasDigit = /\d/.test(p);
  if (p.length < 8 || !hasDigit) return 'weak';
  if (p.length < 10) return 'fair';
  if (p.length < 12) return 'good';
  return 'strong';
}

function StrengthMeter({ strength }: { strength: Strength }) {
  const score = STRENGTH_ORDER.indexOf(strength);
  const color = STRENGTH_COLOR[strength];

  return (
    <View style={styles.meter}>
      <View style={styles.meterTrack}>
        {STRENGTH_ORDER.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= score ? color : 'rgba(26,42,48,0.12)',
            }}
          />
        ))}
      </View>
      <View style={styles.meterFooter}>
        <Text style={styles.meterHint}>at least 8 chars · 1 number</Text>
        <Text style={[styles.meterLabel, { color }]}>{strength}</Text>
      </View>
    </View>
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const strength = getStrength(password);
  const fieldsValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    strength !== null &&
    strength !== 'weak';
  const canSubmit = fieldsValid && !isLoading;

  const handleSignUp = async () => {
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);

    if (name.trim().length === 0) {
      setNameError('Name is required');
      return;
    }

    setIsLoading(true);
    try {
      const data = await emailSignUp(name.trim(), email.trim(), password);
      setTokens(data.access_token, data.refresh_token, data.user);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sign-up failed. Please try again.';
      if (msg.toLowerCase().includes('email') || msg === 'invalid email') {
        setEmailError(msg);
      } else if (msg.includes('already exists')) {
        setEmailError('An account with this email already exists.');
      } else if (msg.includes('password')) {
        setPasswordError(msg);
      } else {
        setPasswordError(msg);
      }
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

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Marco lockup — avatar beside a handwritten greeting */}
          <View style={styles.lockup}>
            <MarcoAvatar size={42} />
            <Text style={styles.lockupLine}>
              Three lines and we&apos;re in. Use a name{'\n'}you&apos;d want on a trophy.
            </Text>
          </View>

          <Text style={styles.heading}>Create your account</Text>

          <View style={styles.form}>
            <Field
              label="Name"
              value={name}
              onChangeText={(v) => {
                setName(v);
                setNameError(null);
              }}
              error={nameError}
              autoCapitalize="words"
              textContentType="name"
              placeholder="Your name"
            />

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
              textContentType="newPassword"
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

            {strength ? <StrengthMeter strength={strength} /> : null}
          </View>

          <View style={{ flex: 1 }} />

          <SketchyButton
            label="Create account"
            variant="primary"
            disabled={!canSubmit}
            loading={isLoading}
            onPress={() => void handleSignUp()}
          />

          <Pressable onPress={() => router.replace('/(auth)/signin')} style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerLink}>Sign in</Text>
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
  meter: { marginTop: -6, marginBottom: 14 },
  meterTrack: { flexDirection: 'row' as const, gap: 4 },
  meterFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginTop: 6,
  },
  meterHint: { fontSize: 11.5, color: colors.inkSoft },
  meterLabel: {
    fontSize: 11.5,
    fontWeight: '600' as const,
    letterSpacing: 1.15,
    textTransform: 'uppercase' as const,
  },
  footer: { alignItems: 'center' as const, paddingTop: 20 },
  footerText: { fontSize: 13.5, color: colors.inkSoft },
  footerLink: {
    color: colors.ink,
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
} as const;

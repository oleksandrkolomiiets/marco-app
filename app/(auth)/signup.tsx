import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { emailSignUp } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';

type Strength = 'weak' | 'good' | 'strong';

function getStrength(p: string): Strength | null {
  if (p.length === 0) return null;
  const hasDigit = /\d/.test(p);
  if (p.length < 8 || !hasDigit) return 'weak';
  if (p.length >= 12) return 'strong';
  return 'good';
}

const STRENGTH_COLOR: Record<Strength, string> = {
  weak: '#DC2626',
  good: '#E36414',
  strong: '#0F4C5C',
};

const STRENGTH_LABEL: Record<Strength, string> = {
  weak: 'weak',
  good: 'good',
  strong: 'strong',
};

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
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
          style={{ position: 'absolute', top: 8, left: 16, padding: 8, zIndex: 1 }}
        >
          <Text style={{ fontSize: 28, color: '#1a2a30' }}>‹</Text>
        </Pressable>

        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular',
              fontSize: 36,
              color: '#1a2a30',
              marginBottom: 8,
            }}
          >
            Create your account
          </Text>
          <Text style={{ fontSize: 14, color: '#4A5560', marginBottom: 36 }}>
            Three lines and we&apos;re in. Use a name you&apos;d want on a trophy.
          </Text>

          {/* Name field */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={(v) => { setName(v); setNameError(null); }}
              textContentType="name"
              placeholder="Aleksandra"
              placeholderTextColor="#ABABAB"
              style={[styles.input, nameError ? styles.inputError : null]}
            />
            {nameError ? (
              <Text style={[styles.fieldError, { marginTop: 6 }]}>{nameError}</Text>
            ) : null}
          </View>

          {/* Email field */}
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); setEmailError(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="you@example.com"
              placeholderTextColor="#ABABAB"
              style={[styles.input, emailError ? styles.inputError : null]}
            />
            {emailError ? (
              <Text style={[styles.fieldError, { marginTop: 6 }]}>{emailError}</Text>
            ) : null}
          </View>

          {/* Password field */}
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.label}>Password</Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={password}
                onChangeText={(v) => { setPassword(v); setPasswordError(null); }}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                placeholder="••••••••"
                placeholderTextColor="#ABABAB"
                style={[
                  styles.input,
                  { paddingRight: 52 },
                  passwordError ? styles.inputError : null,
                ]}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: 16,
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 13, color: '#4A5560', fontWeight: '500' }}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>

            {/* Strength meter */}
            {strength !== null ? (
              <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                  {(['weak', 'good', 'strong'] as Strength[]).map((level) => {
                    const levels: Strength[] = ['weak', 'good', 'strong'];
                    const active = levels.indexOf(strength) >= levels.indexOf(level);
                    return (
                      <View
                        key={level}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          backgroundColor: active
                            ? STRENGTH_COLOR[strength]
                            : 'rgba(26, 42, 48, 0.1)',
                        }}
                      />
                    );
                  })}
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: STRENGTH_COLOR[strength],
                    minWidth: 40,
                    textAlign: 'right',
                  }}
                >
                  {STRENGTH_LABEL[strength]}
                </Text>
              </View>
            ) : null}

            {passwordError ? (
              <Text style={[styles.fieldError, { marginTop: 6 }]}>{passwordError}</Text>
            ) : (
              <Text style={{ fontSize: 12, color: '#ABABAB', marginTop: 6 }}>
                at least 8 chars · 1 number
              </Text>
            )}
          </View>

          {/* CTA */}
          <View style={{ position: 'relative', marginTop: 24, marginBottom: 24, opacity: fieldsValid ? 1 : 0.4 }}>
            <View
              style={{
                position: 'absolute',
                top: 3,
                left: 3,
                right: -3,
                height: 56,
                backgroundColor: '#E36414',
                borderRadius: 14,
              }}
            />
            <Pressable
              disabled={!canSubmit}
              onPress={() => void handleSignUp()}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#0D3F4E' : '#0F4C5C',
                borderRadius: 14,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                  Create account
                </Text>
              )}
            </Pressable>
          </View>

          {/* Switch to sign in */}
          <Pressable
            onPress={() => router.replace('/(auth)/signin')}
            style={{ alignItems: 'center' }}
          >
            <Text style={{ fontSize: 15, color: '#4A5560' }}>
              Already have an account?{' '}
              <Text style={{ color: '#0F4C5C', fontWeight: '600' }}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = {
  label: {
    fontSize: 11,
    letterSpacing: 1,
    color: '#4A5560',
    marginBottom: 6,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
  },
  input: {
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 42, 48, 0.15)',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1a2a30',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  fieldError: {
    fontSize: 13,
    color: '#DC2626',
  },
} as const;

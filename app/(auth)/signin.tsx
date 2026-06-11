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
import { emailSignIn } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';

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
      const msg = e instanceof Error ? e.message : 'Sign-in failed. Please try again.';
      if (msg === 'no_account') {
        setEmailError('No account with this email. Create one?');
      } else if (msg === 'wrong_password') {
        setPasswordError("That password doesn't match. Try again or reset it.");
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
            Sign in
          </Text>
          <Text style={{ fontSize: 14, color: '#4A5560', marginBottom: 36 }}>
            ¡Bienvenido de vuelta! Pick up where you left off.
          </Text>

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
              style={[
                styles.input,
                emailError ? styles.inputError : null,
              ]}
            />
            {emailError ? (
              <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.fieldError}>{emailError}</Text>
                {emailError.includes('Create one') ? (
                  <Pressable onPress={() => router.replace('/(auth)/signup')}>
                    <Text style={{ fontSize: 13, color: '#0F4C5C', fontWeight: '600' }}>
                      Create account →
                    </Text>
                  </Pressable>
                ) : null}
              </View>
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
                textContentType="password"
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
            {passwordError ? (
              <Text style={[styles.fieldError, { marginTop: 6 }]}>{passwordError}</Text>
            ) : null}
          </View>

          {/* Forgot password */}
          <Pressable style={{ alignSelf: 'flex-end', marginBottom: 32 }}>
            <Text style={{ fontSize: 13, color: '#0F4C5C', fontWeight: '500' }}>
              Forgot password?
            </Text>
          </Pressable>

          {/* CTA */}
          <View style={{ position: 'relative', marginBottom: 24, opacity: fieldsValid ? 1 : 0.4 }}>
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
              onPress={() => void handleSignIn()}
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
                  Sign in
                </Text>
              )}
            </Pressable>
          </View>

          {/* Switch to sign up */}
          <Pressable
            onPress={() => router.replace('/(auth)/signup')}
            style={{ alignItems: 'center' }}
          >
            <Text style={{ fontSize: 15, color: '#4A5560' }}>
              New here?{' '}
              <Text style={{ color: '#0F4C5C', fontWeight: '600' }}>Create account</Text>
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

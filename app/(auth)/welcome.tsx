import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';

const GoogleLogo = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24">
    <Path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <Path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </Svg>
);

export default function WelcomeScreen() {
  const router = useRouter();
  const { signInWithGoogle, isLoading, error, setError, ready } = useGoogleAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        {/* Logo */}
        <View style={{ paddingTop: 16, paddingHorizontal: 24 }}>
          <Text
            style={{
              fontFamily: 'Caveat_400Regular',
              fontSize: 22,
              color: '#E36414',
            }}
          >
            marco
          </Text>
        </View>

        {/* Hero */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <MarcoAvatar size={160} />

          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'InstrumentSerif_400Regular',
                fontSize: 44,
                color: '#1a2a30',
                lineHeight: 48,
                textAlign: 'center',
              }}
            >
              Step onto the court.
            </Text>
          </View>

          {/* Marco speech */}
          <View
            style={{
              marginTop: 20,
              backgroundColor: '#fff',
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderWidth: 1,
              borderColor: 'rgba(26, 42, 48, 0.1)',
              maxWidth: 300,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: '#4A5560',
                textAlign: 'center',
                lineHeight: 20,
              }}
            >
              Ready when you are. Sign in to pick up where you left off, or start a new training file with me.
            </Text>
          </View>
        </View>

        {/* Auth buttons */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 40, gap: 12 }}>
          {error !== null ? (
            <Pressable
              onPress={() => setError(null)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss error"
              style={{
                backgroundColor: '#FEF2F2',
                borderRadius: 10,
                padding: 12,
                marginBottom: 4,
              }}
            >
              <Text style={{ color: '#DC2626', fontSize: 13, textAlign: 'center' }}>
                {error}
              </Text>
            </Pressable>
          ) : null}

          {/* Google */}
          <Pressable
            disabled={!ready || isLoading}
            onPress={() => void signInWithGoogle()}
            style={({ pressed }) => ({
              height: 56,
              backgroundColor: pressed ? '#f5f5f5' : '#fff',
              borderRadius: 14,
              borderWidth: 1,
              borderColor: '#E5E5E5',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              opacity: ready ? 1 : 0.6,
            })}
          >
            {isLoading ? (
              <ActivityIndicator color="#0F4C5C" />
            ) : (
              <>
                <GoogleLogo />
                <Text style={{ fontSize: 16, color: '#1A1A1A', fontWeight: '500' }}>
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>

          {/* Email */}
          <View style={{ position: 'relative' }}>
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
              onPress={() => router.push('/(auth)/signin')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#0D3F4E' : '#0F4C5C',
                borderRadius: 14,
                height: 56,
                alignItems: 'center',
                justifyContent: 'center',
              })}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                Continue with email
              </Text>
            </Pressable>
          </View>

          {/* Terms */}
          <Text style={{ fontSize: 12, color: '#ABABAB', textAlign: 'center', marginTop: 4 }}>
            By continuing you agree to our{' '}
            <Text style={{ color: '#0F4C5C' }}>Terms</Text>
            {' '}and{' '}
            <Text style={{ color: '#0F4C5C' }}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

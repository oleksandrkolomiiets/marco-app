import { useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Line, Path, Rect } from 'react-native-svg';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { colors } from '@/constants/colors';

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

// Faint court diagram bleeding off the upper-right corner, per the design's
// AuthEntry background treatment.
const CourtWatermark = () => (
  <View style={styles.watermark} pointerEvents="none">
    <Svg width={240} height={200} viewBox="0 0 240 200">
      <Rect x={6} y={6} width={228} height={188} rx={3} fill="none" stroke={colors.teal} strokeWidth={1.6} />
      <Line x1={120} y1={6} x2={120} y2={194} stroke={colors.teal} strokeWidth={1.4} strokeDasharray="3 3" />
      <Line x1={6} y1={100} x2={234} y2={100} stroke={colors.teal} strokeWidth={1} />
    </Svg>
  </View>
);

type SketchyButtonProps = {
  label: string;
  onPress: () => void;
  variant: 'filled' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  height?: number;
  fontSize?: number;
  leftIcon?: ReactNode;
};

// The design gives every button a 1.6px ink outline and a hard 2x3 ink offset
// (`boxShadow: 2px 3px 0`). React Native can't express a hard shadow, so the
// offset is painted as a sibling rectangle behind the face. Pressing sinks the
// face onto the shadow.
function SketchyButton({
  label,
  onPress,
  variant,
  disabled = false,
  loading = false,
  height = 54,
  fontSize = 15.5,
  leftIcon,
}: SketchyButtonProps) {
  const [pressed, setPressed] = useState(false);
  const isFilled = variant === 'filled';

  return (
    <View style={{ height: height + SHADOW_Y }}>
      {!pressed && !disabled ? <View pointerEvents="none" style={[styles.buttonShadow, { height }]} /> : null}
      <Pressable
        accessibilityRole="button"
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={{
          height,
          borderRadius: 14,
          borderWidth: 1.6,
          borderColor: colors.ink,
          // Opaque even for ghost: the hard shadow is painted as a sibling rect
          // behind the face, so a transparent face would let it bleed through.
          backgroundColor: isFilled ? '#FFFFFF' : colors.bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.45 : 1,
          transform: [
            { translateX: pressed && !disabled ? SHADOW_X : 0 },
            { translateY: pressed && !disabled ? SHADOW_Y : 0 },
          ],
        }}
      >
        {loading ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <>
            {leftIcon ? <View style={{ marginRight: 12 }}>{leftIcon}</View> : null}
            <Text style={{ fontSize, fontWeight: '600', color: colors.ink }}>{label}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { signInWithGoogle, isLoading, error, setError, ready } = useGoogleAuth();

  return (
    <SafeAreaView style={styles.safeArea}>
      <CourtWatermark />

      <View style={styles.body}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <Text style={styles.logo}>marco</Text>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <MarcoAvatar size={104} />

          <Text style={styles.greeting}>Ready when you are.</Text>

          <Text style={styles.heading}>Step onto the court.</Text>

          <Text style={styles.subcopy}>
            Sign in to pick up where you left off, or start a new training file with me.
          </Text>
        </View>

        {/* Auth actions */}
        <View style={styles.actions}>
          {error !== null ? (
            <Pressable
              onPress={() => setError(null)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss error"
              style={styles.errorBanner}
            >
              <Text style={styles.errorText}>{error}</Text>
            </Pressable>
          ) : null}

          <SketchyButton
            label="Continue with Google"
            variant="filled"
            leftIcon={<GoogleLogo />}
            disabled={!ready}
            loading={isLoading}
            onPress={() => void signInWithGoogle()}
          />

          <SketchyButton
            label="Continue with email"
            variant="ghost"
            height={56}
            fontSize={16.5}
            onPress={() => router.push('/(auth)/signin')}
          />
        </View>

        {/* Terms */}
        <View style={styles.termsWrap}>
          <Text style={styles.terms}>
            By continuing you agree to our{'\n'}
            <Text style={styles.termsLink}>Terms</Text>
            {' & '}
            <Text style={styles.termsLink}>Privacy</Text>.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const SHADOW_X = 2;
const SHADOW_Y = 3;

const styles = {
  safeArea: { flex: 1, backgroundColor: colors.bg },
  watermark: { position: 'absolute', top: 60, right: -60, opacity: 0.12 },
  body: { flex: 1, justifyContent: 'space-between' },
  logoRow: { paddingTop: 16, paddingHorizontal: 24 },
  logo: { fontFamily: 'Caveat_400Regular', fontSize: 22, color: colors.clay },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  greeting: {
    marginTop: 14,
    fontFamily: 'Caveat_400Regular',
    fontSize: 22,
    color: colors.clay,
    textAlign: 'center',
  },
  heading: {
    marginTop: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -0.64,
    color: colors.ink,
    textAlign: 'center',
  },
  subcopy: {
    marginTop: 8,
    maxWidth: 280,
    fontSize: 14.5,
    lineHeight: 20,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  actions: { paddingHorizontal: 24, gap: 12 },
  errorBanner: { backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 4 },
  errorText: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  buttonShadow: {
    position: 'absolute',
    left: SHADOW_X,
    right: -SHADOW_X,
    top: SHADOW_Y,
    borderRadius: 14,
    backgroundColor: colors.ink,
  },
  termsWrap: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 },
  terms: { fontSize: 12, lineHeight: 17, color: colors.inkSoft, textAlign: 'center' },
  termsLink: { color: colors.inkSoft, textDecorationLine: 'underline' },
} as const;

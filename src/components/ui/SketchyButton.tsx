import { useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

// Port of the prototype's `AuthCTA` / `SocialBtn` (screens-auth.jsx).
//
// Every button in the design carries a 1.6px ink outline and a hard offset
// shadow (`box-shadow: 2px 3px 0`). React Native has no hard-shadow primitive —
// `shadow*` blurs on iOS and `elevation` is a soft drop shadow — so the offset
// is painted as a sibling rectangle behind the face. The face must therefore be
// opaque, or the shadow bleeds through it.
//
// Note: `style` is passed as a plain object, never as a ({ pressed }) => ({})
// function. react-native-css-interop (NativeWind) drops functional style props
// on Pressable, which silently strips the button chrome. Press feedback is done
// with onPressIn/onPressOut state instead.

export type SketchyButtonVariant = 'primary' | 'ghost' | 'light' | 'dark';

type SketchyButtonProps = {
  label: string;
  onPress: () => void;
  variant?: SketchyButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  height?: number;
  fontSize?: number;
  leftIcon?: ReactNode;
  accessibilityLabel?: string;
};

const SHADOW_X = 2;
const SHADOW_Y = 3;

const variants: Record<SketchyButtonVariant, { bg: string; fg: string }> = {
  primary: { bg: colors.teal, fg: '#FFFFFF' },
  ghost: { bg: colors.bg, fg: colors.ink },
  light: { bg: '#FFFFFF', fg: colors.ink },
  dark: { bg: colors.ink, fg: '#FFFFFF' },
};

export function SketchyButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  height = 56,
  fontSize = 16.5,
  leftIcon,
  accessibilityLabel,
}: SketchyButtonProps) {
  const [pressed, setPressed] = useState(false);
  const { bg, fg } = variants[variant];
  const isInert = disabled || loading;
  const showShadow = !pressed && !disabled;

  return (
    <View style={{ height: height + SHADOW_Y }}>
      {showShadow ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: SHADOW_X,
            right: -SHADOW_X,
            top: SHADOW_Y,
            height,
            borderRadius: 14,
            backgroundColor: colors.ink,
          }}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        disabled={isInert}
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={{
          height,
          borderRadius: 14,
          borderWidth: 1.6,
          borderColor: colors.ink,
          // Disabled primary fades toward the page rather than going grey,
          // matching `rgba(15,76,92,0.4)` in the design.
          backgroundColor: bg,
          opacity: disabled ? 0.4 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          transform: [
            { translateX: pressed && !disabled ? SHADOW_X : 0 },
            { translateY: pressed && !disabled ? SHADOW_Y : 0 },
          ],
        }}
      >
        {loading ? (
          <>
            <ActivityIndicator color={fg} />
            <Text style={{ marginLeft: 12, fontSize, fontWeight: '600', color: fg, opacity: 0.9 }}>
              {label}
            </Text>
          </>
        ) : (
          <>
            {leftIcon ? <View style={{ marginRight: 12 }}>{leftIcon}</View> : null}
            <Text style={{ fontSize, fontWeight: '600', color: fg }}>{label}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

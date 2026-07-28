import { useState } from 'react';
import type { ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '@/constants/colors';

// Port of the prototype's `Field` (screens-auth.jsx).
//
// States and their treatments, straight from the design:
//   default  1.2px lineSoft border
//   focus    1.8px ink border + hard 2x3 ink shadow
//   error    1.8px clay border + clay message with a circle-! icon
//
// The label is JetBrains Mono, 10px, uppercase, 0.14em tracking.

type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  trailing?: ReactNode;
  /** Renders the value in JetBrains Mono — the design does this for emails. */
  mono?: boolean;
};

const SHADOW_X = 2;
const SHADOW_Y = 3;

function ErrorIcon() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Circle cx={7} cy={7} r={6} fill="none" stroke={colors.clay} strokeWidth={1.4} />
      <Path d="M7 4 V8" stroke={colors.clay} strokeWidth={1.4} strokeLinecap="round" />
      <Circle cx={7} cy={10} r={0.9} fill={colors.clay} />
    </Svg>
  );
}

export function Field({ label, error, trailing, mono = false, ...inputProps }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  const borderColor = hasError ? colors.clay : focused ? colors.ink : colors.lineSoft;
  const borderWidth = hasError || focused ? 1.8 : 1.2;
  const showShadow = focused && !hasError;

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>

      <View style={{ height: FIELD_HEIGHT + SHADOW_Y }}>
        {showShadow ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: SHADOW_X,
              right: -SHADOW_X,
              top: SHADOW_Y,
              height: FIELD_HEIGHT,
              borderRadius: 12,
              backgroundColor: colors.ink,
            }}
          />
        ) : null}

        <View style={[styles.inputShell, { borderColor, borderWidth }]}>
          <TextInput
            {...inputProps}
            onFocus={(e) => {
              setFocused(true);
              inputProps.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              inputProps.onBlur?.(e);
            }}
            placeholderTextColor="rgba(26,42,48,0.42)"
            style={[
              styles.input,
              mono ? { fontFamily: 'JetBrainsMono_400Regular', fontSize: 15 } : null,
            ]}
          />
          {trailing}
        </View>
      </View>

      {hasError ? (
        <View style={styles.errorRow}>
          <ErrorIcon />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const FIELD_HEIGHT = 52;

const styles = {
  label: {
    fontFamily: 'JetBrainsMono_400Regular',
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
    color: colors.inkSoft,
    marginBottom: 6,
  },
  inputShell: {
    height: FIELD_HEIGHT,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.ink,
    padding: 0,
  },
  errorRow: {
    marginTop: 6,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500' as const,
    color: colors.clay,
  },
} as const;

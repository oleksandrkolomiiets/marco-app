import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors } from '@/constants/colors';

// Port of the prototype's selected-option treatment (screens-onboarding.jsx).
//
// Unselected is always a plain white card with a 1.2px warm border. Selected
// gains a 1.8px ink border plus the hard 2x3 ink offset, and the fill varies by
// step — cream for the neutral lists, teal for dominant hand, clay for the goal.
export type SelectionTone = 'cream' | 'teal' | 'clay';

type SelectableRowProps = {
  label: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  tone?: SelectionTone;
  height?: number;
  /** Stacks content centred rather than left-aligned — used by the tile grid. */
  centered?: boolean;
  children?: ReactNode;
};

const SHADOW_X = 2;
const SHADOW_Y = 3;

const tones: Record<SelectionTone, { fill: string; fg: string }> = {
  cream: { fill: colors.cream, fg: colors.ink },
  teal: { fill: colors.teal, fg: '#FFFFFF' },
  clay: { fill: colors.clay, fg: '#FFFFFF' },
};

export function SelectableRow({
  label,
  subtitle,
  selected,
  onPress,
  tone = 'cream',
  height = 56,
  centered = false,
  children,
}: SelectableRowProps) {
  const { fill, fg } = tones[tone];
  const foreground = selected ? fg : colors.ink;

  return (
    <View style={{ height: height + (selected ? SHADOW_Y : 0) }}>
      {selected ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: SHADOW_X,
            right: -SHADOW_X,
            top: SHADOW_Y,
            height,
            borderRadius: 10,
            backgroundColor: colors.ink,
          }}
        />
      ) : null}
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={onPress}
        style={{
          height,
          borderRadius: 10,
          borderWidth: selected ? 1.8 : 1.2,
          borderColor: selected ? colors.ink : colors.lineSoft,
          backgroundColor: selected ? fill : '#FFFFFF',
          paddingHorizontal: 16,
          justifyContent: 'center',
          alignItems: centered ? 'center' : 'flex-start',
        }}
      >
        {children}
        <Text
          style={{
            fontSize: 15,
            fontWeight: selected ? '700' : subtitle ? '600' : '500',
            color: foreground,
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 12,
              marginTop: 2,
              color: selected && tone !== 'cream' ? 'rgba(255,255,255,0.8)' : colors.inkSoft,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

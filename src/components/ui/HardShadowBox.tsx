import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type HardShadowBoxProps = {
  children: ReactNode;
  // Surface color the card draws on. Defaults to white because every card in
  // the profile design sits on white.
  background?: string;
  // Hard offset shadow color (defaults to the brand ink).
  shadowColor?: string;
  // Pixel offsets. The design uses 2/2 for small tiles and 2/3 for the wider
  // achievements + settings cards.
  offsetX?: number;
  offsetY?: number;
  // Container style — apply your own width/margin/padding here.
  style?: StyleProp<ViewStyle>;
  // When true, the shadow is allowed to render outside the layout box (no
  // reserved margin). Useful in tight grids where siblings are spaced just
  // wide enough for the shadow overhang to slot into the gap.
  inline?: boolean;
};

// HardShadowBox renders an ink-colored sibling behind the content, offset by
// (offsetX, offsetY) — the same look as `box-shadow: rgb(26,42,48) Xpx Ypx 0 0`
// in CSS. React Native's `shadow*` props blur on iOS and Android's `elevation`
// produces a soft drop shadow, so we paint the offset rectangle manually.
export function HardShadowBox({
  children,
  background = '#FFFFFF',
  shadowColor = '#1A2A30',
  offsetX = 2,
  offsetY = 2,
  style,
  inline = false,
}: HardShadowBoxProps) {
  const containerStyle = inline ? style : [{ marginRight: offsetX, marginBottom: offsetY }, style];
  return (
    <View style={containerStyle}>
      <View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: offsetX,
            right: -offsetX,
            top: offsetY,
            bottom: -offsetY,
            backgroundColor: shadowColor,
          }}
        />
        <View style={{ backgroundColor: background }}>{children}</View>
      </View>
    </View>
  );
}

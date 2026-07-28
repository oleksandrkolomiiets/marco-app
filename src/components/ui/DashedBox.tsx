import { useState } from 'react';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors } from '@/constants/colors';

// A rounded rectangle with a dashed outline.
//
// React Native ignores `borderStyle: 'dashed'` whenever a view has a corner
// radius (and whenever border widths aren't uniform), logging "Unsupported
// dashed / dotted border style" and drawing a solid line instead. The design
// uses dashed rounded cards for empty states and optional blocks, so the
// outline is drawn as an SVG overlay sized from the laid-out box.
//
// `DashedRule` covers the simpler horizontal-divider case.

type DashedBoxProps = {
  children: ReactNode;
  radius?: number;
  color?: string;
  strokeWidth?: number;
  /** Dash pattern: [dash, gap]. */
  dash?: [number, number];
  /** Fill behind the children, inside the dashed outline. */
  background?: string;
  style?: StyleProp<ViewStyle>;
};

export function DashedBox({
  children,
  radius = 14,
  color = colors.lineSoft,
  strokeWidth = 1.2,
  dash = [4, 4],
  background,
  style,
}: DashedBoxProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  return (
    <View
      style={[{ borderRadius: radius, backgroundColor: background }, style]}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) =>
          prev.width === width && prev.height === height ? prev : { width, height },
        );
      }}
    >
      {children}
      {size.width > 0 && size.height > 0 ? (
        <Svg
          width={size.width}
          height={size.height}
          style={{ position: 'absolute', left: 0, top: 0 }}
          pointerEvents="none"
        >
          <Rect
            x={strokeWidth / 2}
            y={strokeWidth / 2}
            width={Math.max(0, size.width - strokeWidth)}
            height={Math.max(0, size.height - strokeWidth)}
            rx={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={dash.join(' ')}
          />
        </Svg>
      ) : null}
    </View>
  );
}

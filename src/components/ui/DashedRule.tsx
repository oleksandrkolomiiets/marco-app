import { View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { colors } from '@/constants/colors';

// A horizontal dashed rule.
//
// React Native on iOS only honours `borderStyle: 'dashed'` when every border
// width on the view is equal — a `borderTopWidth`-only dashed divider silently
// renders solid and logs "Unsupported dashed / dotted border style". The design
// uses dashed rules to separate card footers, so draw one with SVG instead.
type DashedRuleProps = {
  color?: string;
  /** Stroke thickness. */
  width?: number;
  /** Dash pattern: [dash, gap]. The design uses a fine 3/3-ish rule. */
  dash?: [number, number];
  marginTop?: number;
  marginBottom?: number;
};

export function DashedRule({
  color = colors.lineSoft,
  width = 1,
  dash = [3, 3],
  marginTop = 0,
  marginBottom = 0,
}: DashedRuleProps) {
  return (
    <View style={{ height: width, marginTop, marginBottom }}>
      <Svg width="100%" height={width}>
        <Line
          x1="0"
          y1={width / 2}
          x2="100%"
          y2={width / 2}
          stroke={color}
          strokeWidth={width}
          strokeDasharray={dash.join(' ')}
        />
      </Svg>
    </View>
  );
}

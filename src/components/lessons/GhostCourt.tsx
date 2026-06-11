import { G, Line, Rect } from 'react-native-svg';

type GhostCourtProps = {
  x: number;
  y: number;
};

export const GhostCourt = ({ x, y }: GhostCourtProps) => (
  <G opacity={0.13}>
    <Rect
      x={x}
      y={y}
      width={90}
      height={60}
      rx={2}
      stroke="#0F4C5C"
      strokeWidth={1.2}
      fill="none"
    />
    <Line
      x1={x + 45}
      y1={y}
      x2={x + 45}
      y2={y + 60}
      stroke="#0F4C5C"
      strokeWidth={1.2}
    />
    <Line
      x1={x}
      y1={y + 30}
      x2={x + 90}
      y2={y + 30}
      stroke="#0F4C5C"
      strokeWidth={1.2}
      strokeDasharray="2 2"
    />
  </G>
);

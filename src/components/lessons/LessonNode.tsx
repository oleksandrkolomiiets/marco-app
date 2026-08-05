import { Circle, G, Text as SvgText } from 'react-native-svg';
import type { Lesson } from '@/types/api';

type LessonNodeProps = {
  lesson: Lesson;
  x: number;
  y: number;
  completed: boolean;
  current: boolean;
  locked: boolean;
  labelOnRight: boolean;
  progressNumber: number | null;
};

const LABEL_OFFSET = 30;

export const LessonNode = ({
  lesson,
  x,
  y,
  completed,
  current,
  locked,
  labelOnRight,
  progressNumber,
}: LessonNodeProps) => {
  const labelX = labelOnRight ? x + LABEL_OFFSET : x - LABEL_OFFSET;
  const labelAnchor: 'start' | 'end' = labelOnRight ? 'start' : 'end';

  if (current) {
    return (
      <G>
        <Circle
          cx={x}
          cy={y}
          r={22}
          fill="#fff"
          stroke="#0F4C5C"
          strokeWidth={2.5}
        />
        <SvgText
          x={x}
          y={y + 5}
          fontSize={16}
          fill="#0F4C5C"
          textAnchor="middle"
        >
          ▶
        </SvgText>
        <SvgText
          x={x}
          y={y + 50}
          fontSize={13}
          fill="#E36414"
          textAnchor="middle"
          fontFamily="Caveat_400Regular"
        >
          you are here ↑
        </SvgText>
      </G>
    );
  }

  if (completed) {
    return (
      <G>
        <Circle cx={x} cy={y} r={18} fill="#0F4C5C" />
        <SvgText
          x={x}
          y={y + 5}
          fontSize={14}
          fill="#fff"
          textAnchor="middle"
          fontWeight="700"
        >
          ✓
        </SvgText>
        {progressNumber !== null ? (
          <SvgText
            x={labelX}
            y={y - 4}
            fontSize={10}
            fill="#0F4C5C"
            textAnchor={labelAnchor}
          >
            {/* progressNumber is "the Nth lesson you finished". The label used
                to read "sm. 1" — an abbreviation that appears nowhere else in
                the app and means nothing in its copy; the ordinal convention
                here is the match log's "#002". */}
            {`#${progressNumber}`}
          </SvgText>
        ) : null}
        <SvgText
          x={labelX}
          y={y + 10}
          fontSize={13}
          fill="#0F4C5C"
          fontWeight="600"
          textAnchor={labelAnchor}
        >
          {lesson.title}
        </SvgText>
      </G>
    );
  }

  if (locked) {
    return (
      <G>
        <Circle
          cx={x}
          cy={y}
          r={16}
          fill="#F5F0E8"
          stroke="#c7bfb2"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
        <SvgText
          x={x}
          y={y + 4}
          fontSize={12}
          fill="#c7bfb2"
          textAnchor="middle"
        >
          🔒
        </SvgText>
        <SvgText
          x={labelX}
          y={y + 4}
          fontSize={12}
          fill="#9CA3AF"
          textAnchor={labelAnchor}
        >
          {lesson.title}
        </SvgText>
      </G>
    );
  }

  return (
    <G>
      <Circle
        cx={x}
        cy={y}
        r={18}
        fill="#fff"
        stroke="#0F4C5C"
        strokeWidth={2}
      />
      <SvgText
        x={x}
        y={y + 5}
        fontSize={14}
        fill="#0F4C5C"
        textAnchor="middle"
      >
        ▶
      </SvgText>
      <SvgText
        x={labelX}
        y={y + 4}
        fontSize={13}
        fill="#1A1A1A"
        fontWeight="600"
        textAnchor={labelAnchor}
      >
        {lesson.title}
      </SvgText>
    </G>
  );
};

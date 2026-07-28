import { Pressable, View, useWindowDimensions } from 'react-native';
import Svg, {
  Circle,
  G,
  Path,
  Text as SvgText,
} from 'react-native-svg';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { isLessonCompleted } from '@/hooks/useLessons';
import { GhostCourt } from './GhostCourt';
import { LessonNode } from './LessonNode';
import { MarcoSpeechBubble } from './MarcoSpeechBubble';
import type { Lesson, SkillLevel } from '@/types/api';

type JourneyMapProps = {
  lessons: Lesson[];
  onLessonPress: (lesson: Lesson) => void;
  onLockedPress: (lesson: Lesson) => void;
};

const NODE_SPACING = 90;
const LEFT_X = 70;
const RIGHT_X = 280;

const STAGES: Record<SkillLevel, { name: string; color: string }> = {
  beginner: { name: 'WARM-UP', color: '#0F4C5C' },
  intermediate: { name: 'CLUB GAME', color: '#E36414' },
  advanced: { name: 'TOURNAMENT', color: '#1a2a30' },
};

export const JourneyMap = ({
  lessons,
  onLessonPress,
  onLockedPress,
}: JourneyMapProps) => {
  const { width } = useWindowDimensions();

  const SVG_HEIGHT = lessons.length * NODE_SPACING + 200;
  const START_Y = SVG_HEIGHT - 80;

  const positions = lessons.map((_, i) => ({
    x: i % 2 === 0 ? LEFT_X : RIGHT_X,
    y: START_Y - i * NODE_SPACING,
  }));

  const firstUnfinished = lessons.findIndex(
    (l) => l.progress === null || l.progress === 'viewed',
  );
  const currentIndex =
    firstUnfinished === -1 ? lessons.length - 1 : firstUnfinished;

  let completedPath = `M ${LEFT_X} ${START_Y}`;
  let lockedPath = '';

  for (let i = 0; i < lessons.length - 1; i++) {
    const cur = positions[i];
    const next = positions[i + 1];
    if (!cur || !next) continue;
    const midX = (cur.x + next.x) / 2;
    const midY = (cur.y + next.y) / 2;
    const segment = ` Q ${midX} ${midY} ${next.x} ${next.y}`;

    if (i < currentIndex) {
      completedPath += segment;
    } else {
      if (lockedPath === '') {
        lockedPath = `M ${cur.x} ${cur.y}`;
      }
      lockedPath += segment;
    }
  }

  const stageLabels: { name: string; color: string; y: number }[] = [];
  let prevLevel: SkillLevel | null = null;
  lessons.forEach((l, i) => {
    if (l.level !== prevLevel) {
      const pos = positions[i];
      if (pos) {
        stageLabels.push({
          name: STAGES[l.level].name,
          color: STAGES[l.level].color,
          y: pos.y,
        });
      }
      prevLevel = l.level;
    }
  });

  const stageRanges: { level: SkillLevel; firstIdx: number; lastIdx: number }[] = [];
  lessons.forEach((l, i) => {
    const last = stageRanges[stageRanges.length - 1];
    if (last && last.level === l.level) {
      last.lastIdx = i;
    } else {
      stageRanges.push({ level: l.level, firstIdx: i, lastIdx: i });
    }
  });

  const trophyX = positions.length % 2 === 0 ? RIGHT_X : LEFT_X;
  const trophyY = START_Y - lessons.length * NODE_SPACING - 10;

  const currentLesson = lessons[currentIndex];
  const currentPos = positions[currentIndex];
  const marcoOnRight = currentPos?.x === LEFT_X;

  let completedCount = 0;
  const progressNumbers: (number | null)[] = lessons.map((l) => {
    if (isLessonCompleted(l)) {
      completedCount += 1;
      return completedCount;
    }
    return null;
  });

  return (
    <View style={{ height: SVG_HEIGHT, width: '100%' }}>
      <Svg width={width} height={SVG_HEIGHT}>
        {stageRanges.map((range, idx) => {
          const first = positions[range.firstIdx];
          const last = positions[range.lastIdx];
          if (!first || !last) return null;
          const courtY = (first.y + last.y) / 2 - 30;
          const courtX = idx % 2 === 0 ? width - 110 : 15;
          return (
            <GhostCourt key={`court-${range.level}`} x={courtX} y={courtY} />
          );
        })}

        {lockedPath ? (
          <Path
            d={lockedPath}
            stroke="#c7bfb2"
            strokeWidth={2.6}
            fill="none"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
        ) : null}
        <Path
          d={completedPath}
          stroke="#0F4C5C"
          strokeWidth={2.6}
          fill="none"
          strokeLinecap="round"
        />

        <G>
          <Circle
            cx={LEFT_X}
            cy={START_Y + 36}
            r={12}
            fill="#fefbf5"
            stroke="#1a2a30"
            strokeWidth={1.5}
          />
          <Path
            d={`M ${LEFT_X - 9} ${START_Y + 36} Q ${LEFT_X} ${START_Y + 32} ${LEFT_X + 9} ${START_Y + 36}`}
            stroke="#1a2a30"
            strokeWidth={1}
            fill="none"
          />
          <Path
            d={`M ${LEFT_X - 9} ${START_Y + 36} Q ${LEFT_X} ${START_Y + 40} ${LEFT_X + 9} ${START_Y + 36}`}
            stroke="#1a2a30"
            strokeWidth={1}
            fill="none"
          />
          <Circle cx={LEFT_X - 3} cy={START_Y + 35} r={1} fill="#1a2a30" />
          <Circle cx={LEFT_X + 3} cy={START_Y + 35} r={1} fill="#1a2a30" />
          <SvgText
            x={LEFT_X}
            y={START_Y + 64}
            fontSize={16}
            fill="#0F4C5C"
            textAnchor="middle"
            fontFamily="Caveat_400Regular"
          >
            start!
          </SvgText>
        </G>

        {stageLabels.map((s, idx) => (
          <SvgText
            key={`stage-${idx}`}
            x={16}
            y={s.y - 36}
            fontSize={10}
            fontWeight="700"
            letterSpacing={1.2}
            fill={s.color}
            fontFamily="Courier"
          >
            {s.name}
          </SvgText>
        ))}

        {lessons.map((lesson, i) => {
          const pos = positions[i];
          if (!pos) return null;
          return (
            <LessonNode
              key={lesson.id}
              lesson={lesson}
              x={pos.x}
              y={pos.y}
              completed={isLessonCompleted(lesson)}
              current={i === currentIndex && !lesson.locked}
              locked={lesson.locked && i !== currentIndex}
              labelOnRight={pos.x === LEFT_X}
              progressNumber={progressNumbers[i] ?? null}
            />
          );
        })}

        <G>
          <Path
            d={`M ${trophyX - 12} ${trophyY - 12} L ${trophyX + 12} ${trophyY - 12} L ${trophyX + 10} ${trophyY + 6} Q ${trophyX} ${trophyY + 14} ${trophyX - 10} ${trophyY + 6} Z`}
            fill="#E36414"
            stroke="#1a2a30"
            strokeWidth={1.2}
          />
          <Path
            d={`M ${trophyX - 12} ${trophyY - 10} q -6 0 -6 -6 q 0 -4 6 -4`}
            fill="none"
            stroke="#1a2a30"
            strokeWidth={1.2}
          />
          <Path
            d={`M ${trophyX + 12} ${trophyY - 10} q 6 0 6 -6 q 0 -4 -6 -4`}
            fill="none"
            stroke="#1a2a30"
            strokeWidth={1.2}
          />
          <Path
            d={`M ${trophyX - 6} ${trophyY + 14} L ${trophyX + 6} ${trophyY + 14} L ${trophyX + 8} ${trophyY + 20} L ${trophyX - 8} ${trophyY + 20} Z`}
            fill="#E36414"
            stroke="#1a2a30"
            strokeWidth={1.2}
          />
          <SvgText
            x={trophyX}
            y={trophyY - 2}
            fontSize={12}
            fill="#fff"
            textAnchor="middle"
            fontWeight="700"
          >
            ★
          </SvgText>
          <SvgText
            x={trophyX}
            y={trophyY + 40}
            fontSize={16}
            fill="#E36414"
            textAnchor="middle"
            fontFamily="Caveat_400Regular"
          >
            champion!
          </SvgText>
        </G>
      </Svg>

      {currentLesson && currentPos && !currentLesson.locked ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: marcoOnRight ? currentPos.x + 6 : currentPos.x - 58,
            top: currentPos.y - 26,
          }}
        >
          <MarcoAvatar size={52} />
        </View>
      ) : null}

      {currentLesson && currentPos && !currentLesson.locked ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: marcoOnRight ? currentPos.x + 62 : Math.max(8, currentPos.x - 198),
            top: currentPos.y - 18,
          }}
        >
          <MarcoSpeechBubble title={currentLesson.title} />
        </View>
      ) : null}

      {lessons.map((lesson, i) => {
        const pos = positions[i];
        if (!pos) return null;
        const hitSize = i === currentIndex ? 56 : 44;
        return (
          <Pressable
            key={`hit-${lesson.id}`}
            onPress={() =>
              lesson.locked ? onLockedPress(lesson) : onLessonPress(lesson)
            }
            accessibilityRole="button"
            accessibilityLabel={
              lesson.locked ? `${lesson.title}, locked` : lesson.title
            }
            style={{
              position: 'absolute',
              left: pos.x - hitSize / 2,
              top: pos.y - hitSize / 2,
              width: hitSize,
              height: hitSize,
            }}
          />
        );
      })}
    </View>
  );
};

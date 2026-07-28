import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { DashedRule } from '@/components/ui/DashedRule';
import { DashedBox } from '@/components/ui/DashedBox';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { PreparationSheet } from '@/components/preparation/PreparationSheet';
import {
  preparationColors,
  preparationColors as C,
  preparationFonts as F,
  stickerShadowSm,
} from '@/components/preparation/theme';
import { useUser } from '@/hooks/useUser';
import { useLessons } from '@/hooks/useLessons';
import { useLatestExamAttempt } from '@/hooks/useExam';
import { useMatchPreparation } from '@/hooks/usePreparation';
import type { Lesson, MatchPreparation } from '@/types/api';

// Hard 2x3 ink offset shared by the quick tiles — `box-shadow: 2px 3px 0` in
// the design. Matches stickerShadow's technique but with the tile's offset.
const tileShadow = {
  shadowColor: preparationColors.ink,
  shadowOffset: { width: 2, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 2,
} as const;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MONTH_NAMES_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const getGreeting = (firstName: string, hour: number): string => {
  if (hour >= 12 && hour < 18) return `Buenas tardes, ${firstName}.`;
  if (hour >= 18 && hour < 24) return `Buenas noches, ${firstName}.`;
  return `Buenos días, ${firstName}.`;
};

const getFormattedDate = (now: Date): string => {
  const day = DAY_NAMES[now.getDay()] ?? 'Today';
  const month = MONTH_NAMES_LONG[now.getMonth()] ?? '';
  return `${day} · ${now.getDate()} ${month}`;
};

const WEEKDAY_SHORT_UPPER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const formatNextLabel = (iso: string): string => {
  const d = new Date(iso);
  const wd = WEEKDAY_SHORT_UPPER[d.getUTCDay()] ?? '';
  const day = d.getUTCDate();
  const month = MONTH_NAMES_SHORT[d.getUTCMonth()]?.toUpperCase() ?? '';
  return `NEXT · ${wd} ${day} ${month}`;
};

const formatPrepTime = (iso: string): string => {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const formatDrillDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.round(seconds / 60);
  return `${m} min`;
};

const pickUpcomingPreparation = (
  items: MatchPreparation[] | undefined,
): MatchPreparation | null => {
  if (!items || items.length === 0) return null;
  const now = Date.now();
  const upcoming = items
    .filter(
      (r) =>
        r.played_at === null && new Date(r.scheduled_at).getTime() >= now,
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() -
        new Date(b.scheduled_at).getTime(),
    );
  return upcoming[0] ?? null;
};

const getContinueLesson = (lessons: Lesson[] | undefined): Lesson | null => {
  if (!lessons || lessons.length === 0) return null;
  const next = lessons.find(
    (l) => !l.locked && (l.progress === null || l.progress.status === 'viewed'),
  );
  return next ?? lessons[0] ?? null;
};


export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();
  const { data: lessons, isLoading: lessonsLoading } = useLessons();
  const { data: examAttempt } = useLatestExamAttempt();
  const { data: preparationItems } = useMatchPreparation();
  const [adjustingPrep, setAdjustingPrep] = useState<MatchPreparation | null>(
    null,
  );

  const now = new Date();
  const isLoading = userLoading || lessonsLoading;

  const upcomingPrep = useMemo(
    () => pickUpcomingPreparation(preparationItems),
    [preparationItems],
  );

  const displayName = user?.display_name ?? 'Player';
  const firstName = displayName.split(' ')[0] ?? 'Player';
  const initial = (displayName[0] ?? '?').toUpperCase();

  const continueLesson = getContinueLesson(lessons);
  const completedCount = lessons?.filter((l) => l.progress !== null).length ?? 0;
  const totalCount = lessons?.length ?? 0;

  const lessonQuote = continueLesson?.tagline
    ? `"${continueLesson.tagline}"`
    : '"It\'s a slap, not a smash. Tranquilo."';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Top nav */}
        {/* Layout is inline, not className: NativeWind 4.1 / css-interop 0.1.22
            do not apply className under React 19 + RN 0.81, so these rows were
            silently collapsing to the default column direction. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 24,
            paddingTop: 4,
            paddingBottom: 16,
          }}
        >
          <Text
            style={{
              fontFamily: F.hand,
              fontSize: 22,
              color: C.clay,
            }}
          >
            marco
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: C.cream,
              borderWidth: 1.4,
              borderColor: C.ink,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>
              {initial}
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 16 }}>
            <SkeletonCard height={90} />
            <SkeletonCard height={200} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <SkeletonCard height={90} />
              </View>
              <View style={{ flex: 1 }}>
                <SkeletonCard height={90} />
              </View>
              <View style={{ flex: 1 }}>
                <SkeletonCard height={90} />
              </View>
            </View>
            <SkeletonCard height={150} />
          </View>
        ) : (
          <>
            {/* Greeting card */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginHorizontal: 20,
                marginBottom: 18,
                // Design anchors this card in brand teal with the sticker
                // treatment — ink outline + hard 3x4 offset. It was rendering
                // in near-black ink with no border or shadow at all.
                backgroundColor: C.teal,
                borderWidth: 1.6,
                borderColor: C.ink,
                borderRadius: 22,
                paddingVertical: 16,
                paddingHorizontal: 18,
                shadowColor: C.ink,
                shadowOffset: { width: 3, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 3,
              }}
            >
              <View style={{ marginTop: 2, flexShrink: 0 }}>
                <MarcoAvatar size={66} />
              </View>
              {/* flexShrink + explicit margin rather than the row's `gap`:
                  with gap set, the text column measured wider than the card
                  and the greeting ran off the right edge. */}
              <View style={{ flex: 1, flexShrink: 1, marginLeft: 14 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: 4,
                  }}
                >
                  {getFormattedDate(now)}
                </Text>
                <Text
                  style={{
                    fontFamily: 'InstrumentSerif_400Regular_Italic',
                    fontSize: 22,
                    letterSpacing: -0.18,
                    lineHeight: 27.5,
                    color: '#FFFFFF',
                    marginBottom: 4,
                  }}
                >
                  {getGreeting(firstName, now.getHours())}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    letterSpacing: -0.18,
                    lineHeight: 22.5,
                    color: '#FFFFFF',
                    fontWeight: '400',
                  }}
                >
                  Your bandeja&apos;s loose. I queued a 90-sec fix.
                </Text>
              </View>
            </View>

            {/* Today's drill section */}
            <Text
              style={{
                paddingHorizontal: 20,
                marginBottom: 6,
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 1.1,
                // Section kickers are muted in the design, not full ink.
                color: C.mute,
              }}
            >
              TODAY&apos;S DRILL
            </Text>

            <Pressable
              onPress={() =>
                continueLesson
                  ? router.push(`/lessons/${continueLesson.slug}` as never)
                  : router.push('/(tabs)/lessons')
              }
              style={{
                marginHorizontal: 20,
                marginBottom: 16,
                backgroundColor: C.cream,
                borderRadius: 18,
                borderWidth: 1.4,
                borderColor: C.ink,
                overflow: 'hidden',
                shadowColor: C.ink,
                shadowOffset: { width: 2, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 2,
              }}
            >
              {/* Video area */}
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#0C1C22',
                  aspectRatio: 16 / 9,
                  width: '100%',
                }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'InstrumentSerif_400Regular',
                      fontSize: 10,
                      color: '#FFFFFF',
                    }}
                  >
                    15s · loop
                  </Text>
                </View>

                <View
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: '#E36414',
                    borderRadius: 4,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                  }}
                >
                  <Text
                    style={{ fontSize: 10, fontWeight: '700', color: '#FFFFFF' }}
                  >
                    NEW
                  </Text>
                </View>

                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.8)',
                    backgroundColor: 'transparent',
                  }}
                >
                  <Text
                    style={{ fontSize: 18, color: '#FFFFFF', marginLeft: 3 }}
                  >
                    ▶
                  </Text>
                </View>
              </View>

              <View style={{ padding: 14 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: '600', color: '#1A2A30' }}
                >
                  {continueLesson?.title ?? 'Pick a lesson to begin'}
                </Text>
                <Text
                  style={{
                    fontFamily: 'Caveat_400Regular',
                    fontSize: 16,
                    // Marco's line is clay in the design, not warm grey.
                    color: C.clay,
                    marginTop: 2,
                  }}
                >
                  {lessonQuote}
                </Text>
              </View>
            </Pressable>

            {/* Quick tiles */}
            <View
              style={{ flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, gap: 10 }}
            >
              <Pressable
                onPress={() => router.push('/(tabs)/lessons')}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.4,
                  borderColor: C.ink,
                  borderRadius: 14,
                  height: 90,
                  padding: 12,
                  ...tileShadow,
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    color: '#1A2A30',
                    marginBottom: 8,
                  }}
                >
                  ▰
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: '600', color: '#1A2A30' }}
                >
                  Lessons
                </Text>
                <Text
                  style={{ fontSize: 11, color: '#8A8074', marginTop: 2 }}
                >
                  {completedCount} / {totalCount}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/(tabs)/chat')}
                style={{
                  flex: 1,
                  backgroundColor: C.clay,
                  borderWidth: 1.4,
                  borderColor: C.ink,
                  borderRadius: 14,
                  height: 90,
                  padding: 12,
                  ...tileShadow,
                }}
              >
                <Text
                  style={{ fontSize: 20, color: '#FFFFFF', marginBottom: 8 }}
                >
                  ✺
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}
                >
                  Ask Marco
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.8)',
                    marginTop: 2,
                  }}
                >
                  2 unread
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  router.push(
                    (examAttempt ? '/exam/results' : '/exam') as never,
                  )
                }
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.4,
                  borderColor: C.ink,
                  borderRadius: 14,
                  height: 90,
                  padding: 12,
                  ...tileShadow,
                }}
              >
                <Text
                  style={{ fontSize: 20, color: '#1A2A30', marginBottom: 8 }}
                >
                  ?
                </Text>
                <Text
                  style={{ fontSize: 13, fontWeight: '600', color: '#1A2A30' }}
                >
                  Rules exam
                </Text>
                <Text
                  style={{ fontSize: 11, color: '#8A8074', marginTop: 2 }}
                >
                  {examAttempt
                    ? `${examAttempt.score} / ${examAttempt.total}`
                    : 'not taken'}
                </Text>
              </Pressable>
            </View>

            {/* Match preparation */}
            <MatchPreparationCard
              prep={upcomingPrep}
              onAdjust={() => upcomingPrep && setAdjustingPrep(upcomingPrep)}
              onPastPreps={() => router.push('/match-preparation')}
            />
          </>
        )}
      </ScrollView>

      <PreparationSheet
        preparation={adjustingPrep}
        onClose={() => setAdjustingPrep(null)}
      />
    </SafeAreaView>
  );
}

type MatchPreparationCardProps = {
  prep: MatchPreparation | null;
  onAdjust: () => void;
  onPastPreps: () => void;
};

function MatchPreparationCard({ prep, onAdjust, onPastPreps }: MatchPreparationCardProps) {
  if (!prep) {
    return (
      <DashedBox
        radius={16}
        color={C.stone}
        background={C.card}
        style={{
          marginHorizontal: 20,
          marginBottom: 24,
          padding: 16,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: C.ink,
            marginBottom: 6,
          }}
        >
          Match preparation
        </Text>
        <Text
          style={{
            fontFamily: F.serif,
            fontSize: 18,
            color: C.ink,
            marginBottom: 12,
          }}
        >
          No prep on the calendar yet.
        </Text>
        <Pressable
          onPress={onPastPreps}
          style={{
            alignSelf: 'flex-start',
            backgroundColor: C.ink,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
            Plan a match ›
          </Text>
        </Pressable>
      </DashedBox>
    );
  }

  const done = prep.drills.filter((d) => d.completed).length;
  const total = prep.drills.length;
  const pct = prep.preparation_pct;
  const opponents =
    prep.opponents.length > 0 ? `vs ${prep.opponents.join(' & ')}` : 'Match prep';
  const courtLine = [formatPrepTime(prep.scheduled_at), prep.court ?? '']
    .filter(Boolean)
    .join(' · ');
  const remaining = total - done;
  const planNote =
    prep.note?.trim() ||
    (remaining > 0
      ? `${remaining === 1 ? 'One more drill' : `${remaining} more drills`} before the match.`
      : 'Queue complete — ready to play.');

  return (
    <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
      {/* Header — sits above the card in the design, as a muted kicker */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1.1,
            color: C.mute,
          }}
        >
          MATCH READINESS
        </Text>
        <Text
          style={{
            fontFamily: F.mono,
            fontSize: 11,
            letterSpacing: 0.66,
            color: C.mute,
          }}
        >
          {formatNextLabel(prep.scheduled_at)}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: C.card,
          borderRadius: 14,
          // Design uses the solid sticker treatment here, not a dashed hairline.
          borderWidth: 1.4,
          borderColor: C.ink,
          padding: 16,
          ...tileShadow,
        }}
      >

      {/* Match info row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: C.clay,
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: '#FFFFFF',
              letterSpacing: 0.66,
            }}
          >
            PREP
          </Text>
        </View>
        <Text
          style={{ fontFamily: F.serif, fontSize: 18, color: C.ink, flex: 1 }}
          numberOfLines={1}
        >
          {opponents}
        </Text>
        {courtLine ? (
          <Text
            style={{
              fontFamily: F.mono,
              fontSize: 10,
              color: C.mute,
              letterSpacing: 0.3,
            }}
          >
            {courtLine}
          </Text>
        ) : null}
      </View>

      {/* Progress label */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.mute }}>
          {done}/{total} drills
        </Text>
        <Text
          style={{
            fontFamily: F.monoBold,
            fontSize: 11,
            fontWeight: '700',
            color: C.ink,
          }}
        >
          {pct}% ready
        </Text>
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 4,
          borderRadius: 99,
          marginBottom: 14,
          backgroundColor: C.stone,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 4,
            backgroundColor: C.clay,
            width: `${Math.max(0, Math.min(100, pct))}%`,
          }}
        />
      </View>

      {/* Drill list */}
      {prep.drills.map((d) => (
        <PrepQueueItem
          key={d.id}
          label={d.title}
          duration={formatDrillDuration(d.duration_seconds)}
          done={d.completed}
        />
      ))}

      {/* Marco's plan callout */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 4,
          marginBottom: 12,
          // Teal with the sticker treatment, same as the greeting card — this
          // was also rendering in flat ink with no outline or offset.
          backgroundColor: C.teal,
          borderWidth: 1.4,
          borderColor: C.ink,
          borderRadius: 12,
          paddingVertical: 8,
          paddingHorizontal: 10,
          gap: 9,
          ...stickerShadowSm,
        }}
      >
        <MarcoAvatar size={30} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              fontWeight: '700',
              letterSpacing: 0.66,
              color: '#FFFFFF',
              opacity: 0.7,
              marginBottom: 2,
            }}
          >
            MARCO&apos;S PLAN
          </Text>
          <Text
            style={{
              fontFamily: F.hand,
              fontSize: 16,
              color: '#FFFFFF',
              lineHeight: 20,
            }}
          >
            &ldquo;{planNote}&rdquo;
          </Text>
        </View>
      </View>

        {/* Actions — separated by a dashed rule in the design. Drawn with SVG:
            RN ignores `borderStyle: 'dashed'` on a top-only border. */}
        <DashedRule color={C.stone} marginTop={10} marginBottom={10} />
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <Pressable
            onPress={onAdjust}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.card,
              borderWidth: 1.2,
              borderColor: C.ink,
              borderRadius: 10,
              paddingVertical: 10,
              gap: 6,
              ...stickerShadowSm,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.clay }}>
              ✎
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.ink }}>
              Adjust queue
            </Text>
          </Pressable>
          <Pressable
            onPress={onPastPreps}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: C.ink,
              borderWidth: 1.2,
              borderColor: C.ink,
              borderRadius: 10,
              paddingVertical: 10,
              gap: 6,
              ...stickerShadowSm,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>
              Past preps
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>
              ›
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type PrepQueueItemProps = {
  label: string;
  duration: string;
  done: boolean;
};

function PrepQueueItem({ label, duration, done }: PrepQueueItemProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
          borderRadius: 4,
          backgroundColor: done ? C.teal : '#FFFFFF',
          borderWidth: done ? 0 : 1.5,
          borderColor: C.stone,
        }}
      >
        {done ? (
          <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFFFFF' }}>
            ✓
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 12.5,
          fontWeight: '500',
          color: done ? C.mute : C.ink,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: F.mono,
          fontSize: 10,
          color: C.mute,
          letterSpacing: 0.3,
        }}
      >
        {duration}
      </Text>
    </View>
  );
}

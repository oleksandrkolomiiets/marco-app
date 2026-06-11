import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { PreparationSheet } from '@/components/preparation/PreparationSheet';
import {
  preparationColors as C,
  preparationFonts as F,
} from '@/components/preparation/theme';
import { useUser } from '@/hooks/useUser';
import { useLessons } from '@/hooks/useLessons';
import { useLatestExamAttempt } from '@/hooks/useExam';
import { useMatchPreparation } from '@/hooks/usePreparation';
import type { Lesson, MatchPreparation } from '@/types/api';

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
    <SafeAreaView edges={['top']} className="flex-1" style={{ backgroundColor: '#FAF8F5' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Top nav */}
        <View
          className="flex-row items-center justify-between"
          style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 }}
        >
          <Text
            style={{
              fontFamily: 'Caveat_400Regular',
              fontSize: 22,
              color: '#E36414',
            }}
          >
            marco
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            className="items-center justify-center"
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: 'rgba(26,42,48,0.15)',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A2A30' }}>
              {initial}
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={{ paddingHorizontal: 16 }}>
            <SkeletonCard height={90} />
            <SkeletonCard height={200} />
            <View className="flex-row" style={{ gap: 10 }}>
              <View className="flex-1">
                <SkeletonCard height={90} />
              </View>
              <View className="flex-1">
                <SkeletonCard height={90} />
              </View>
              <View className="flex-1">
                <SkeletonCard height={90} />
              </View>
            </View>
            <SkeletonCard height={150} />
          </View>
        ) : (
          <>
            {/* Greeting card */}
            <View
              className="flex-row items-start"
              style={{
                marginHorizontal: 16,
                marginBottom: 20,
                backgroundColor: '#1A2A30',
                borderRadius: 16,
                padding: 16,
                gap: 14,
              }}
            >
              <View style={{ marginTop: 2 }}>
                <MarcoAvatar size={52} />
              </View>
              <View className="flex-1">
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
                marginBottom: 10,
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 1.1,
                color: '#1A2A30',
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
                marginHorizontal: 16,
                marginBottom: 20,
                backgroundColor: '#FEFBF5',
                borderRadius: 16,
                borderWidth: 1,
                borderColor: 'rgba(26,42,48,0.1)',
                overflow: 'hidden',
              }}
            >
              {/* Video area */}
              <View
                className="items-center justify-center"
                style={{
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
                  className="items-center justify-center"
                  style={{
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
                    color: '#8A8074',
                    marginTop: 4,
                  }}
                >
                  {lessonQuote}
                </Text>
              </View>
            </Pressable>

            {/* Quick tiles */}
            <View
              className="flex-row"
              style={{ marginHorizontal: 16, marginBottom: 20, gap: 10 }}
            >
              <Pressable
                onPress={() => router.push('/(tabs)/lessons')}
                className="flex-1"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: 'rgba(26,42,48,0.1)',
                  borderRadius: 14,
                  height: 90,
                  padding: 12,
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
                className="flex-1"
                style={{
                  backgroundColor: '#E36414',
                  borderRadius: 14,
                  height: 90,
                  padding: 12,
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
                className="flex-1"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: 'rgba(26,42,48,0.1)',
                  borderRadius: 14,
                  height: 90,
                  padding: 12,
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
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 24,
          backgroundColor: C.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: C.inkSoft,
          borderStyle: 'dashed',
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
      </View>
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
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 24,
        backgroundColor: C.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.inkSoft,
        borderStyle: 'dashed',
        padding: 16,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink }}>
          Match preparation
        </Text>
        <Text
          style={{
            fontFamily: F.mono,
            fontSize: 11,
            letterSpacing: 0.4,
            color: C.mute,
          }}
        >
          {formatNextLabel(prep.scheduled_at)}
        </Text>
      </View>

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
          backgroundColor: C.ink,
          borderRadius: 12,
          padding: 12,
          gap: 10,
        }}
      >
        <MarcoAvatar size={32} />
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

      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={onAdjust}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: C.paper,
            borderWidth: 1,
            borderColor: C.inkSoft,
            borderRadius: 10,
            paddingVertical: 10,
            gap: 6,
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
            borderRadius: 10,
            paddingVertical: 10,
            gap: 6,
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

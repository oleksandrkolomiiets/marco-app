import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CreatePreparationForm } from '@/components/preparation/CreatePreparationForm';
import { PreparationSheet } from '@/components/preparation/PreparationSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { preparationColors as C, preparationFonts as F, stickerShadow, stickerShadowSm } from '@/components/preparation/theme';
import {
  computePreparationStats,
  preparationHeadline,
  useMatchPreparation,
  useUpdateMatchPreparation,
} from '@/hooks/usePreparation';
import { useMatches } from '@/hooks/useMatches';
import type { MatchLog, MatchPreparation } from '@/types/api';

const WEEKDAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

const formatRowDate = (iso: string): string => {
  const d = new Date(iso);
  const wd = WEEKDAY_SHORT[d.getUTCDay()] ?? '';
  const mo = MONTH_SHORT[d.getUTCMonth()] ?? '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${wd} ${day} ${mo}`;
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

type FilterKey = 'all' | 'upcoming' | 'done' | 'worked';

export default function MatchPreparationScreen() {
  const router = useRouter();
  const { data: items = [], isLoading } = useMatchPreparation();
  const { data: matches = [] } = useMatches();
  const updatePreparation = useUpdateMatchPreparation();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const stats = useMemo(() => computePreparationStats(items, 30), [items]);

  // Look up the linked match log when a preparation is tied to one — so past
  // rows can render a real W/L tile and a score subtitle.
  const matchesById = useMemo(() => {
    const m = new Map<string, MatchLog>();
    for (const log of matches) m.set(log.id, log);
    return m;
  }, [matches]);

  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const up: MatchPreparation[] = [];
    const pa: MatchPreparation[] = [];
    for (const r of items) {
      // played_at is the explicit "done" signal. When it's set, the prep
      // belongs in "Last matches" regardless of when it was scheduled —
      // covers early playthroughs and reschedules.
      const isPlayed = r.played_at !== null;
      const isUpcoming = !isPlayed && new Date(r.scheduled_at).getTime() >= now;
      if (isUpcoming) up.push(r);
      else pa.push(r);
    }
    up.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    pa.sort((a, b) => {
      const aKey = a.played_at ?? a.scheduled_at;
      const bKey = b.played_at ?? b.scheduled_at;
      return new Date(bKey).getTime() - new Date(aKey).getTime();
    });
    return { upcoming: up, past: pa };
  }, [items, now]);

  const filteredUpcoming = filter === 'done' || filter === 'worked' ? [] : upcoming;
  const filteredPast = useMemo(() => {
    switch (filter) {
      case 'upcoming':
        return [];
      case 'done':
        return past;
      case 'worked':
        return past.filter((r) => r.plan_grade === 'worked');
      default:
        return past;
    }
  }, [filter, past]);

  const editing = useMemo(
    () => items.find((r) => r.id === editingId) ?? null,
    [items, editingId],
  );

  const [gradeError, setGradeError] = useState(false);

  const setGrade = (id: string, grade: 'worked' | 'mixed' | 'missed' | '') => {
    setGradeError(false);
    updatePreparation.mutate(
      { id, data: { plan_grade: grade } },
      { onError: () => setGradeError(true) },
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: C.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ fontSize: 22, color: C.ink }}>←</Text>
        </Pressable>
        <Text
          style={{
            fontFamily: F.serif,
            fontSize: 22,
            color: C.ink,
          }}
        >
          Match preparation
        </Text>
        <Pressable
          onPress={() => setShowCreate(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Create match preparation"
        >
          <Text style={{ fontSize: 22, fontWeight: '700', color: C.clay }}>＋</Text>
        </Pressable>
      </View>

      {gradeError && (
        <ErrorBanner
          message="Couldn't save the plan grade."
          onDismiss={() => setGradeError(false)}
        />
      )}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {isLoading ? (
          <>
            <SkeletonCard height={92} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <SkeletonCard height={32} width={56} />
              <SkeletonCard height={32} width={84} />
              <SkeletonCard height={32} width={64} />
              <SkeletonCard height={32} width={96} />
            </View>
            <View style={{ marginTop: 16 }}>
              <SkeletonCard height={92} />
              <SkeletonCard height={92} />
            </View>
          </>
        ) : (
          <>
            <StatsHeader stats={stats} />
            <Filters value={filter} onChange={setFilter} />

            {filteredUpcoming.length > 0 ? (
              <SectionHeader label="Upcoming" count={filteredUpcoming.length} />
            ) : null}
            <View style={{ gap: 12 }}>
              {filteredUpcoming.map((r) => (
                <PrepRow
                  key={r.id}
                  preparation={r}
                  upcoming
                  onPress={() => setEditingId(r.id)}
                />
              ))}
            </View>

            {filteredPast.length > 0 ? (
              <SectionHeader label="Last matches" count={filteredPast.length} />
            ) : null}
            <View style={{ gap: 12 }}>
              {filteredPast.map((r) => (
                <PrepRow
                  key={r.id}
                  preparation={r}
                  upcoming={false}
                  match={r.match_log_id ? matchesById.get(r.match_log_id) ?? null : null}
                  onPress={() => setEditingId(r.id)}
                  onSetGrade={(g) => setGrade(r.id, g)}
                />
              ))}
            </View>

            {filteredUpcoming.length === 0 && filteredPast.length === 0 ? (
              <EmptyState
                onCreate={() => setShowCreate(true)}
                filtered={items.length > 0}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      <CreatePreparationForm
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(r) => setEditingId(r.id)}
      />

      <PreparationSheet preparation={editing} onClose={() => setEditingId(null)} />
    </SafeAreaView>
  );
}

const StatsHeader = ({ stats }: { stats: ReturnType<typeof computePreparationStats> }) => {
  const tagline =
    stats.planGraded > 0
      ? `"Full prep, full result. ${stats.planWorked} / ${stats.planGraded}."`
      : '"Build a queue, grade the result."';
  return (
    <View
      style={[
        {
          backgroundColor: C.paper,
          borderRadius: 18,
          padding: 16,
          marginTop: 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
        },
        stickerShadow,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.monoBold, fontSize: 11, color: C.mute, letterSpacing: 0.8 }}>
          {stats.preps} {stats.preps === 1 ? 'PREP' : 'PREPS'} · LAST 30 DAYS
        </Text>
        <Text
          style={{
            fontFamily: F.hand,
            fontSize: 19,
            color: C.clay,
            marginTop: 4,
            lineHeight: 22,
          }}
        >
          {tagline}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            fontFamily: F.serif,
            fontSize: 30,
            color: C.teal,
            lineHeight: 32,
          }}
        >
          {/* An average over nothing is not 0% — with no preps in the window
              computePreparationStats returns 0 and this read "0% AVG READY"
              to someone who had never planned a match. Same call as the
              profile's win rate. */}
          {stats.preps > 0 ? `${stats.avgPreparation}%` : '—'}
        </Text>
        <Text
          style={{
            fontFamily: F.mono,
            fontSize: 9,
            color: C.mute,
            letterSpacing: 0.6,
            marginTop: 2,
          }}
        >
          AVG READY
        </Text>
      </View>
    </View>
  );
};

const Filters = ({
  value,
  onChange,
}: {
  value: FilterKey;
  onChange: (next: FilterKey) => void;
}) => (
  <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
    <Chip label="All" active={value === 'all'} onPress={() => onChange('all')} />
    <Chip label="Upcoming" active={value === 'upcoming'} onPress={() => onChange('upcoming')} />
    <Chip label="Done" active={value === 'done'} onPress={() => onChange('done')} />
    <Chip label="Plan worked" active={value === 'worked'} onPress={() => onChange('worked')} />
  </View>
);

const Chip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={{
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: active ? C.ink : 'transparent',
      borderWidth: 1,
      borderColor: active ? C.ink : C.stone,
    }}
  >
    <Text
      style={{
        fontSize: active ? 12 : 12,
        fontWeight: active ? '700' : '500',
        color: active ? '#FFFFFF' : C.mute,
      }}
    >
      {label}
    </Text>
  </Pressable>
);

const SectionHeader = ({ label, count }: { label: string; count: number }) => (
  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 22, marginBottom: 10 }}>
    <Text
      style={{
        fontFamily: F.monoBold,
        fontSize: 10,
        color: C.ink,
        letterSpacing: 1,
      }}
    >
      {label.toUpperCase()} ·
    </Text>
    <Text style={{ fontFamily: F.serif, fontSize: 18, color: C.ink, lineHeight: 18 }}>
      {count}
    </Text>
  </View>
);

type PrepRowProps = {
  preparation: MatchPreparation;
  upcoming: boolean;
  match?: MatchLog | null;
  onPress: () => void;
  onSetGrade?: (grade: 'worked' | 'mixed' | 'missed' | '') => void;
};

const PrepRow = ({ preparation, upcoming, match, onPress, onSetGrade }: PrepRowProps) => {
  const done = preparation.drills.filter((d) => d.completed).length;
  const total = preparation.drills.length;
  const headline = preparationHeadline(preparation.opponents);

  // Past rows show W or L based on the linked match log's result. No link →
  // we still render a neutral white tile rather than the clay PREP one.
  const result = match?.result ?? null;
  const isWin = result === 'won';
  const isLoss = result === 'lost';

  const tileBg = upcoming ? C.clay : isWin ? C.teal : C.card;
  const tileFg = upcoming ? '#FFFFFF' : isWin ? '#FFFFFF' : C.ink;
  const tileLabel = upcoming ? 'PREP' : isWin ? 'W' : isLoss ? 'L' : '—';
  const tileLabelFont = upcoming ? F.mono : F.serif;
  const tileLabelSize = upcoming ? 11 : 22;
  const tileLabelWeight = upcoming ? ('700' as const) : ('400' as const);
  const tileLabelSpacing = upcoming ? 0.66 : 0;

  return (
    <Pressable
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: 12,
          backgroundColor: C.card,
          borderRadius: 14,
          borderWidth: 1.4,
          borderColor: C.ink,
          padding: 12,
        },
        stickerShadow,
      ]}
    >
      <View
        style={{
          width: 56,
          borderRadius: 10,
          backgroundColor: tileBg,
          // The PREP / W / L tile keeps its ink outline in every state — the
          // design never drops it on the filled variants.
          borderWidth: 1.2,
          borderColor: C.ink,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 8,
        }}
      >
        <Text
          style={{
            fontFamily: tileLabelFont,
            fontSize: tileLabelSize,
            fontWeight: tileLabelWeight,
            color: tileFg,
            letterSpacing: tileLabelSpacing,
          }}
        >
          {tileLabel}
        </Text>
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          {headline.vs ? (
            <Text style={{ fontFamily: F.mono, fontSize: 13, color: C.mute }}>vs</Text>
          ) : null}
          <Text
            style={{ fontFamily: F.serif, fontSize: 20, color: C.ink, lineHeight: 22 }}
            numberOfLines={1}
          >
            {headline.title}
          </Text>
        </View>

        <Text
          style={{
            fontFamily: F.mono,
            fontSize: 10,
            color: C.mute,
            letterSpacing: 0.4,
            marginTop: 4,
          }}
        >
          {formatRowDate(preparation.scheduled_at)}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <DrillDots done={done} total={total} />
          <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.mute }}>
            {done}
            <Text style={{ color: C.mute }}>/</Text>
            {total} drills
          </Text>

          {upcoming ? (
            <Text style={{ fontFamily: F.mono, fontSize: 11, color: C.mute }}>
              ·{' '}
              <Text style={{ color: C.teal, fontFamily: F.monoBold }}>
                {preparation.preparation_pct}%
              </Text>{' '}
              ready
            </Text>
          ) : match?.note?.trim() ? (
            <Text
              style={{ fontFamily: F.mono, fontSize: 11, color: C.mute }}
              numberOfLines={1}
            >
              · {match.note.trim()}
            </Text>
          ) : null}
        </View>

        {upcoming ? (
          <Text
            style={{
              fontFamily: F.mono,
              fontSize: 11,
              color: C.mute,
              marginTop: 4,
              letterSpacing: 0.2,
            }}
          >
            {formatTime(preparation.scheduled_at)}
            {preparation.court ? ` · ${preparation.court}` : ''}
          </Text>
        ) : onSetGrade ? (
          <GradeTag
            grade={preparation.plan_grade}
            onPress={cycleGrade(preparation.plan_grade, onSetGrade)}
          />
        ) : null}
      </View>

      <Text
        style={{ fontSize: 16, color: C.ink, alignSelf: 'center', paddingHorizontal: 4 }}
      >
        ›
      </Text>
    </Pressable>
  );
};

const cycleGrade = (
  current: MatchPreparation['plan_grade'],
  set: (next: 'worked' | 'mixed' | 'missed' | '') => void,
) => () => {
  if (current === null) set('worked');
  else if (current === 'worked') set('mixed');
  else if (current === 'mixed') set('missed');
  else set('');
};

const GradeTag = ({
  grade,
  onPress,
}: {
  grade: MatchPreparation['plan_grade'];
  onPress: () => void;
}) => {
  let label: string;
  let color: string;
  if (grade === 'worked') {
    label = '↑ plan worked';
    color = C.teal;
  } else if (grade === 'mixed') {
    label = '~ plan mixed';
    color = C.ink;
  } else if (grade === 'missed') {
    label = '↓ plan missed';
    color = C.clay;
  } else {
    label = '+ grade plan';
    color = C.mute;
  }
  return (
    <Pressable onPress={onPress} hitSlop={6} style={{ marginTop: 6, alignSelf: 'flex-start' }}>
      <Text
        style={{
          fontFamily: F.mono,
          fontSize: 10,
          color,
          letterSpacing: 0.6,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const DrillDots = ({ done, total }: { done: number; total: number }) => {
  if (total === 0) return null;
  const capped = Math.min(total, 6);
  const dots: { filled: boolean }[] = [];
  for (let i = 0; i < capped; i += 1) {
    dots.push({ filled: i < done });
  }
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {dots.map((dot, i) => (
        <View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: dot.filled ? C.teal : 'transparent',
            borderWidth: 1.2,
            borderColor: C.teal,
          }}
        />
      ))}
    </View>
  );
};

// `filtered` distinguishes "you have no preps" from "this filter matches none
// of the preps you do have" — announcing "No preps yet." to someone looking at
// the Upcoming tab with three past preps behind it is simply false.
const EmptyState = ({
  onCreate,
  filtered,
}: {
  onCreate: () => void;
  filtered: boolean;
}) => (
  <View
    style={[
      {
        marginTop: 28,
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.ink,
        backgroundColor: C.card,
        alignItems: 'center',
      },
      stickerShadowSm,
    ]}
  >
    <Text style={{ fontFamily: F.serif, fontSize: 22, color: C.ink, textAlign: 'center' }}>
      {filtered ? 'Nothing in this view.' : 'No preps yet.'}
    </Text>
    <Text
      style={{
        fontFamily: F.hand,
        fontSize: 18,
        color: C.clay,
        textAlign: 'center',
        marginTop: 6,
        marginBottom: 16,
      }}
    >
      {/* Not the header's slogan again. With no preps the strip above already
          says "Build a queue, grade the result." in the same hand and the same
          clay, 300pt up the screen; repeating it here read like a glitch.
          An empty state should say what the thing is instead. */}
      {filtered
        ? 'Try another filter — or plan the next one.'
        : '"Queue your drills before the match."'}
    </Text>
    <Pressable
      onPress={onCreate}
      style={[
        {
          paddingHorizontal: 18,
          paddingVertical: 12,
          backgroundColor: C.teal,
          borderRadius: 12,
        },
        stickerShadowSm,
      ]}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>＋ New prep</Text>
    </Pressable>
  </View>
);

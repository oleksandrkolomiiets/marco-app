import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { MatchLogForm } from '@/components/chat/MatchLogForm';
import { MatchDetailSheet } from '@/components/matches/MatchDetailSheet';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { computeMatchStats, matchesQueryKey, useMatches } from '@/hooks/useMatches';
import type { MatchLog } from '@/types/api';

// Hard 2x2 ink offset — `box-shadow: 2px 2px 0` on the match rows and the
// summary strip in the design.
const hardShadowSm = {
  shadowColor: '#1A2A30',
  shadowOffset: { width: 2, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 2,
} as const;

const COLORS = {
  bg: '#FAF8F5',
  card: '#FFFFFF',
  cardTinted: '#F5EFE3',
  cream: '#FEFBF5',
  ink: '#1A2A30',
  mute: '#4A5560',
  border: 'rgba(26,42,48,0.12)',
  stone: '#C7BFB2',
  teal: '#0F4C5C',
  orange: '#E36414',
  white: '#FFFFFF',
};

const WEEKDAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTH_SHORT = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

const formatMatchDate = (iso: string): string => {
  const d = new Date(iso);
  const wd = WEEKDAY_SHORT[d.getUTCDay()] ?? '';
  const mo = MONTH_SHORT[d.getUTCMonth()] ?? '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${wd} ${day} ${mo}`;
};

type FilterKey = 'all' | 'wins' | 'losses' | 'partner';

export default function MatchesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ match?: string | string[] }>();
  const deepLinkMatchId = useMemo(() => {
    const raw = params.match;
    if (Array.isArray(raw)) return raw[0] ?? null;
    return typeof raw === 'string' && raw.length > 0 ? raw : null;
  }, [params.match]);

  const { data: matches = [], isLoading } = useMatches();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<MatchLog | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  // Honour `/matches?match=<id>` deep links from the preparation sheet's
  // "Open log ›" affordance. Wait until matches load so the detail sheet has
  // something to show, then drop the query param so back navigation doesn't
  // re-open it.
  useEffect(() => {
    if (!deepLinkMatchId) return;
    if (matches.length === 0) return;
    if (!matches.some((m) => m.id === deepLinkMatchId)) return;
    setSelectedMatchId(deepLinkMatchId);
    router.setParams({ match: '' });
  }, [deepLinkMatchId, matches, router]);

  const stats30d = useMemo(() => computeMatchStats(matches, 30), [matches]);

  const topPartner = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) {
      if (!m.partner_name) continue;
      counts.set(m.partner_name, (counts.get(m.partner_name) ?? 0) + 1);
    }
    let best: { name: string; count: number } | null = null;
    for (const [name, count] of counts) {
      if (!best || count > best.count) best = { name, count };
    }
    return best?.name ?? null;
  }, [matches]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'wins':
        return matches.filter((m) => m.result === 'won');
      case 'losses':
        return matches.filter((m) => m.result === 'lost');
      case 'partner':
        return topPartner
          ? matches.filter((m) => m.partner_name === topPartner)
          : matches;
      default:
        return matches;
    }
  }, [matches, filter, topPartner]);

  const selectedMatch = useMemo(
    () => matches.find((m) => m.id === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  );
  const selectedMatchNumber = useMemo(() => {
    if (!selectedMatch) return null;
    const chronological = [...matches].reverse();
    const idx = chronological.findIndex((m) => m.id === selectedMatch.id);
    return idx === -1 ? null : idx + 1;
  }, [matches, selectedMatch]);
  const selectedPartnerIsUsual =
    selectedMatch?.partner_name != null &&
    selectedMatch.partner_name === topPartner;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.bg }}>
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
          <Text style={{ fontSize: 22, color: COLORS.ink }}>←</Text>
        </Pressable>
        <Text
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 20,
            fontWeight: '700',
            color: COLORS.ink,
          }}
        >
          Matches logged
        </Text>
        <Pressable
          onPress={() => setShowMatchForm(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Log a match"
        >
          <Text style={{ fontSize: 22, color: COLORS.orange }}>+</Text>
        </Pressable>
      </View>

      <MatchLogForm
        visible={showMatchForm || editingMatch !== null}
        editMatch={editingMatch}
        onClose={() => {
          setShowMatchForm(false);
          setEditingMatch(null);
        }}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: matchesQueryKey });
        }}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {isLoading ? (
          <>
            <SkeletonCard height={86} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <SkeletonCard height={32} width={56} />
              <SkeletonCard height={32} width={64} />
              <SkeletonCard height={32} width={76} />
              <SkeletonCard height={32} width={96} />
            </View>
            <View style={{ marginTop: 16 }}>
              <SkeletonCard height={68} />
              <SkeletonCard height={68} />
              <SkeletonCard height={68} />
            </View>
          </>
        ) : (
          <>
            <StatsHeader stats={stats30d} />
            <Filters
              value={filter}
              onChange={setFilter}
              topPartner={topPartner}
            />
            {filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <View style={{ marginTop: 12, gap: 10 }}>
                {filtered.map((m) => (
                  <MatchRow
                    key={m.id}
                    match={m}
                    onPress={() => setSelectedMatchId(m.id)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <MatchDetailSheet
        match={selectedMatch}
        matchNumber={selectedMatchNumber}
        isUsualPartner={selectedPartnerIsUsual}
        onClose={() => setSelectedMatchId(null)}
        onAskMarco={() => {
          setSelectedMatchId(null);
          router.push('/(tabs)/chat');
        }}
        onEdit={() => {
          if (!selectedMatch) return;
          const target = selectedMatch;
          setSelectedMatchId(null);
          setEditingMatch(target);
        }}
      />
    </SafeAreaView>
  );
}

type StatsHeaderProps = {
  stats: ReturnType<typeof computeMatchStats>;
};

const StatsHeader = ({ stats }: StatsHeaderProps) => {
  const record = `${stats.wins}-${stats.losses}`;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        // Cream with the sticker treatment, per the design's summary strip.
        backgroundColor: COLORS.cream,
        borderWidth: 1.4,
        borderColor: COLORS.ink,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        ...hardShadowSm,
      }}
    >
      {/* This was an empty placeholder circle — the design puts Marco here. */}
      <MarcoAvatar size={42} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}>
          {stats.total} matches · last 30 days
        </Text>
        <Text
          style={{
            fontFamily: 'Caveat_400Regular',
            fontSize: 16,
            color: COLORS.orange,
            marginTop: 2,
          }}
        >
          {record} record.
        </Text>
      </View>
      <Text
        style={{
          fontFamily: 'InstrumentSerif_400Regular',
          fontSize: 28,
          color: COLORS.teal,
          fontWeight: '700',
        }}
      >
        {stats.winRatePercent}%
      </Text>
    </View>
  );
};

type FiltersProps = {
  value: FilterKey;
  onChange: (next: FilterKey) => void;
  topPartner: string | null;
};

const Filters = ({ value, onChange, topPartner }: FiltersProps) => {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
      <Chip label="All" active={value === 'all'} onPress={() => onChange('all')} />
      <Chip label="Wins" active={value === 'wins'} onPress={() => onChange('wins')} />
      <Chip label="Losses" active={value === 'losses'} onPress={() => onChange('losses')} />
      {topPartner ? (
        <Chip
          label={`w/ ${topPartner}`}
          active={value === 'partner'}
          onPress={() => onChange('partner')}
        />
      ) : null}
    </View>
  );
};

type ChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

const Chip = ({ label, active, onPress }: ChipProps) => (
  <Pressable
    onPress={onPress}
    style={{
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      // Inactive chips are transparent on the page in the design, with a warm
      // stone border — not white on a faint hairline.
      backgroundColor: active ? COLORS.ink : 'transparent',
      borderWidth: 1.2,
      borderColor: active ? COLORS.ink : COLORS.stone,
    }}
  >
    <Text
      style={{
        fontSize: 12,
        fontWeight: active ? '700' : '500',
        color: active ? COLORS.white : COLORS.mute,
      }}
    >
      {label}
    </Text>
  </Pressable>
);

const MatchRow = ({ match, onPress }: { match: MatchLog; onPress: () => void }) => {
  const isWin = match.result === 'won';
  const isLoss = match.result === 'lost';
  const badge = isWin ? 'W' : isLoss ? 'L' : '—';
  const badgeColor = isWin ? COLORS.teal : isLoss ? COLORS.orange : COLORS.mute;

  const mainLine = match.note?.trim() || titleFromResult(match.result);
  const subParts: string[] = [];
  if (match.partner_name) subParts.push(`w/ ${match.partner_name}`);
  if (match.opponents.length > 0) subParts.push(`vs ${match.opponents.join(' & ')}`);
  else if (match.feeling) subParts.push(match.feeling);

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        // Design gives each row the sticker treatment: solid ink outline plus
        // a hard 2x2 offset, not a faint 12%-opacity hairline.
        borderWidth: 1.4,
        borderColor: COLORS.ink,
        paddingVertical: 8,
        paddingHorizontal: 12,
        ...hardShadowSm,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          backgroundColor: badgeColor,
          borderWidth: 1.2,
          borderColor: COLORS.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.white }}>{badge}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 15, fontWeight: '700', color: COLORS.ink }}
          numberOfLines={1}
        >
          {mainLine}
        </Text>
        {subParts.length > 0 ? (
          <Text
            style={{ fontSize: 12, color: COLORS.mute, marginTop: 2 }}
            numberOfLines={1}
          >
            {subParts.join(' · ')}
          </Text>
        ) : null}
      </View>
      <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.mute, letterSpacing: 0.6 }}>
        {formatMatchDate(match.played_on)}
      </Text>
    </Pressable>
  );
};

const titleFromResult = (result: string | null): string => {
  if (result === 'won') return 'Won';
  if (result === 'lost') return 'Lost';
  if (result === 'draw') return 'Draw';
  return 'Played';
};

const EmptyState = () => (
  <View
    style={{
      marginTop: 24,
      padding: 24,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.white,
      alignItems: 'center',
    }}
  >
    <Text style={{ fontSize: 14, color: COLORS.mute, textAlign: 'center' }}>
      No matches in this view yet. Log a match with Marco and it&apos;ll show up here.
    </Text>
  </View>
);

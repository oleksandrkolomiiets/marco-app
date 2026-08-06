import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signOut } from '@/api/auth';
import { AchievementDetailSheet } from '@/components/profile/AchievementDetailSheet';
import { HardShadowBox } from '@/components/ui/HardShadowBox';
import { DashedRule } from '@/components/ui/DashedRule';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useAchievements } from '@/hooks/useAchievements';
import { useLessons } from '@/hooks/useLessons';
import { computeMatchStats, formatWinRate, useMatches } from '@/hooks/useMatches';
import { useMatchPreparation } from '@/hooks/usePreparation';
import { useUser } from '@/hooks/useUser';
import { useAuthStore } from '@/stores/authStore';
import type { Achievement, CourtSide, Plan, SkillLevel, User } from '@/types/api';

const COLORS = {
  bg: '#FAF8F5',
  ink: '#1A2A30',
  mute: '#4A5560',
  teal: '#0F4C5C',
  orange: '#E36414',
  white: '#FFFFFF',
  dashed: '#C7BFB2', // warm beige used for the dashed row separators in the design
  cream: '#F3EEE5', // tinted square behind the ✎ icon on the Player settings card
};

const GOAL_LABEL: Record<string, string> = {
  win_matches: 'Win more matches',
  look_competent: 'Look competent',
  pass_exam: 'Pass the rules exam',
  have_fun: 'Have more fun',
  tournament_prep: 'Tournament prep',
};

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

const SKILL_LEVEL_LABEL: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Free',
  premium: 'Premium',
  coach: 'Coach',
};

const COURT_SIDE_LABEL: Record<CourtSide, string> = {
  left: 'Left side',
  right: 'Right side',
  either: 'Either side',
};

const buildSubtitle = (user: User): string => {
  const parts: string[] = [];
  if (user.skill_level) parts.push(SKILL_LEVEL_LABEL[user.skill_level]);
  if (user.court_side) parts.push(COURT_SIDE_LABEL[user.court_side]);
  // No city is ever collected — there is no such column on users — so the
  // hardcoded "Madrid" that used to sit here told every player they lived
  // somewhere they had never said they lived.
  return parts.join(' · ');
};

const formatSince = (createdAt: string): string => {
  const date = new Date(createdAt);
  const month = MONTH_NAMES_LONG[date.getMonth()] ?? '';
  return `since ${month} ${date.getFullYear()}`;
};

const getInitial = (name: string | null): string => {
  if (!name) return '?';
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : '?';
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isLoading: isUserLoading } = useUser();
  const { data: lessons = [], isLoading: areLessonsLoading } = useLessons();
  const { data: matches = [], isLoading: areMatchesLoading } = useMatches();
  const { data: achievements, isLoading: areAchievementsLoading } = useAchievements();
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // backend invalidation is best-effort; we always clear locally
    }
    clearAuth();
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', "You'll need to sign in again to access Marco.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void handleSignOut();
        },
      },
    ]);
  };

  const isLoading =
    isUserLoading || areLessonsLoading || areMatchesLoading || areAchievementsLoading || !user;

  const mastered = lessons.filter((l) => l.progress === 'mastered').length;
  const learned = lessons.filter(
    (l) => l.progress === 'learned' || l.progress === 'mastered',
  ).length;
  const total = lessons.length;
  const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const matchStats30d = computeMatchStats(matches, 30);
  // The tile sits between two real numbers and used to read a hardcoded "Open"
  // — the same for a player with four preps waiting and one who has never made
  // any. Count the ones still to be played, matching the Home card's wording.
  const { data: preparations = [] } = useMatchPreparation();
  const openPreparations = preparations.filter((p) => p.played_at === null).length;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#FAF8F5' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20 }}>
        {/* Top nav */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 16,
          }}
        >
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular',
              fontSize: 20,
              fontWeight: '700',
              color: '#1A2A30',
            }}
          >
            You
          </Text>
          {/* The ⚙ that used to sit here only ran console.log('Open settings'),
              and the settings it promised are already on this screen — the
              PLAYER SETTINGS section is further down the same scroll. */}
        </View>

        {isLoading ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <SkeletonCard width={64} height={64} />
              <View style={{ flex: 1 }}>
                <SkeletonCard height={20} />
                <SkeletonCard height={14} width="70%" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <SkeletonCard height={72} />
              </View>
              <View style={{ flex: 1 }}>
                <SkeletonCard height={72} />
              </View>
              <View style={{ flex: 1 }}>
                <SkeletonCard height={72} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <SkeletonCard height={72} />
              </View>
              <View style={{ flex: 1 }}>
                <SkeletonCard height={72} />
              </View>
            </View>
            <SkeletonCard height={14} width="40%" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={{ width: '33.333%', paddingHorizontal: 4 }}>
                  <SkeletonCard height={56} />
                </View>
              ))}
            </View>
            <SkeletonCard height={48} />
            <SkeletonCard height={48} />
            <SkeletonCard height={48} />
            <SkeletonCard height={48} />
          </>
        ) : (
          <>
            {/* User profile header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 24,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#0F4C5C',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#FFFFFF' }}>
                  {getInitial(user.display_name)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: '#1A2A30',
                    marginBottom: 2,
                  }}
                >
                  {user.display_name ?? '—'}
                </Text>
                <Text style={{ fontSize: 13, color: '#4A5560', marginBottom: 4 }}>
                  {buildSubtitle(user)}
                </Text>
                <Text
                  style={{ fontFamily: 'Caveat_400Regular', fontSize: 16, color: '#E36414' }}
                >
                  {formatSince(user.created_at)}
                </Text>
              </View>
            </View>

            {/* Stats grid — row 1: 3 tiles, row 2: 2 tiles */}
            <View style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <StatTile label="Lessons mastered" value={String(mastered)} />
                <StatTile label="Lessons learned" value={String(learned)} />
                <StatTile label="Mastery rate" value={`${masteryRate}%`} highlighted />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <StatTile
                  label="Matches logged"
                  value={String(matchStats30d.total)}
                  onPress={() => router.push('/matches')}
                  withChevron
                />
                <StatTile
                  label="Win rate (30d)"
                  value={formatWinRate(matchStats30d)}
                  onPress={() => router.push('/matches')}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <StatTile
                  label="Match prep"
                  value={
                    openPreparations === 0
                      ? 'None open'
                      : `${openPreparations} open`
                  }
                  onPress={() => router.push('/match-preparation' as never)}
                  withChevron
                />
              </View>
            </View>

            {/* Achievements */}
            {achievements && achievements.achievements.length > 0 && (
              <View style={{ marginBottom: 12 }}>
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
                      textTransform: 'uppercase',
                      color: COLORS.mute,
                    }}
                  >
                    Achievements
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'JetBrainsMono_400Regular',
                      fontSize: 11,
                      letterSpacing: 0.66,
                      color: COLORS.mute,
                    }}
                  >
                    {achievements.unlocked} / {achievements.total}
                  </Text>
                </View>
                <HardShadowBox offsetX={2} offsetY={3}>
                  <View
                    style={{
                      padding: 10,
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      rowGap: 8,
                    }}
                  >
                    {achievements.achievements.map((a) => (
                      <AchievementBadge
                        key={a.slug}
                        achievement={a}
                        onPress={() => setSelectedAchievement(a)}
                      />
                    ))}
                  </View>
                </HardShadowBox>
              </View>
            )}

            {/* Player settings */}
            <View style={{ marginBottom: 10 }}>
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1.1,
                  textTransform: 'uppercase',
                  color: COLORS.mute,
                  marginBottom: 6,
                }}
              >
                Player settings
              </Text>
              <HardShadowBox offsetX={2} offsetY={3}>
                <Pressable
                  onPress={() => router.push('/(auth)/onboarding')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      backgroundColor: COLORS.cream,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 16, color: COLORS.ink }}>✎</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink }}>
                      Goal & preferred side
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.mute,
                        marginTop: 1,
                      }}
                    >
                      {[
                        user.goal ? GOAL_LABEL[user.goal] ?? user.goal : null,
                        user.court_side ? COURT_SIDE_LABEL[user.court_side] : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Caveat_400Regular',
                        fontSize: 14,
                        color: COLORS.orange,
                        marginTop: 2,
                      }}
                    >
                      Marco will re-plan your queue
                    </Text>
                  </View>
                  <Text style={{ fontSize: 18, color: COLORS.mute }}>›</Text>
                </Pressable>
              </HardShadowBox>
            </View>

            {/* Settings rows */}
            <View style={{ marginBottom: 8 }}>
              <SettingsRow
                label="Notifications"
                onPress={() => router.push('/notifications')}
              />
              {/* Read the real plan — this was hardcoded to "Premium", so a free
                  account was told it had a subscription while the rest of the
                  app correctly locked premium lessons behind an upgrade. */}
              <SettingsRow
                label={`Subscription · ${PLAN_LABEL[user.plan]}`}
                onPress={() => console.log('Open subscription')}
              />
              <SettingsRow
                label="Connected devices"
                onPress={() => router.push('/devices')}
              />
              <SettingsRow label="Sign out" destructive onPress={confirmSignOut} />
            </View>
          </>
        )}
      </ScrollView>
      <AchievementDetailSheet
        achievement={selectedAchievement}
        onClose={() => setSelectedAchievement(null)}
      />
    </SafeAreaView>
  );
}

type StatTileProps = {
  label: string;
  value: string;
  highlighted?: boolean;
  withChevron?: boolean;
  onPress?: () => void;
};

const StatTile = ({
  label,
  value,
  highlighted = false,
  withChevron = false,
  onPress,
}: StatTileProps) => {
  const numberColor = highlighted ? COLORS.white : COLORS.ink;
  const labelColor = highlighted ? COLORS.white : COLORS.ink;
  const labelOpacity = highlighted ? 0.85 : 0.65;
  const Wrapper = onPress ? Pressable : View;
  return (
    <HardShadowBox
      offsetX={2}
      offsetY={2}
      radius={12}
      background={highlighted ? COLORS.orange : COLORS.white}
      style={{ flex: 1 }}
    >
      <Wrapper
        onPress={onPress}
        style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 }}
      >
        <Text
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 26,
            // Bumped above the font-size — RN clips Instrument Serif ascenders
            // when line-height equals font-size.
            lineHeight: 32,
            color: numberColor,
          }}
        >
          {value}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 2,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              lineHeight: 13,
              color: labelColor,
              opacity: labelOpacity,
            }}
          >
            {label}
          </Text>
          {withChevron ? (
            <Text style={{ fontSize: 16, lineHeight: 16, color: COLORS.mute }}>›</Text>
          ) : null}
        </View>
      </Wrapper>
    </HardShadowBox>
  );
};

type SettingsRowProps = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

const SettingsRow = ({ label, onPress, destructive = false }: SettingsRowProps) => (
  // The separator is a dashed rule drawn with SVG: RN ignores
  // `borderStyle: 'dashed'` on a bottom-only border and drew it solid.
  <View>
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 9,
        paddingHorizontal: 4,
      }}
    >
      <Text style={{ fontSize: 13, color: destructive ? COLORS.orange : COLORS.ink }}>
        {label}
      </Text>
      <Text style={{ fontSize: 13, color: COLORS.mute }}>›</Text>
    </Pressable>
    <DashedRule color={COLORS.dashed} />
  </View>
);

type AchievementBadgeProps = {
  achievement: Achievement;
  onPress: () => void;
};

const ACCENT_BG: Record<Achievement['accent'], string> = {
  teal: COLORS.teal,
  orange: COLORS.orange,
  ink: COLORS.ink,
};

const AchievementBadge = ({ achievement, onPress }: AchievementBadgeProps) => {
  const { unlocked, icon, title, accent } = achievement;
  const tileBg = unlocked ? ACCENT_BG[accent] : COLORS.white;

  return (
    <Pressable onPress={onPress} style={{ width: 60, alignItems: 'center' }}>
      {unlocked ? (
        <HardShadowBox inline offsetX={2} offsetY={2} radius={12} background={tileBg}>
          <View
            style={{
              width: 60,
              height: 60,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: 'InstrumentSerif_400Regular',
                fontSize: 22,
                // Bumped to avoid Instrument Serif top-cropping.
                lineHeight: 28,
                color: COLORS.white,
              }}
            >
              {icon}
            </Text>
          </View>
        </HardShadowBox>
      ) : (
        <View
          style={{
            width: 60,
            height: 60,
            backgroundColor: tileBg,
            opacity: 0.55,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular',
              fontSize: 22,
              lineHeight: 28,
              color: COLORS.mute,
            }}
          >
            {icon}
          </Text>
        </View>
      )}
      <Text
        numberOfLines={2}
        style={{
          fontFamily: 'JetBrainsMono_400Regular',
          fontSize: 8.5,
          lineHeight: 9.775,
          letterSpacing: 0.34,
          textTransform: 'uppercase',
          textAlign: 'center',
          marginTop: 6,
          width: 60,
          color: unlocked ? COLORS.ink : COLORS.mute,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
};

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Line, Rect } from 'react-native-svg';
import { SketchyButton } from '@/components/ui/SketchyButton';
import { SelectableRow } from '@/components/ui/SelectableRow';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { updateMe } from '@/api/users';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/colors';
import type { CourtSide, DominantHand, SkillLevel } from '@/types/api';

type PlayFrequency = 'monthly' | 'biweekly' | 'weekly' | '2-3x_weekly' | '4x_weekly';
type Goal = 'win_matches' | 'look_competent' | 'pass_exam' | 'have_fun' | 'tournament_prep';

type OnboardingData = {
  skill_level: SkillLevel | null;
  play_frequency: PlayFrequency | null;
  dominant_hand: DominantHand | null;
  court_side: CourtSide | null;
  goal: Goal | null;
};

const TOTAL_STEPS = 5;

// Shared question/helper type for every step, matching the prototype's
// OnbScaffold: Instrument Serif 30 over a 14px muted helper line.
const stepStyles = {
  question: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  helper: {
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 8,
    marginBottom: 24,
  },
} as const;

const QUOTES: Record<number, string> = {
  1: "¡Hola! Tell me about you — I'll skip the boring bits.",
  2: 'More court time → faster progress. But not by much.',
  3: 'Tells me which side to demo cues from.',
  4: "Court side shapes 70% of what I'll teach you next.",
  5: "Last one. Then we're on court.",
};

// ── Step 1: Skill level ───────────────────────────────────────────────────────

const SKILL_LEVELS: { value: SkillLevel; title: string; subtitle: string }[] = [
  { value: 'beginner', title: 'Beginner', subtitle: 'Just picked up a racket' },
  { value: 'intermediate', title: 'Intermediate', subtitle: 'Playing weekly, working on basics' },
  { value: 'advanced', title: 'Advanced', subtitle: 'Tournament-ready, refining tactics' },
];

function Step1({
  value,
  onChange,
}: {
  value: SkillLevel | null;
  onChange: (v: SkillLevel) => void;
}) {
  return (
    <View>
      <Text style={stepStyles.question}>How would you rate your padel?</Text>
      <Text style={stepStyles.helper}>Honest is best. We can change this later.</Text>
      <View style={{ gap: 10 }}>
        {SKILL_LEVELS.map((l) => (
          <SelectableRow
            key={l.value}
            label={l.title}
            subtitle={l.subtitle}
            selected={value === l.value}
            onPress={() => onChange(l.value)}
          />
        ))}
      </View>
    </View>
  );
}

// ── Step 2: Play frequency ────────────────────────────────────────────────────

const FREQUENCIES: { value: PlayFrequency; label: string }[] = [
  { value: 'monthly', label: 'Once a month' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'weekly', label: 'Once a week' },
  { value: '2-3x_weekly', label: '2–3× a week' },
  { value: '4x_weekly', label: '4× or more' },
];

function Step2({
  value,
  onChange,
}: {
  value: PlayFrequency | null;
  onChange: (v: PlayFrequency) => void;
}) {
  return (
    <View>
      <Text style={stepStyles.question}>How often do you play?</Text>
      <View style={{ gap: 10, marginTop: 20 }}>
        {FREQUENCIES.map((f) => (
          <SelectableRow
            key={f.value}
            label={f.label}
            selected={value === f.value}
            onPress={() => onChange(f.value)}
            height={50}
          />
        ))}
      </View>
    </View>
  );
}

// ── Step 3: Dominant hand ─────────────────────────────────────────────────────

const HANDS: { value: DominantHand; label: string; emoji: string }[] = [
  { value: 'right', label: 'Right', emoji: '🖐️' },
  { value: 'left', label: 'Left', emoji: '🖐️' },
  { value: 'both', label: 'Both', emoji: '🙌' },
];

function Step3({
  value,
  onChange,
}: {
  value: DominantHand | null;
  onChange: (v: DominantHand) => void;
}) {
  return (
    <View>
      {/* No helper line here — Marco's Caveat quote above already says it. */}
      <Text style={[stepStyles.question, { marginBottom: 24 }]}>Dominant hand?</Text>
      <View style={{ flexDirection: 'row', gap: 14 }}>
        {HANDS.map((h) => (
          <View key={h.value} style={{ flex: 1 }}>
            <SelectableRow
              label={h.label}
              selected={value === h.value}
              onPress={() => onChange(h.value)}
              tone="teal"
              height={120}
              centered
            >
              <Text style={{ fontSize: 36, marginBottom: 8 }}>{h.emoji}</Text>
            </SelectableRow>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Step 4: Court side ────────────────────────────────────────────────────────

function CourtDiagram({ selected }: { selected: CourtSide | null }) {
  // The prototype's CourtMini highlights the chosen half in translucent clay
  // with a dashed clay outline, over ink court lines.
  const leftOn = selected === 'left';
  const rightOn = selected === 'right';
  return (
    <Svg width="100%" height={150} viewBox="0 0 300 150">
      <Rect x={2} y={2} width={146} height={146} fill={leftOn ? colors.clay : 'transparent'} opacity={leftOn ? 0.22 : 0} />
      <Rect x={152} y={2} width={146} height={146} fill={rightOn ? colors.clay : 'transparent'} opacity={rightOn ? 0.22 : 0} />
      <Rect x={1} y={1} width={298} height={148} fill="none" stroke={colors.ink} strokeWidth={1.6} rx={3} />
      <Line x1={149} y1={1} x2={149} y2={149} stroke={colors.ink} strokeWidth={1.4} strokeDasharray="3,3" />
      <Line x1={1} y1={75} x2={299} y2={75} stroke={colors.ink} strokeWidth={1} opacity={0.5} />
      {leftOn ? (
        <Rect x={2} y={2} width={146} height={146} fill="none" stroke={colors.clay} strokeWidth={1.4} strokeDasharray="3,2" />
      ) : null}
      {rightOn ? (
        <Rect x={152} y={2} width={146} height={146} fill="none" stroke={colors.clay} strokeWidth={1.4} strokeDasharray="3,2" />
      ) : null}
    </Svg>
  );
}

function Step4({
  value,
  onChange,
}: {
  value: CourtSide | null;
  onChange: (v: CourtSide) => void;
}) {
  return (
    <View>
      {/* No helper — Marco's quote above already carries this line. */}
      <Text style={[stepStyles.question, { marginBottom: 20 }]}>Which side do you play?</Text>
      <CourtDiagram selected={value} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        {(
          [
            { side: 'left' as CourtSide, label: 'Left (Backhand)' },
            { side: 'right' as CourtSide, label: 'Right (Forehand)' },
          ] as const
        ).map(({ side, label }) => (
          <View key={side} style={{ flex: 1 }}>
            <SelectableRow
              label={label}
              selected={value === side}
              onPress={() => onChange(side)}
              height={48}
              centered
            />
          </View>
        ))}
      </View>
      <Pressable onPress={() => onChange('either')} style={{ alignSelf: 'center', marginTop: 16 }}>
        <Text style={{ fontFamily: 'Caveat_400Regular', fontSize: 18, color: colors.inkSoft }}>
          I switch sometimes →
        </Text>
      </Pressable>
    </View>
  );
}

// ── Step 5: Goal ──────────────────────────────────────────────────────────────

const GOALS: { value: Goal; label: string }[] = [
  { value: 'win_matches', label: 'Win more matches' },
  { value: 'look_competent', label: 'Look less like a beginner' },
  { value: 'pass_exam', label: 'Pass the rules exam' },
  { value: 'have_fun', label: 'Just have fun' },
  { value: 'tournament_prep', label: 'Train for a tournament' },
];

function Step5({ value, onChange }: { value: Goal | null; onChange: (v: Goal) => void }) {
  return (
    <View>
      <Text style={stepStyles.question}>What&apos;s your #1 goal right now?</Text>
      <Text style={stepStyles.helper}>Pick one. Be a little selfish.</Text>
      <View style={{ gap: 10 }}>
        {GOALS.map((g) => (
          <SelectableRow
            key={g.value}
            label={g.label}
            selected={value === g.value}
            onPress={() => onChange(g.value)}
            tone="clay"
            height={50}
          />
        ))}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    skill_level: null,
    play_frequency: null,
    dominant_hand: null,
    court_side: null,
    goal: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue =
    (step === 1 && data.skill_level !== null) ||
    (step === 2 && data.play_frequency !== null) ||
    (step === 3 && data.dominant_hand !== null) ||
    (step === 4 && data.court_side !== null) ||
    (step === 5 && data.goal !== null);

  const persist = async (partial: OnboardingData) => {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, string> = {};
      if (partial.skill_level) payload.skill_level = partial.skill_level;
      if (partial.play_frequency) payload.play_frequency = partial.play_frequency;
      if (partial.dominant_hand) payload.dominant_hand = partial.dominant_hand;
      if (partial.court_side) payload.court_side = partial.court_side;
      if (partial.goal) payload.goal = partial.goal;
      const updated = await updateMe(payload as Parameters<typeof updateMe>[0]);
      setUser(updated);
      router.replace('/');
    } catch {
      setError('Something went wrong. Please try again.');
      setSaving(false);
    }
  };

  const handleContinue = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      void persist(data);
    }
  };

  const handleSkip = () => void persist(data);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 }}>
        <Text style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 13, color: colors.inkSoft }}>
          {step} / {TOTAL_STEPS}
        </Text>
        <Pressable onPress={handleSkip} disabled={saving} hitSlop={12}>
          <Text style={{ fontSize: 13, color: colors.inkSoft }}>Skip</Text>
        </Pressable>
      </View>

      {/* Progress segments */}
      <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 24, marginTop: 18 }}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 3,
              backgroundColor: i < step ? colors.clay : 'rgba(26,42,48,0.15)',
            }}
          />
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Marco quote */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 24 }}>
          <MarcoAvatar size={56} />
          <Text
            style={{
              flex: 1,
              paddingTop: 4,
              fontFamily: 'Caveat_400Regular',
              fontSize: 18,
              lineHeight: 20,
              color: colors.clay,
            }}
          >
            {QUOTES[step]}
          </Text>
        </View>

        {error !== null && (
          <View style={{ marginTop: 16 }}>
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </View>
        )}

        <View style={{ marginTop: 24 }}>
          {step === 1 && (
            <Step1
              value={data.skill_level}
              onChange={(v) => setData((d) => ({ ...d, skill_level: v }))}
            />
          )}
          {step === 2 && (
            <Step2
              value={data.play_frequency}
              onChange={(v) => setData((d) => ({ ...d, play_frequency: v }))}
            />
          )}
          {step === 3 && (
            <Step3
              value={data.dominant_hand}
              onChange={(v) => setData((d) => ({ ...d, dominant_hand: v }))}
            />
          )}
          {step === 4 && (
            <Step4
              value={data.court_side}
              onChange={(v) => setData((d) => ({ ...d, court_side: v }))}
            />
          )}
          {step === 5 && (
            <Step5
              value={data.goal}
              onChange={(v) => setData((d) => ({ ...d, goal: v }))}
            />
          )}
        </View>
      </ScrollView>

      {/* Continue / Finish */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 28 }}>
        <SketchyButton
          label={step === TOTAL_STEPS ? 'Finish' : 'Continue'}
          variant="primary"
          loading={saving}
          disabled={!canContinue}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}

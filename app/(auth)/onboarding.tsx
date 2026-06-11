import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Line, Rect } from 'react-native-svg';
import { Button } from '@/components/ui/Button';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { updateMe } from '@/api/users';
import { useAuthStore } from '@/stores/authStore';
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

const QUOTES: Record<number, string> = {
  1: "We'll tailor coaching to your level.",
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
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 32, color: '#0F4C5C', marginBottom: 4 }}>
        What&apos;s your level?
      </Text>
      <Text style={{ fontSize: 15, color: '#6B7280', marginBottom: 20 }}>
        We&apos;ll tailor Marco&apos;s coaching to you.
      </Text>
      <View style={{ gap: 12 }}>
        {SKILL_LEVELS.map((l) => {
          const active = value === l.value;
          return (
            <Pressable
              key={l.value}
              onPress={() => onChange(l.value)}
              style={{
                padding: 16,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: active ? '#E36414' : '#E5E7EB',
                backgroundColor: active ? '#FCE9DC' : 'white',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: active ? '#E36414' : '#0F4C5C' }}>
                {l.title}
              </Text>
              <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>{l.subtitle}</Text>
            </Pressable>
          );
        })}
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
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 32, color: '#0F4C5C', marginBottom: 20 }}>
        How often do you play?
      </Text>
      <View style={{ gap: 12 }}>
        {FREQUENCIES.map((f) => {
          const active = value === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => onChange(f.value)}
              style={{
                padding: 16,
                borderRadius: 12,
                borderWidth: active ? 2 : 1,
                borderColor: active ? '#0F4C5C' : '#E5E7EB',
                backgroundColor: 'white',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: active ? '600' : '400', color: '#0F4C5C' }}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
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
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 32, color: '#0F4C5C', marginBottom: 24 }}>
        Dominant hand?
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {HANDS.map((h) => {
          const active = value === h.value;
          return (
            <Pressable
              key={h.value}
              onPress={() => onChange(h.value)}
              style={{
                flex: 1,
                paddingVertical: 24,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: active ? '#0F4C5C' : '#E5E7EB',
                backgroundColor: active ? '#0F4C5C' : 'white',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 34 }}>{h.emoji}</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: active ? 'white' : '#0F4C5C' }}>
                {h.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ── Step 4: Court side ────────────────────────────────────────────────────────

function CourtDiagram({ selected }: { selected: CourtSide | null }) {
  const leftFill = selected === 'left' ? '#FAD5BE' : 'white';
  const rightFill = selected === 'right' ? '#FAD5BE' : 'white';
  return (
    <Svg width="100%" height={150} viewBox="0 0 300 150">
      <Rect x={2} y={2} width={146} height={146} fill={leftFill} />
      <Rect x={152} y={2} width={146} height={146} fill={rightFill} />
      <Rect x={1} y={1} width={298} height={148} fill="none" stroke="#D1D5DB" strokeWidth={2} rx={6} />
      <Line x1={149} y1={1} x2={149} y2={149} stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="5,4" />
      <Line x1={1} y1={75} x2={299} y2={75} stroke="#D1D5DB" strokeWidth={1} />
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
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 32, color: '#0F4C5C', marginBottom: 20 }}>
        Which side do you play?
      </Text>
      <CourtDiagram selected={value} />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        {(
          [
            { side: 'left' as CourtSide, label: 'Left (Backhand)' },
            { side: 'right' as CourtSide, label: 'Right (Forehand)' },
          ] as const
        ).map(({ side, label }) => {
          const active = value === side;
          return (
            <Pressable
              key={side}
              onPress={() => onChange(side)}
              style={{
                flex: 1,
                paddingVertical: 14,
                borderRadius: 100,
                borderWidth: active ? 2 : 1,
                borderColor: active ? '#0F4C5C' : '#E5E7EB',
                backgroundColor: active ? '#E6EDEF' : 'white',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F4C5C' }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={() => onChange('either')} style={{ alignSelf: 'center', marginTop: 16 }}>
        <Text style={{ fontFamily: 'Caveat_400Regular', fontSize: 18, color: '#E36414' }}>
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
      <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 32, color: '#0F4C5C', marginBottom: 4 }}>
        What&apos;s your #1 goal right now?
      </Text>
      <Text style={{ fontSize: 15, color: '#6B7280', marginBottom: 20 }}>Pick one. Be a little selfish.</Text>
      <View style={{ gap: 12 }}>
        {GOALS.map((g) => {
          const active = value === g.value;
          return (
            <Pressable
              key={g.value}
              onPress={() => onChange(g.value)}
              style={{
                padding: 16,
                borderRadius: 12,
                borderWidth: active ? 0 : 1,
                borderColor: '#E5E7EB',
                backgroundColor: active ? '#E36414' : 'white',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: active ? 'white' : '#0F4C5C' }}>
                {g.label}
              </Text>
            </Pressable>
          );
        })}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16 }}>
        <Text style={{ fontFamily: 'InstrumentSerif_400Regular', fontSize: 16, color: '#0F4C5C' }}>
          {step} / {TOTAL_STEPS}
        </Text>
        <Pressable onPress={handleSkip} disabled={saving} hitSlop={12}>
          <Text style={{ fontSize: 15, color: '#9CA3AF' }}>Skip</Text>
        </Pressable>
      </View>

      {/* Progress segments */}
      <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 24, marginTop: 10 }}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 99,
              backgroundColor: i < step ? '#E36414' : '#E5E7EB',
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 }}>
          <MarcoAvatar size={40} />
          <Text style={{ fontFamily: 'Caveat_400Regular', fontSize: 18, color: '#E36414', flex: 1 }}>
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
      <View style={{ paddingHorizontal: 24, paddingBottom: 32 }}>
        <Button
          label={saving ? 'Saving…' : step === TOTAL_STEPS ? 'Finish' : 'Continue'}
          disabled={!canContinue || saving}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}

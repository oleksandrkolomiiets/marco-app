import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DIAGRAM_BY_SLUG } from '@/components/exam/ExamDiagrams';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useExamQuestions, useSubmitExamAttempt } from '@/hooks/useExam';
import type { ExamOption, ExamQuestion } from '@/types/api';

const COLORS = {
  bg: '#FAF8F5',
  ink: '#1A2A30',
  mute: '#4A5560',
  stone: '#C7BFB2',
  card: '#FFFFFF',
  cardCream: '#FEFBF5',
  teal: '#0F4C5C',
  orange: '#E36414',
};

// 'ui-monospace' is a CSS generic family — React Native doesn't resolve it, so
// every mono label here was silently falling back to the system font. The app
// loads JetBrains Mono in app/_layout.tsx; use that.
const FONT_MONO = 'JetBrainsMono_400Regular';

// Hard ink offset — `box-shadow: 2px 3px 0` in the design. Applied to the
// selected answer and the footer CTAs.
const hardShadow = {
  shadowColor: COLORS.ink,
  shadowOffset: { width: 2, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 2,
} as const;

export default function ExamScreen() {
  const router = useRouter();
  const { data: questions, isLoading, error } = useExamQuestions();
  const submit = useSubmitExamAttempt();

  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});

  if (isLoading) return <ExamLoading onClose={() => router.back()} />;
  if (error || !questions || questions.length === 0) {
    return <ExamError onClose={() => router.back()} error={error} />;
  }

  const total = questions.length;
  const safeIndex = Math.min(index, total - 1);
  const question = questions[safeIndex];
  if (!question) return null;

  const selectedOptionID = picks[question.id] ?? null;
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === total - 1;
  const canAdvance = selectedOptionID !== null;

  const onPick = (option: ExamOption) => {
    setPicks((p) => ({ ...p, [question.id]: option.id }));
  };

  const onBack = () => {
    if (isFirst) return;
    setIndex((i) => Math.max(0, i - 1));
  };

  const onNext = () => {
    if (!canAdvance) return;
    if (isLast) {
      void onSubmit();
      return;
    }
    setIndex((i) => Math.min(total - 1, i + 1));
  };

  const onSubmit = async () => {
    const answers = questions.map((q) => ({
      question_id: q.id,
      selected_option_id: picks[q.id] ?? null,
    }));
    try {
      await submit.mutateAsync({ answers });
      router.replace('/exam/results');
    } catch {
      // Surfaces via the banner.
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <NavHeader
        questions={questions}
        currentIndex={safeIndex}
        picks={picks}
        onClose={() => router.back()}
      />

      {submit.isError ? (
        <ErrorBanner
          message={submit.error?.message ?? 'Could not submit your exam.'}
        />
      ) : null}

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
      >
        <CategoryTag category={question.category} />
        <Prompt prompt={question.prompt} />
        <QuestionDiagram slug={question.slug} />
        <Options
          options={question.options}
          selectedID={selectedOptionID}
          onPick={onPick}
        />
      </ScrollView>

      <FooterBar
        canBack={!isFirst}
        canAdvance={canAdvance}
        isLast={isLast}
        isSubmitting={submit.isPending}
        onBack={onBack}
        onNext={onNext}
      />
    </SafeAreaView>
  );
}

function NavHeader({
  questions,
  currentIndex,
  picks,
  onClose,
}: {
  questions: ExamQuestion[];
  currentIndex: number;
  picks: Record<string, string>;
  onClose: () => void;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Pressable
        onPress={onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close exam"
        style={{ width: 28 }}
      >
        <Text style={{ fontSize: 22, color: COLORS.ink, lineHeight: 26 }}>✕</Text>
      </Pressable>

      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {questions.map((q, i) => {
          const answered = picks[q.id] !== undefined;
          const isCurrent = i === currentIndex;
          const bg = isCurrent
            ? COLORS.ink
            : answered
              ? COLORS.orange
              : COLORS.stone;
          return (
            <View
              key={q.id}
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: bg }}
            />
          );
        })}
      </View>

      <Text
        style={{
          fontFamily: FONT_MONO,
          fontSize: 13,
          color: COLORS.mute,
          minWidth: 48,
          textAlign: 'right',
        }}
      >
        Q{currentIndex + 1}/{questions.length}
      </Text>
    </View>
  );
}

function CategoryTag({ category }: { category: string }) {
  return (
    <View style={{ paddingTop: 4, paddingBottom: 12 }}>
      <View
        style={{
          alignSelf: 'flex-start',
          borderWidth: 1,
          borderColor: COLORS.teal,
          borderRadius: 4,
          paddingHorizontal: 8,
          paddingVertical: 2,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 0.8,
            color: COLORS.teal,
          }}
        >
          {category.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

function Prompt({ prompt }: { prompt: string }) {
  return (
    <Text
      style={{
        fontFamily: 'InstrumentSerif_400Regular',
        fontSize: 20,
        lineHeight: 24,
        letterSpacing: -0.2,
        color: COLORS.ink,
        marginBottom: 14,
      }}
    >
      {prompt}
    </Text>
  );
}

// Per-question SVG illustration. Each slug maps to a hand-built scene
// (player figures, trajectory arrows, fault markers, labels) on the shared
// 200×130 court viewBox — see src/components/exam/ExamDiagrams.tsx.
function QuestionDiagram({ slug }: { slug: string }) {
  const Diagram = DIAGRAM_BY_SLUG[slug];
  if (!Diagram) return null;
  return (
    <View style={{ marginBottom: 18, alignItems: 'center' }}>
      <Diagram width="100%" height={170} />
    </View>
  );
}

function Options({
  options,
  selectedID,
  onPick,
}: {
  options: ExamOption[];
  selectedID: string | null;
  onPick: (option: ExamOption) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      {options.map((o, i) => {
        const selected = o.id === selectedID;
        return (
          <Pressable
            key={o.id}
            onPress={() => onPick(o)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 48,
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: selected ? COLORS.cardCream : COLORS.card,
              borderRadius: 10,
              borderWidth: selected ? 1.8 : 1.2,
              borderColor: selected ? COLORS.ink : COLORS.stone,
              gap: 12,
              ...(selected ? hardShadow : null),
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selected ? COLORS.ink : COLORS.card,
                borderWidth: selected ? 0 : 1,
                borderColor: COLORS.stone,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: selected ? '#FFFFFF' : COLORS.ink,
                }}
              >
                {String.fromCharCode(65 + i)}
              </Text>
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 13.5,
                lineHeight: 17,
                color: COLORS.ink,
                fontWeight: '500',
              }}
            >
              {o.text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FooterBar({
  canBack,
  canAdvance,
  isLast,
  isSubmitting,
  onBack,
  onNext,
}: {
  canBack: boolean;
  canAdvance: boolean;
  isLast: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const nextLabel = useMemo(() => {
    if (isSubmitting) return 'Submitting…';
    return isLast ? 'Submit' : 'Next';
  }, [isLast, isSubmitting]);
  const nextBg = isLast ? COLORS.orange : COLORS.teal;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 28,
        backgroundColor: COLORS.bg,
        flexDirection: 'row',
        gap: 10,
      }}
    >
      <Pressable
        onPress={onBack}
        disabled={!canBack}
        style={{
          flex: 1,
          height: 49,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          borderWidth: 1.6,
          borderColor: COLORS.ink,
          backgroundColor: COLORS.bg,
          opacity: canBack ? 1 : 0.35,
          // Design drops the offset on the disabled state.
          ...(canBack ? hardShadow : null),
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.ink }}>
          ← Back
        </Text>
      </Pressable>
      <Pressable
        onPress={onNext}
        disabled={!canAdvance || isSubmitting}
        style={{
          flex: 2,
          height: 49,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          borderWidth: 1.6,
          borderColor: COLORS.ink,
          backgroundColor: nextBg,
          opacity: canAdvance && !isSubmitting ? 1 : 0.4,
          ...(canAdvance && !isSubmitting ? hardShadow : null),
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
          {nextLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function ExamLoading({ onClose }: { onClose: () => void }) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 16,
        }}
        className="flex-row items-center"
      >
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close exam"
        >
          <Text style={{ fontSize: 22, color: COLORS.ink }}>✕</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <SkeletonCard height={60} />
        <SkeletonCard height={170} />
        <SkeletonCard height={48} />
        <SkeletonCard height={48} />
        <SkeletonCard height={48} />
        <SkeletonCard height={48} />
      </View>
    </SafeAreaView>
  );
}

function ExamError({ onClose, error }: { onClose: () => void; error: unknown }) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ padding: 20 }} className="flex-1 items-center justify-center">
        <Text
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 22,
            color: COLORS.ink,
            marginBottom: 8,
          }}
        >
          Exam unavailable
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: COLORS.mute,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          {error instanceof Error ? error.message : 'No questions loaded.'}
        </Text>
        <Pressable
          onPress={onClose}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 12,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: COLORS.ink,
            backgroundColor: COLORS.teal,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

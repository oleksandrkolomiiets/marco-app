import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { DIAGRAM_BY_SLUG } from '@/components/exam/ExamDiagrams';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useLatestExamAttempt } from '@/hooks/useExam';
import type { ExamQuestionReview } from '@/types/api';

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

// 'ui-monospace' is a CSS generic family that React Native cannot resolve —
// mono labels were falling back to the system font. Use the loaded face.
const FONT_MONO = 'JetBrainsMono_400Regular';

// Hard ink offsets from the design: 2x3 on the hero/review cards and CTAs,
// 1.5x2 on the smaller question-grid tiles.
const hardShadow = {
  shadowColor: COLORS.ink,
  shadowOffset: { width: 2, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 2,
} as const;

const hardShadowSm = {
  shadowColor: COLORS.ink,
  shadowOffset: { width: 1.5, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 1,
} as const;

export default function ExamResultsScreen() {
  const router = useRouter();
  const { data: attempt, isLoading } = useLatestExamAttempt();

  if (isLoading) return <ResultsLoading onClose={() => router.replace('/(tabs)')} />;
  if (!attempt) {
    return (
      <ResultsEmpty
        onTake={() => router.replace('/exam')}
        onClose={() => router.replace('/(tabs)')}
      />
    );
  }

  return (
    <ResultsView
      attempt={attempt}
      onRetake={() => router.replace('/exam')}
      onDone={() => router.replace('/(tabs)')}
    />
  );
}

function ResultsView({
  attempt,
  onRetake,
  onDone,
}: {
  attempt: { score: number; total: number; passed: boolean; questions: ExamQuestionReview[] };
  onRetake: () => void;
  onDone: () => void;
}) {
  const wrong = useMemo(
    () => attempt.questions.filter((q) => !q.is_correct),
    [attempt.questions],
  );
  const correct = attempt.questions.length - wrong.length;

  const [focusedID, setFocusedID] = useState<string | null>(
    wrong[0]?.id ?? null,
  );

  const focused = useMemo(
    () => attempt.questions.find((q) => q.id === focusedID) ?? null,
    [attempt.questions, focusedID],
  );

  const onNextWrong = () => {
    if (wrong.length === 0) return;
    const idx = focusedID ? wrong.findIndex((q) => q.id === focusedID) : -1;
    const next = wrong[(idx + 1) % wrong.length];
    if (next) setFocusedID(next.id);
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ResultsHeader onBack={onDone} onRetake={onRetake} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ScoreCard
          score={attempt.score}
          total={attempt.total}
          passed={attempt.passed}
          wrongCount={wrong.length}
        />

        <CountsRow correct={correct} wrong={wrong.length} />

        <QuestionGrid
          questions={attempt.questions}
          focusedID={focusedID}
          onFocus={(id) => setFocusedID(id)}
        />

        {focused ? (
          <ReviewCard question={focused} hasMoreWrong={wrong.length > 1} onNextWrong={onNextWrong} />
        ) : null}
      </ScrollView>

      <FooterCTA passed={attempt.passed} onPress={onDone} />
    </SafeAreaView>
  );
}

function ResultsHeader({
  onBack,
  onRetake,
}: {
  onBack: () => void;
  onRetake: () => void;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={{ width: 28 }}
      >
        <Text style={{ fontSize: 18, color: COLORS.ink, lineHeight: 22 }}>←</Text>
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text
          style={{
            fontFamily: FONT_MONO,
            fontSize: 11,
            color: COLORS.mute,
            letterSpacing: 0.88,
          }}
        >
          RULES EXAM · RESULTS
        </Text>
      </View>
      {/* Retake lives here. The back arrow used to trigger it, which meant
          "Go back" silently started a fresh 20-question attempt. */}
      <Pressable
        onPress={onRetake}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Retake exam"
        style={{ width: 28, alignItems: 'flex-end' }}
      >
        <Text style={{ fontSize: 16, color: COLORS.ink }}>↺</Text>
      </Pressable>
    </View>
  );
}

function ScoreCard({
  score,
  total,
  passed,
  wrongCount,
}: {
  score: number;
  total: number;
  passed: boolean;
  wrongCount: number;
}) {
  const subLine = passed
    ? 'You passed. Rookie license unlocked.'
    : 'Close. Review the wrong ones and retake.';
  const italicLine =
    wrongCount === 0
      ? null
      : wrongCount === 1
        ? 'One to revisit. Tap it below.'
        : `${wrongCount} to revisit. Tap them below.`;

  return (
    <View
      style={{
        marginTop: 4,
        marginBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardCream,
        borderWidth: 1.6,
        borderColor: COLORS.ink,
        borderRadius: 16,
        ...hardShadow,
        padding: 12,
        gap: 12,
      }}
    >
      <View style={{ width: 56, height: 56 }}>
        <MarcoAvatar size={56} />
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular_Italic',
              fontSize: 28,
              color: COLORS.orange,
              fontStyle: 'italic',
            }}
          >
            ¡Vamos!
          </Text>
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular',
              fontSize: 28,
              color: COLORS.ink,
            }}
          >
            {score}/{total}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 12,
            color: COLORS.mute,
            marginTop: 2,
          }}
        >
          {subLine}
        </Text>
        {italicLine ? (
          <Text
            style={{
              // Marco's aside is handwritten Caveat in the design, not
              // italic serif.
              fontFamily: 'Caveat_400Regular',
              fontSize: 16,
              color: COLORS.orange,
              marginTop: 1,
            }}
          >
            {italicLine}
          </Text>
        ) : null}
      </View>

      {passed ? (
        <View style={{ alignItems: 'center', paddingLeft: 4 }}>
          <Text
            style={{
              fontFamily: 'InstrumentSerif_400Regular',
              fontSize: 38,
              color: COLORS.teal,
              lineHeight: 42,
            }}
          >
            L1
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function CountsRow({ correct, wrong }: { correct: number; wrong: number }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.teal }}
        />
        <Text style={{ fontSize: 11, color: COLORS.mute }}>
          Correct · {correct}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.orange }}
        />
        <Text style={{ fontSize: 11, color: COLORS.mute }}>
          Wrong · {wrong}
        </Text>
      </View>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text
          style={{
            fontFamily: 'Caveat_400Regular',
            fontSize: 15,
            color: COLORS.orange,
          }}
        >
          tap to review
        </Text>
      </View>
    </View>
  );
}

function QuestionGrid({
  questions,
  focusedID,
  onFocus,
}: {
  questions: ExamQuestionReview[];
  focusedID: string | null;
  onFocus: (id: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -4,
        marginBottom: 14,
      }}
    >
      {questions.map((q) => {
        const focused = q.id === focusedID;
        const wrong = !q.is_correct;
        const bg = wrong ? COLORS.orange : COLORS.teal;
        return (
          <View key={q.id} style={{ width: '20%', padding: 4 }}>
            <Pressable
              onPress={() => onFocus(q.id)}
              accessibilityRole="button"
              accessibilityLabel={`Question ${q.order_index}, ${q.is_correct ? 'correct' : 'wrong'}`}
              style={{
                height: 46,
                borderRadius: 10,
                backgroundColor: bg,
                borderWidth: focused ? 2 : 1.2,
                borderColor: COLORS.ink,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 4,
                // Focused tile lifts onto the larger offset in the design.
                ...(focused ? hardShadow : hardShadowSm),
              }}
            >
              <Text
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  color: '#FFFFFF',
                  letterSpacing: 0.36,
                }}
              >
                Q{q.order_index.toString().padStart(2, '0')}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  marginTop: 2,
                  lineHeight: 16,
                }}
              >
                {q.is_correct ? '✓' : '✕'}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function ReviewCard({
  question,
  hasMoreWrong,
  onNextWrong,
}: {
  question: ExamQuestionReview;
  hasMoreWrong: boolean;
  onNextWrong: () => void;
}) {
  const selectedOption = question.options.find(
    (o) => o.id === question.selected_option_id,
  );
  const correctOption = question.options.find(
    (o) => o.id === question.correct_option_id,
  );
  const selectedLetter = selectedOption
    ? String.fromCharCode(65 + question.options.findIndex((o) => o.id === selectedOption.id))
    : null;
  const correctLetter = correctOption
    ? String.fromCharCode(65 + question.options.findIndex((o) => o.id === correctOption.id))
    : null;

  return (
    <View
      style={{
        marginTop: 2,
        backgroundColor: COLORS.cardCream,
        borderWidth: 1.6,
        borderColor: COLORS.ink,
        borderRadius: 16,
        ...hardShadow,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Text
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: COLORS.orange,
            fontWeight: '700',
            letterSpacing: 0.36,
          }}
        >
          Q{question.order_index.toString().padStart(2, '0')}
        </Text>
        <Text
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: question.is_correct ? COLORS.teal : COLORS.orange,
            fontWeight: '700',
            letterSpacing: 0.36,
          }}
        >
          · {question.is_correct ? 'CORRECT' : 'WRONG'}
        </Text>
        <Text
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: COLORS.mute,
            letterSpacing: 0.36,
          }}
        >
          {question.category.toUpperCase()}
        </Text>
      </View>

      <Text
        style={{
          fontFamily: 'InstrumentSerif_400Regular',
          fontSize: 16,
          lineHeight: 20,
          color: COLORS.ink,
          marginBottom: 10,
        }}
      >
        {question.prompt}
      </Text>

      <ReviewDiagram slug={question.slug} />

      {!question.is_correct && selectedOption ? (
        <AnswerCard
          variant="wrong"
          letter={selectedLetter}
          text={selectedOption.text}
          label="YOUR ANSWER"
        />
      ) : null}

      {!question.is_correct && !selectedOption ? (
        <View style={{ marginBottom: 8 }}>
          <Text
            style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              color: COLORS.orange,
              fontWeight: '700',
              letterSpacing: 0.6,
              marginBottom: 4,
            }}
          >
            YOUR ANSWER
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.mute, fontStyle: 'italic' }}>
            Skipped.
          </Text>
        </View>
      ) : null}

      <AnswerCard
        variant="correct"
        letter={correctLetter}
        text={correctOption?.text ?? '—'}
        label="CORRECT"
      />

      {question.explanation ? (
        <Text
          style={{
            marginTop: 10,
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: COLORS.mute,
            lineHeight: 14,
          }}
        >
          ref · {question.explanation}
        </Text>
      ) : null}

      {!question.is_correct && hasMoreWrong ? (
        <Pressable
          onPress={onNextWrong}
          style={{
            marginTop: 12,
            height: 39,
            borderRadius: 14,
            borderWidth: 1.6,
            borderColor: COLORS.ink,
            // Opaque page colour rather than transparent: RN derives the
            // shadow from the opaque region, so a clear fill casts nothing.
            backgroundColor: COLORS.bg,
            ...hardShadowSm,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>
            Next wrong →
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ReviewDiagram({ slug }: { slug: string }) {
  const Diagram = DIAGRAM_BY_SLUG[slug];
  if (!Diagram) return null;
  return (
    <View style={{ marginBottom: 10, alignItems: 'center' }}>
      <Diagram width="100%" height={130} />
    </View>
  );
}

function AnswerCard({
  variant,
  letter,
  text,
  label,
}: {
  variant: 'wrong' | 'correct';
  letter: string | null;
  text: string;
  label: string;
}) {
  const isWrong = variant === 'wrong';
  const accent = isWrong ? COLORS.orange : COLORS.teal;
  return (
    <View style={{ marginBottom: 8 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 7,
          paddingHorizontal: 10,
          backgroundColor: COLORS.card,
          borderWidth: isWrong ? 1 : 1.5,
          borderColor: accent,
          borderRadius: 10,
        }}
      >
        {letter ? (
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              backgroundColor: accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
              {letter}
            </Text>
          </View>
        ) : null}
        <Text
          style={{
            flex: 1,
            fontSize: 12,
            color: COLORS.ink,
            fontWeight: '600',
            lineHeight: 16,
          }}
        >
          {text}
        </Text>
        <Text
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            color: accent,
            fontWeight: '700',
            letterSpacing: 0.6,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function FooterCTA({ passed, onPress }: { passed: boolean; onPress: () => void }) {
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
      }}
    >
      <Pressable
        onPress={onPress}
        style={{
          height: 53,
          borderRadius: 14,
          borderWidth: 1.6,
          borderColor: COLORS.ink,
          backgroundColor: COLORS.teal,
          ...hardShadow,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
          {passed ? 'Claim your padel license' : 'Back to home'}
        </Text>
      </Pressable>
    </View>
  );
}

function ResultsLoading({ onClose }: { onClose: () => void }) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 }}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ fontSize: 18, color: COLORS.ink }}>←</Text>
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <SkeletonCard height={91} />
        <SkeletonCard height={20} />
        <SkeletonCard height={200} />
        <SkeletonCard height={200} />
      </View>
    </SafeAreaView>
  );
}

function ResultsEmpty({
  onTake,
  onClose,
}: {
  onTake: () => void;
  onClose: () => void;
}) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 14 }}>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ fontSize: 18, color: COLORS.ink }}>←</Text>
        </Pressable>
      </View>
      <View className="flex-1 items-center justify-center" style={{ padding: 20 }}>
        <Text
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 22,
            color: COLORS.ink,
            marginBottom: 8,
          }}
        >
          No attempt yet
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: COLORS.mute,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          Take the rules exam to earn your padel license.
        </Text>
        <Pressable
          onPress={onTake}
          style={{
            paddingHorizontal: 18,
            height: 53,
            borderRadius: 14,
            borderWidth: 1.6,
            borderColor: COLORS.ink,
            backgroundColor: COLORS.orange,
            ...hardShadow,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
            Start exam
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

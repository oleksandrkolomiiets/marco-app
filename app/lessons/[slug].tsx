import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import { MarcoAvatar } from '@/components/ui/MarcoAvatar';
import { DashedBox } from '@/components/ui/DashedBox';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useLesson, useUpdateProgress } from '@/hooks/useLessons';
import type { CuePoint, Lesson, LessonDrill, ProgressStatus } from '@/types/api';

// Hard 2x3 ink offset — `box-shadow: 2px 3px 0` in the design.
const hardShadow = {
  shadowColor: '#1A2A30',
  shadowOffset: { width: 2, height: 3 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 2,
} as const;

const COLORS = {
  bg: '#FAF8F5',
  videoBg: '#1A2A30',
  hatch: '#CFD6DA',
  ink: '#1A2A30',
  mute: '#8A8074',
  divider: '#E5E2DC',
  border: '#CFD6DA',
  navMute: '#4A5560',
  teal: '#0F4C5C',
  orange: '#E36414',
  white: '#FFFFFF',
};

const formatCueTimestamp = (seconds: number) =>
  `0:${seconds.toString().padStart(2, '0')}`;

export default function LessonDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: lesson, isLoading, error } = useLesson(slug);

  if (isLoading) return <LoadingState />;
  if (error || !lesson) return <ErrorState onBack={() => router.back()} />;

  return <LessonView lesson={lesson} onBack={() => router.back()} />;
}

function LessonView({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const updateProgress = useUpdateProgress();
  const [pendingStatus, setPendingStatus] = useState<ProgressStatus | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);

  useEffect(() => {
    if (!errorVisible) return;
    const t = setTimeout(() => setErrorVisible(false), 3000);
    return () => clearTimeout(t);
  }, [errorVisible]);

  const currentStatus = lesson.progress?.status ?? null;

  const onMarkAs = (status: ProgressStatus) => {
    setPendingStatus(status);
    updateProgress.mutate(
      { slug: lesson.slug, status },
      {
        onSettled: () => setPendingStatus(null),
        onError: () => setErrorVisible(true),
      },
    );
  };

  const quote = lesson.tagline ?? '';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView edges={['top']} style={{ backgroundColor: COLORS.bg }}>
        <NavHeader
          orderIndex={lesson.order_index}
          level={lesson.level}
          onBack={onBack}
        />
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.bg }}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        <TitleBlock title={lesson.title} quote={quote} />
        <VideoBlock videoUrl={lesson.video_url} />
        <CuePointsSection cuePoints={lesson.cue_points} />
        <CommonMistakeCard
          pct={lesson.common_mistake_pct}
          text={lesson.common_mistake_text}
        />
        <FocusSection focus={lesson.focus} />
        <DrillCard drill={lesson.drill} />
      </ScrollView>

      <StickyBottomBar
        currentStatus={currentStatus}
        pendingStatus={pendingStatus}
        errorVisible={errorVisible}
        onMarkAs={onMarkAs}
      />
    </KeyboardAvoidingView>
  );
}

function NavHeader({
  orderIndex,
  level,
  onBack,
}: {
  orderIndex: number;
  level: string;
  onBack: () => void;
}) {
  return (
    <View
      style={{
        height: 48,
        backgroundColor: COLORS.bg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
      }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={{ fontSize: 22, color: COLORS.ink }}>←</Text>
      </Pressable>
      <Text
        style={{
          fontFamily: 'InstrumentSerif_400Regular',
          fontSize: 12,
          color: COLORS.navMute,
          letterSpacing: 0.5,
        }}
      >
        LESSON {orderIndex} · {level.toUpperCase()}
      </Text>
      <Pressable hitSlop={12}>
        <Text style={{ fontSize: 18, color: COLORS.ink }}>⋯</Text>
      </Pressable>
    </View>
  );
}

function TitleBlock({ title, quote }: { title: string; quote: string }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
      <Text
        style={{
          fontFamily: 'InstrumentSerif_400Regular',
          fontSize: 26,
          letterSpacing: -0.52,
          lineHeight: 28,
          color: COLORS.ink,
        }}
      >
        {title}
      </Text>
      {/* Only render the quote when there is one — the quote marks are
          hardcoded around it, so an empty tagline rendered a bare “”. */}
      {quote.length > 0 ? (
        <Text
          style={{
            fontFamily: 'Caveat_400Regular',
            fontSize: 17,
            color: COLORS.orange,
            marginTop: 4,
          }}
        >
          “{quote}”
        </Text>
      ) : null}
    </View>
  );
}

function VideoBlock({ videoUrl }: { videoUrl: string | null }) {
  const [showHint, setShowHint] = useState(true);
  const [paused, setPaused] = useState(false);
  // useVideoPlayer must run unconditionally (hook); it accepts a null source
  // for the placeholder branch below.
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const hintOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(hintOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setShowHint(false));
    }, 2000);
    return () => clearTimeout(t);
  }, [hintOpacity]);

  if (!videoUrl) {
    return (
      <View
        style={{
          marginHorizontal: 20,
          marginBottom: 16,
          borderRadius: 12,
          overflow: 'hidden',
          aspectRatio: 16 / 9,
          backgroundColor: COLORS.videoBg,
        }}
      >
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <Pattern
              id="hatch"
              width="10"
              height="10"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <Line
                x1="0"
                y1="0"
                x2="0"
                y2="10"
                stroke={COLORS.hatch}
                strokeWidth="0.6"
              />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#hatch)" />
        </Svg>
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              borderWidth: 2,
              borderColor: COLORS.white,
              opacity: 0.8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                color: COLORS.white,
                fontSize: 20,
                marginLeft: 3,
              }}
            >
              ▶
            </Text>
          </View>
        </View>
        <Text
          style={{
            position: 'absolute',
            bottom: 12,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'Caveat_400Regular',
            fontSize: 16,
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          15s · loops · tap to scrub
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        const next = !paused;
        setPaused(next);
        if (next) player.pause();
        else player.play();
      }}
      accessibilityRole="button"
      accessibilityLabel={paused ? 'Play lesson video' : 'Pause lesson video'}
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 12,
        overflow: 'hidden',
        aspectRatio: 16 / 9,
        backgroundColor: COLORS.videoBg,
      }}
    >
      <VideoView
        player={player}
        contentFit="cover"
        nativeControls={false}
        style={{ width: '100%', height: '100%' }}
      />
      {paused ? (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: 'rgba(0,0,0,0.3)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 40,
              color: COLORS.white,
              opacity: 0.9,
              marginLeft: 4,
            }}
          >
            ▶
          </Text>
        </View>
      ) : null}
      {showHint ? (
        <Animated.Text
          style={{
            opacity: hintOpacity,
            position: 'absolute',
            bottom: 12,
            width: '100%',
            textAlign: 'center',
            fontFamily: 'Caveat_400Regular',
            fontSize: 16,
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          15s · loops · tap to scrub
        </Animated.Text>
      ) : null}
    </Pressable>
  );
}

function CuePointsSection({ cuePoints }: { cuePoints: CuePoint[] | null }) {
  if (!cuePoints || cuePoints.length === 0) return null;
  const items = cuePoints.slice(0, 3);

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 4 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          color: COLORS.ink,
          marginBottom: 12,
        }}
      >
        Watch for
      </Text>
      {items.map((cue, idx) => {
        const isLast = idx === items.length - 1;
        const isOnlyOrange = items.length > 1 && isLast;
        const dotColor = isOnlyOrange ? COLORS.orange : COLORS.teal;
        return (
          <View
            key={`${cue.timestamp_seconds}-${idx}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 10,
              borderBottomWidth: isLast ? 0 : 0.5,
              borderColor: COLORS.divider,
            }}
          >
            <Text
              style={{
                width: 36,
                fontFamily: 'InstrumentSerif_400Regular',
                fontSize: 11,
                color: COLORS.mute,
              }}
            >
              {formatCueTimestamp(cue.timestamp_seconds)}
            </Text>
            <Text
              style={{
                flex: 1,
                paddingHorizontal: 12,
                fontSize: 14,
                color: COLORS.ink,
              }}
            >
              {cue.cue_text}
            </Text>
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: dotColor,
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

function CommonMistakeCard({
  pct,
  text,
}: {
  pct: number | null;
  text: string | null;
}) {
  if (!text) return null;
  const label = pct != null ? `Common mistake · ${pct}%` : 'Common mistake';
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 14,
        backgroundColor: COLORS.orange,
        borderWidth: 1.4,
        borderColor: COLORS.ink,
        borderRadius: 14,
        paddingVertical: 10,
        paddingHorizontal: 14,
        ...hardShadow,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <MarcoAvatar size={28} />
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.88,
            textTransform: 'uppercase',
            color: COLORS.white,
          }}
        >
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 14, lineHeight: 18, color: COLORS.white }}>
        {text}
      </Text>
    </View>
  );
}

function FocusSection({ focus }: { focus: string | null }) {
  if (!focus) return null;
  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          color: COLORS.ink,
          marginBottom: 8,
        }}
      >
        Focus
      </Text>
      <Text style={{ fontSize: 14, lineHeight: 20, color: COLORS.ink }}>
        {focus}
      </Text>
    </View>
  );
}

function DrillCard({ drill }: { drill: LessonDrill | null }) {
  const [expanded, setExpanded] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  if (!drill) return null;

  const titleText = `${drill.name} · ${drill.duration_minutes} min`;
  const subtitleText = drill.is_recommended
    ? 'Recommended · do before next session'
    : 'Optional · do before next session';

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(rotation, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <Pressable onPress={toggle} style={{ marginHorizontal: 20, marginBottom: 24 }}>
      {/* Dashed outline drawn with SVG — RN can't dash a rounded border. */}
      <DashedBox
        radius={14}
        color={COLORS.mute}
        background={COLORS.white}
        style={{ padding: 14, flexDirection: 'row', alignItems: 'flex-start' }}
      >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.ink }}>
          {titleText}
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.mute, marginTop: 2 }}>
          {subtitleText}
        </Text>
        {expanded ? (
          <Text
            style={{
              fontSize: 13,
              color: '#4A5560',
              lineHeight: 18,
              marginTop: 10,
            }}
          >
            {drill.description}
          </Text>
        ) : null}
      </View>
        <Animated.Text
          style={{
            fontSize: 18,
            color: COLORS.ink,
            transform: [{ rotate }],
            marginLeft: 8,
          }}
        >
          +
        </Animated.Text>
      </DashedBox>
    </Pressable>
  );
}

function StickyBottomBar({
  currentStatus,
  pendingStatus,
  errorVisible,
  onMarkAs,
}: {
  currentStatus: ProgressStatus | null;
  pendingStatus: ProgressStatus | null;
  errorVisible: boolean;
  onMarkAs: (status: ProgressStatus) => void;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: COLORS.bg,
        borderTopWidth: 0.5,
        borderColor: COLORS.divider,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 32,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1.1,
          textTransform: 'uppercase',
          color: COLORS.ink,
          marginBottom: 12,
        }}
      >
        Mark as
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <MarkAsButton
          label="Viewed"
          status="viewed"
          currentStatus={currentStatus}
          pendingStatus={pendingStatus}
          onPress={onMarkAs}
        />
        <MarkAsButton
          label="Learned"
          status="learned"
          currentStatus={currentStatus}
          pendingStatus={pendingStatus}
          onPress={onMarkAs}
        />
        <MarkAsButton
          label="Mastered"
          status="mastered"
          currentStatus={currentStatus}
          pendingStatus={pendingStatus}
          onPress={onMarkAs}
        />
      </View>

      {errorVisible ? (
        <Text
          style={{
            fontSize: 12,
            color: COLORS.orange,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          Could not save. Try again.
        </Text>
      ) : null}

      <View
        style={{
          marginTop: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Text
          style={{
            flex: 1,
            fontFamily: 'Caveat_400Regular',
            fontSize: 17,
            color: COLORS.ink,
          }}
        >
          Was this useful?
        </Text>
        <FeedbackButton emoji="👍" />
        <FeedbackButton emoji="👎" />
      </View>
    </View>
  );
}

function MarkAsButton({
  label,
  status,
  currentStatus,
  pendingStatus,
  onPress,
}: {
  label: string;
  status: ProgressStatus;
  currentStatus: ProgressStatus | null;
  pendingStatus: ProgressStatus | null;
  onPress: (status: ProgressStatus) => void;
}) {
  const isActive = currentStatus === status;
  const isPending = pendingStatus === status;

  let backgroundColor = COLORS.bg;
  let borderWidth = 1;
  let borderColor = COLORS.divider;
  let textColor = COLORS.mute;

  if (isActive) {
    if (status === 'viewed') {
      backgroundColor = COLORS.bg;
      borderWidth = 1.5;
      borderColor = COLORS.ink;
      textColor = COLORS.ink;
    } else if (status === 'learned') {
      backgroundColor = COLORS.teal;
      borderWidth = 0;
      textColor = COLORS.white;
    } else {
      backgroundColor = COLORS.orange;
      borderWidth = 0;
      textColor = COLORS.white;
    }
  }

  return (
    <Pressable
      onPress={() => onPress(status)}
      disabled={isPending}
      style={{
        flex: 1,
        height: 48,
        borderRadius: 12,
        backgroundColor,
        borderWidth,
        borderColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isPending ? (
        <ActivityIndicator
          size="small"
          color={isActive ? textColor : COLORS.ink}
        />
      ) : (
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            letterSpacing: -0.14,
            color: textColor,
          }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function FeedbackButton({ emoji }: { emoji: string }) {
  return (
    <Pressable
      onPress={() => console.log('feedback', emoji)}
      style={{
        width: 40,
        height: 36,
        borderRadius: 8,
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
    </Pressable>
  );
}

function LoadingState() {
  return (
    <SafeAreaView
      edges={['top']}
      style={{ flex: 1, backgroundColor: COLORS.bg }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <SkeletonCard width={200} height={28} />
        <SkeletonCard width={150} height={17} />
        <View style={{ marginTop: 12 }}>
          <SkeletonCard width="100%" height={210} />
        </View>
        <SkeletonCard height={48} />
        <SkeletonCard height={48} />
        <SkeletonCard height={48} />
        <SkeletonCard height={88} />
        <SkeletonCard height={72} />
      </View>
    </SafeAreaView>
  );
}

function ErrorState({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView
      edges={['top']}
      style={{
        flex: 1,
        backgroundColor: COLORS.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MarcoAvatar size={64} />
      <Text style={{ fontSize: 16, color: COLORS.mute, marginTop: 16 }}>
        Couldn’t load this lesson
      </Text>
      <Pressable onPress={onBack} hitSlop={8} style={{ marginTop: 12 }}>
        <Text style={{ color: COLORS.teal, fontSize: 14 }}>
          ← Back to lessons
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}


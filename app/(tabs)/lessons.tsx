import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { JourneyMap } from '@/components/lessons/JourneyMap';
import { LockedBottomSheet } from '@/components/lessons/LockedBottomSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { isLessonCompleted, useLessons } from '@/hooks/useLessons';
import type { Lesson } from '@/types/api';

export default function LessonsScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch, isRefetching } = useLessons();
  const [lockedSheetOpen, setLockedSheetOpen] = useState(false);

  // The path is drawn bottom-up: lesson 1 sits at the bottom of a canvas that
  // is 35 nodes tall, so opening at scroll 0 lands on the last lesson, locked,
  // thousands of pixels from where the player actually is. Jump to their node
  // once, and leave the scroll alone after that.
  const scrollRef = useRef<ScrollView>(null);
  const didJumpToCurrent = useRef(false);
  const handleCurrentNodeY = useCallback((y: number) => {
    if (didJumpToCurrent.current) return;
    didJumpToCurrent.current = true;
    setCurrentNodeY(y);
  }, []);
  const [currentNodeY, setCurrentNodeY] = useState<number | null>(null);

  useEffect(() => {
    if (currentNodeY === null) return;
    // One frame so the ScrollView has measured the canvas it is about to jump
    // inside of; a jump before that is clamped back to 0.
    const raf = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, currentNodeY - 420), animated: false });
    });
    return () => cancelAnimationFrame(raf);
  }, [currentNodeY]);

  const lessons = data
    ? [...data].sort((a, b) => {
        const order = { beginner: 0, intermediate: 1, advanced: 2 } as const;
        const diff = order[a.level] - order[b.level];
        return diff !== 0 ? diff : a.order_index - b.order_index;
      })
    : [];

  const completed = lessons.filter(isLessonCompleted).length;
  const total = lessons.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleLessonPress = (lesson: Lesson) => {
    router.push(`/lessons/${lesson.slug}` as never);
  };

  const handleLockedPress = (_lesson: Lesson) => {
    setLockedSheetOpen(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF8F5' }} edges={['top']}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          backgroundColor: '#FAF8F5',
        }}
      >
        <Text
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 24,
            letterSpacing: -0.48,
            color: '#1A2A30',
          }}
        >
          Your padel journey
        </Text>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 4,
          }}
        >
          {/* Handwritten Caveat, not italic sans — this line carries Marco's
              voice in the design. */}
          <Text
            style={{
              fontFamily: 'Caveat_400Regular',
              fontSize: 17,
              color: '#E36414',
            }}
          >
            {completed} of {total} · keep going
          </Text>
          <Text
            style={{
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 11,
              color: '#4A5560',
            }}
          >
            {percent}%
          </Text>
        </View>
        <View style={{ marginTop: 8 }}>
          <ProgressBar current={completed} total={total} />
        </View>
      </View>

      {error ? (
        <ErrorBanner
          message="Couldn't load lessons."
          onRetry={() => void refetch()}
        />
      ) : null}

      {isLoading ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
          <SkeletonCard height={88} />
          <SkeletonCard height={88} />
          <SkeletonCard height={88} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          // The path's "you are here / start!" marker hangs below the first
          // node, and 40 wasn't enough to clear the tab bar — it sat clipped
          // even scrolled all the way down.
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor="#0F4C5C"
            />
          }
        >
          {lessons.length > 0 ? (
            <JourneyMap
              lessons={lessons}
              onLessonPress={handleLessonPress}
              onLockedPress={handleLockedPress}
              onCurrentNodeY={handleCurrentNodeY}
            />
          ) : null}
        </ScrollView>
      )}

      <LockedBottomSheet
        visible={lockedSheetOpen}
        onClose={() => setLockedSheetOpen(false)}
      />
    </SafeAreaView>
  );
}

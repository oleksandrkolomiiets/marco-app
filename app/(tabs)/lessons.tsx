import { useState } from 'react';
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
    console.log('open lesson', lesson.slug);
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
          contentContainerStyle={{ paddingBottom: 40 }}
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

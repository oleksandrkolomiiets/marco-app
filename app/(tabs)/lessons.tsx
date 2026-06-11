import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { JourneyMap } from '@/components/lessons/JourneyMap';
import { LockedBottomSheet } from '@/components/lessons/LockedBottomSheet';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { useLessons } from '@/hooks/useLessons';
import type { Lesson } from '@/types/api';

const isCompleted = (l: Lesson) =>
  l.progress?.status === 'learned' || l.progress?.status === 'mastered';

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

  const completed = lessons.filter(isCompleted).length;
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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F0E8' }} edges={['top']}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          backgroundColor: '#F5F0E8',
        }}
      >
        <Text
          style={{
            fontFamily: 'InstrumentSerif_400Regular',
            fontSize: 24,
            color: '#1A1A1A',
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
          <Text style={{ fontSize: 13, color: '#E36414', fontStyle: 'italic' }}>
            {completed} of {total} · keep going
          </Text>
          <Text style={{ fontSize: 13, color: '#8B8B8B' }}>{percent}%</Text>
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

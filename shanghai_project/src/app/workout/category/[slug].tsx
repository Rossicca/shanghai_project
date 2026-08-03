import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { VideoCard } from '@/components/workout/VideoCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchWorkoutByCategory } from '@/services/workout';
import { useWorkoutStore } from '@/store/workoutStore';
import type { WorkoutVideo } from '@/types/workout';

export default function CategoryVideos() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const colors = useTheme();
  const { selectVideo } = useWorkoutStore();
  const [videos, setVideos] = useState<WorkoutVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchWorkoutByCategory(slug ?? '')
      .then((list) => alive && setVideos(list))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={videos}
        keyExtractor={(v) => v.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<ThemedText themeColor="textSecondary">该分类暂无视频</ThemedText>}
        renderItem={({ item }) => (
          <View style={styles.itemWrap}>
            <VideoCard
              video={item}
              onPress={() => {
                selectVideo(item);
                router.push({ pathname: '/workout/[id]', params: { id: item.id } });
              }}
            />
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.two, gap: Spacing.two },
  row: { gap: Spacing.two },
  itemWrap: { flex: 1 },
});

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type DimensionValue,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryChip } from '@/components/workout/CategoryChip';
import { WorkoutFeedItem } from '@/components/workout/WorkoutFeedItem';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CATEGORIES } from '@/constants/fitness';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserStore } from '@/store/userStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useWebHorizontalDrag } from '@/utils/webScroll';

export default function WorkoutTab() {
  const colors = useTheme();
  const {
    feed,
    currentCategory,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    savedVideos,
    fetchFeed,
    switchCategory,
    toggleSave,
    selectVideo,
    addHistory,
    loadMore,
  } = useWorkoutStore();
  const bodyData = useUserStore((s) => s.bodyData);
  const goal = useUserStore((s) => s.goal);

  const [activeIndex, setActiveIndex] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const savedIds = new Set(savedVideos.map((v) => v.id));

  const [onViewableItemsChanged] = useState(
    () => ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) setActiveIndex(viewableItems[0].index ?? 0);
    }
  );
  const [viewabilityConfig] = useState(() => ({ itemVisiblePercentThreshold: 60 }));
  // 分类栏滚动：支持鼠标滚轮横向滚动 + 拖拽平移（Web）
  const catScrollRef = useRef<ScrollView>(null);
  useWebHorizontalDrag(catScrollRef, { panOnWheel: true });

  useEffect(() => {
    fetchFeed({ bodyData: bodyData ?? undefined, goal: goal ?? undefined });
  }, [fetchFeed, bodyData, goal]);

  function handleSwitch(cat: string) {
    switchCategory(cat, { bodyData: bodyData ?? undefined, goal: goal ?? undefined });
    setActiveIndex(0);
  }

  function openDetail(video: (typeof feed)[number]) {
    addHistory(video);
    selectVideo(video);
    router.push({ pathname: '/workout/[id]', params: { id: video.id } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* 分类标签栏（顶部，可横向滚动，支持鼠标滚轮） */}
        <ScrollView
          ref={catScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBar}>
          {CATEGORIES.map((c) => (
            <CategoryChip key={c} label={c} isSelected={currentCategory === c} onPress={() => handleSwitch(c)} />
          ))}
        </ScrollView>

        {/* 视频区：顶部位于页面上方 1/8 处，向下延伸到底部导航栏 */}
        <View style={styles.feedWrap} onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}>
          {isLoading && feed.length === 0 ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText>AI 正在为你挑选视频...</ThemedText>
            </View>
          ) : error && feed.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={32} color={colors.textSecondary} />
              <ThemedText type="subtitle">视频暂时加载失败</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                {error}。你的身体数据和收藏不会丢失。
              </ThemedText>
              <Pressable onPress={() => fetchFeed({ bodyData: bodyData ?? undefined, goal: goal ?? undefined })}>
                <ThemedText type="smallBold" themeColor="primary">重新加载</ThemedText>
              </Pressable>
            </View>
          ) : feed.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={32} color={colors.textSecondary} />
              <ThemedText type="subtitle">这个分类还没有视频</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">可以切换其他分类，或稍后再来。</ThemedText>
            </View>
          ) : (
            <FlatList
              data={feed}
              keyExtractor={(v) => v.id}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              onEndReached={() => { if (hasMore) loadMore(); }}
              onEndReachedThreshold={0.6}
              ListFooterComponent={isLoadingMore ? <ActivityIndicator color={colors.primary} /> : null}
              style={{ flex: 1 }}
              renderItem={({ item, index }) => (
                <View style={{ height: listHeight || 600 }}>
                  <WorkoutFeedItem
                    video={item}
                    active={index === activeIndex}
                    saved={savedIds.has(item.id)}
                    onToggleSave={() => toggleSave(item)}
                    onOpen={() => openDetail(item)}
                  />
                </View>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  categoryBar: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: 0, paddingBottom: Spacing.two },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  feedWrap: { position: 'absolute', top: 'calc(6.25% - 17px)' as DimensionValue, left: 0, right: 0, bottom: 0 },
});

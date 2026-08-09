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
    isRefreshing,
    refreshNotice,
    hasMore,
    error,
    savedVideos,
    fetchFeed,
    refreshFeed,
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
  const [showRefreshNotice, setShowRefreshNotice] = useState(false);
  const lastCategoryTapRef = useRef<{ category: string; time: number } | null>(null);
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

  function handleCategoryTap(cat: string, timestamp: number) {
    const lastTap = lastCategoryTapRef.current;
    const isDoubleTap = lastTap?.category === cat && timestamp - lastTap.time < 360;
    lastCategoryTapRef.current = isDoubleTap ? null : { category: cat, time: timestamp };

    if (isDoubleTap && cat === currentCategory) {
      setActiveIndex(0);
      void refreshFeed({ bodyData: bodyData ?? undefined, goal: goal ?? undefined, limit: 6 })
        .finally(() => {
          setShowRefreshNotice(true);
          setTimeout(() => setShowRefreshNotice(false), 2400);
        });
      return;
    }
    if (cat !== currentCategory) handleSwitch(cat);
  }

  function openDetail(video: (typeof feed)[number]) {
    addHistory(video);
    selectVideo(video);
    router.push({ pathname: '/workout/[id]', params: { id: video.id } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.feedWrap} onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}>
          {/* 透明分类导航覆盖在视频顶部 */}
          <ScrollView
            ref={catScrollRef}
            horizontal
            style={styles.categoryScroll}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryBar}>
            {CATEGORIES.map((c) => (
              <CategoryChip
                key={c}
                label={c}
                overlay
                isSelected={currentCategory === c}
                onPress={(event) => handleCategoryTap(c, event.nativeEvent.timestamp)}
              />
            ))}
          </ScrollView>

          {(isRefreshing || showRefreshNotice) && (
            <View style={styles.refreshToast} pointerEvents="none">
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="sparkles" size={15} color="#FFFFFF" />
              )}
              <ThemedText style={styles.refreshToastText}>
                {isRefreshing ? 'AI 正在重新挑选' : refreshNotice}
              </ThemedText>
            </View>
          )}

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
  categoryScroll: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, height: 58, backgroundColor: 'rgba(7,20,15,0.42)', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  categoryBar: { gap: Spacing.one, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, alignItems: 'center' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  feedWrap: { flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', backgroundColor: '#070B09' },
  refreshToast: {
    position: 'absolute',
    zIndex: 30,
    top: 66,
    alignSelf: 'center',
    minHeight: 36,
    maxWidth: '88%',
    paddingHorizontal: Spacing.three,
    borderRadius: 18,
    backgroundColor: 'rgba(7,20,15,0.82)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  refreshToastText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
});

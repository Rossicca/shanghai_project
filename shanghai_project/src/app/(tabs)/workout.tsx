import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
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
        {/* 分类标签栏 */}
        <FlatList
          horizontal
          data={CATEGORIES}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryBar}
          keyExtractor={(c) => c}
          renderItem={({ item }) => (
            <CategoryChip label={item} isSelected={currentCategory === item} onPress={() => handleSwitch(item)} />
          )}
        />

        {/* 视频信息流 —— 纯视频推荐 + AI 健身成果展示 */}
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
              {error}
            </ThemedText>
            <Pressable onPress={() => fetchFeed({ bodyData: bodyData ?? undefined, goal: goal ?? undefined })}>
              <ThemedText type="smallBold" themeColor="primary">重新加载</ThemedText>
            </Pressable>
          </View>
        ) : feed.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="play-circle-outline" size={32} color={colors.textSecondary} />
            <ThemedText type="subtitle">暂无推荐视频</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">可以切换其他分类，或稍后再来。</ThemedText>
          </View>
        ) : (
          <View style={styles.feedWrap} onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}>
            <FlatList
              data={feed}
              keyExtractor={(v) => v.id}
              pagingEnabled
              showsVerticalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              onEndReached={() => { if (hasMore) loadMore(); }}
              onEndReachedThreshold={0.6}
              ListFooterComponent={
                isLoadingMore ? <ActivityIndicator color={colors.primary} style={{ padding: Spacing.three }} /> : (
                  <View style={styles.footer}>
                    <View style={styles.footerDivider}>
                      <View style={[styles.footerLine, { backgroundColor: colors.border }]} />
                      <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                        AI 推荐 · 训练视频 & 健身成果展示
                      </Text>
                      <View style={[styles.footerLine, { backgroundColor: colors.border }]} />
                    </View>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.footerSub}>
                      个性化推荐，越练越精准
                    </ThemedText>
                  </View>
                )
              }
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
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  categoryBar: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  feedWrap: { flex: 1 },
  footer: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five },
  footerDivider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  footerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  footerText: { fontSize: 12, fontWeight: '600' },
  footerSub: { textAlign: 'center' },
});

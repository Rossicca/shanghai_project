import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ViewToken,
} from 'react-native';

import { CategoryChip } from '@/components/workout/CategoryChip';
import { WorkoutFeedItem } from '@/components/workout/WorkoutFeedItem';
import { ThemedText } from '@/components/themed-text';
import { CATEGORIES } from '@/constants/fitness';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserStore } from '@/store/userStore';
import { useWorkoutStore } from '@/store/workoutStore';

const CAT_BAR_H = 52; // 分类栏大约高度

export default function WorkoutTab() {
  const colors = useTheme();
  const { width, height: windowHeight } = useWindowDimensions();
  const { feed, currentCategory, isLoading, isLoadingMore, hasMore, error, savedVideos,
    fetchFeed, switchCategory, toggleSave, selectVideo, addHistory, loadMore } = useWorkoutStore();
  const bodyData = useUserStore((s) => s.bodyData);
  const goal = useUserStore((s) => s.goal);

  const [activeIndex, setActiveIndex] = useState(0);
  const [pageH, setPageH] = useState(windowHeight - CAT_BAR_H);
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
    addHistory(video); selectVideo(video);
    router.push({ pathname: '/workout/[id]', params: { id: video.id } });
  }

  const itemH = pageH > 0 ? pageH - CAT_BAR_H : windowHeight - CAT_BAR_H - 60;

  return (
    <View
      style={styles.root}
      onLayout={(e) => { const h = e.nativeEvent.layout.height; if (h > 0) setPageH(h); }}>
      {/* 视频流全屏 */}
      {isLoading && feed.length === 0 ? (
        <View style={[styles.center, { height: itemH }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>AI 为你挑选视频...</Text>
        </View>
      ) : error && feed.length === 0 ? (
        <View style={[styles.center, { height: itemH }]}>
          <Ionicons name="cloud-offline-outline" size={32} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 8 }}>加载失败</Text>
          <Pressable onPress={() => fetchFeed({ bodyData: bodyData ?? undefined, goal: goal ?? undefined })}>
            <Text style={{ color: colors.primary, fontWeight: '700', marginTop: 8 }}>重新加载</Text>
          </Pressable>
        </View>
      ) : feed.length === 0 ? (
        <View style={[styles.center, { height: itemH }]}>
          <Ionicons name="play-circle-outline" size={32} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: 16, marginTop: 8 }}>暂无视频</Text>
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
          onEndReachedThreshold={0.5}
          snapToInterval={itemH}
          decelerationRate="fast"
          disableIntervalMomentum
          getItemLayout={(_, i) => ({ length: itemH, offset: itemH * i, index: i })}
          ListFooterComponent={
            isLoadingMore ? <ActivityIndicator color={colors.primary} style={{ padding: 20 }} /> : null
          }
          renderItem={({ item, index }) => (
            <View style={{ width, height: itemH }}>
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

      {/* 分类标签 —— 浮在视频上方 */}
      <View style={styles.catOverlay} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catBar}>
          {CATEGORIES.map((cat) => (
            <CategoryChip key={cat} label={cat} dark
              isSelected={currentCategory === cat}
              onPress={() => handleSwitch(cat)} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  // 分类栏浮层
  catOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 50, // safe area
    paddingBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  catBar: { gap: Spacing.two, paddingHorizontal: Spacing.three },
});

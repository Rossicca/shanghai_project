import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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

export default function WorkoutTab() {
  const colors = useTheme();
  const {
    feed,
    currentCategory,
    isLoading,
    savedVideos,
    fetchFeed,
    switchCategory,
    toggleSave,
    selectVideo,
    addHistory,
  } = useWorkoutStore();
  const bodyData = useUserStore((s) => s.bodyData);
  const goal = useUserStore((s) => s.goal);

  const [activeIndex, setActiveIndex] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const savedIds = new Set(savedVideos.map((v) => v.id));

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]) setActiveIndex(viewableItems[0].index ?? 0);
    }
  ).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

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
        <View>
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
        </View>

        {/* 个性化提示 */}
        <View style={styles.personalBar}>
          <Ionicons
            name={bodyData ? 'sparkles' : 'information-circle-outline'}
            size={16}
            color={bodyData ? colors.warning : colors.textSecondary}
          />
          <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
            {bodyData
              ? `已按你的数据（${bodyData.height}cm/${bodyData.weight}kg，目标${goal?.type ?? '健康'}）个性化推荐`
              : '填写身体数据后，推荐会更精准'}
          </ThemedText>
          {!bodyData ? (
            <Pressable onPress={() => router.push('/profile/body')}>
              <ThemedText type="small" themeColor="primary">
                去填写 ›
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        {/* 视频信息流 */}
        {isLoading && feed.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <ThemedText>AI 正在为你挑选视频...</ThemedText>
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
  personalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  feedWrap: { flex: 1 },
});

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { findHealthInspiration, type HealthInspiration } from '@/data/health-inspirations';
import { useTheme } from '@/hooks/use-theme';
import { inspirationImageUrl } from '@/services/media';
import { useInspirationStore } from '@/store/inspirationStore';
import { useRecipeStore } from '@/store/recipeStore';
import { useWorkoutStore } from '@/store/workoutStore';
import type { Recipe } from '@/types/recipe';
import type { WorkoutVideo } from '@/types/workout';

/** 我的收藏完整页：展示全部收藏的菜谱与视频，限制在应用手机框内滚动 */
export default function FavoritesPage() {
  const colors = useTheme();
  const { savedRecipes, loadLocal: loadRecipes, selectRecipe, unsaveRecipe } = useRecipeStore();
  const { savedVideos, loadLocal: loadWorkouts, selectVideo, toggleSave } = useWorkoutStore();
  const { savedIds: savedInspirationIds, loadLocal: loadInspirations, toggleSaved: toggleInspiration } = useInspirationStore();
  const savedInspirations = savedInspirationIds
    .map((id) => findHealthInspiration(id))
    .filter((item): item is HealthInspiration => Boolean(item));

  useEffect(() => {
    loadRecipes();
    loadWorkouts();
    loadInspirations();
  }, [loadInspirations, loadRecipes, loadWorkouts]);

  function openRecipe(r: Recipe) {
    selectRecipe(r);
    router.push({ pathname: '/recipe/[id]', params: { id: r.id } });
  }
  function openVideo(v: WorkoutVideo) {
    selectVideo(v);
    router.push({ pathname: '/workout/[id]', params: { id: v.id } });
  }
  function openInspiration(inspiration: HealthInspiration) {
    router.push({ pathname: '/recipe/inspiration/[id]', params: { id: inspiration.id } });
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {savedRecipes.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <ThemedText type="smallBold">菜谱</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{savedRecipes.length} 份</ThemedText>
            </View>
            <View style={styles.list}>
              {savedRecipes.map((r) => (
                <Pressable key={r.id} onPress={() => openRecipe(r)} style={styles.item}>
                  <View style={[styles.emojiWrap, { backgroundColor: colors.primarySoft }]}>
                    <Ionicons name="restaurant-outline" size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText type="smallBold" numberOfLines={1}>{r.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {r.cookTime} 分钟 · {r.calories} 千卡
                    </ThemedText>
                  </View>
                  <Pressable accessibilityLabel={`取消收藏${r.name}`} onPress={(event) => { event.stopPropagation(); void unsaveRecipe(r.id); }} style={styles.removeButton}>
                    <Ionicons name="heart" size={20} color={colors.danger} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {savedVideos.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <ThemedText type="smallBold">视频</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{savedVideos.length} 个</ThemedText>
            </View>
            <View style={styles.list}>
              {savedVideos.map((v) => (
                <Pressable key={v.id} onPress={() => openVideo(v)} style={styles.item}>
                  <View style={[styles.dot, { backgroundColor: v.coverColor }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText type="smallBold" numberOfLines={1}>{v.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {v.category} · {Math.round(v.duration / 60)} 分钟
                    </ThemedText>
                  </View>
                  <Pressable accessibilityLabel={`取消收藏${v.title}`} onPress={(event) => { event.stopPropagation(); void toggleSave(v); }} style={styles.removeButton}>
                    <Ionicons name="bookmark" size={20} color="#FFC94D" />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {savedInspirations.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <ThemedText type="smallBold">健康饮食灵感</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{savedInspirations.length} 个</ThemedText>
            </View>
            <View style={styles.list}>
              {savedInspirations.map((inspiration) => (
                <Pressable key={inspiration.id} onPress={() => openInspiration(inspiration)} style={styles.item}>
                  <Image source={{ uri: inspirationImageUrl(inspiration.image) }} style={styles.inspirationThumb} contentFit="cover" transition={120} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText type="smallBold" numberOfLines={1}>{inspiration.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {inspiration.meal} · {inspiration.time} 分钟 · 可跟视频做
                    </ThemedText>
                  </View>
                  <Pressable
                    accessibilityLabel={`取消收藏${inspiration.title}`}
                    onPress={(event) => { event.stopPropagation(); void toggleInspiration(inspiration.id); }}
                    style={styles.removeButton}>
                    <Ionicons name="bookmark" size={20} color={colors.primary} />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {savedRecipes.length === 0 && savedVideos.length === 0 && savedInspirations.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={36} color={colors.backgroundSelected} />
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>还没有收藏内容</Text>
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  section: { gap: Spacing.two },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  list: { gap: Spacing.one },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(127,127,127,0.15)',
  },
  emojiWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20 },
  dot: { width: 20, height: 20, borderRadius: 10, marginHorizontal: 4 },
  inspirationThumb: { width: 52, height: 52, borderRadius: 12 },
  removeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
});

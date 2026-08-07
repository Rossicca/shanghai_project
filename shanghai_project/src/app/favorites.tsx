import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRecipeStore } from '@/store/recipeStore';
import { useWorkoutStore } from '@/store/workoutStore';
import type { Recipe } from '@/types/recipe';
import type { WorkoutVideo } from '@/types/workout';

/** 我的收藏完整页：展示全部收藏的菜谱与视频，限制在应用手机框内滚动 */
export default function FavoritesPage() {
  const colors = useTheme();
  const { savedRecipes, loadLocal: loadRecipes, selectRecipe, unsaveRecipe } = useRecipeStore();
  const { savedVideos, loadLocal: loadWorkouts, selectVideo, toggleSave } = useWorkoutStore();

  useEffect(() => {
    loadRecipes();
    loadWorkouts();
  }, [loadRecipes, loadWorkouts]);

  function openRecipe(r: Recipe) {
    selectRecipe(r);
    router.push({ pathname: '/recipe/[id]', params: { id: r.id } });
  }
  function openVideo(v: WorkoutVideo) {
    selectVideo(v);
    router.push({ pathname: '/workout/[id]', params: { id: v.id } });
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
                    <Text style={styles.emoji}>{r.coverEmoji}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText type="smallBold" numberOfLines={1}>{r.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {r.cookTime} 分钟 · {r.calories} 千卡
                    </ThemedText>
                  </View>
                  <Pressable hitSlop={8} onPress={() => unsaveRecipe(r.id)}>
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
                  <Pressable hitSlop={8} onPress={() => toggleSave(v)}>
                    <Ionicons name="bookmark" size={20} color="#FFC94D" />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {savedRecipes.length === 0 && savedVideos.length === 0 ? (
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
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
});

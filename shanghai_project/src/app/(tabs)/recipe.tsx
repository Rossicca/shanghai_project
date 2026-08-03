import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeList } from '@/components/recipe/RecipeList';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRecipeStore } from '@/store/recipeStore';
import type { Recipe } from '@/types/recipe';

export default function RecipeTab() {
  const colors = useTheme();
  const { savedRecipes, recipeHistory, saveRecipe, unsaveRecipe, loadLocal, selectRecipe, error } = useRecipeStore();

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  const savedIds = new Set(savedRecipes.map((r) => r.id));

  function openRecipe(recipe: Recipe) {
    selectRecipe(recipe);
    router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* 拍照入口 */}
          <Pressable onPress={() => router.push('/camera/scan')}>
            <View style={[styles.cta, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={28} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaTitle}>拍一拍识别食材</Text>
                <Text style={styles.ctaSub}>AI 根据你的食材生成专属菜谱</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </View>
          </Pressable>

          {error ? <ThemedText type="small" themeColor="danger">{error}</ThemedText> : null}

          {savedRecipes.length > 0 ? (
            <>
              <ThemedText type="smallBold">我的收藏</ThemedText>
              <RecipeList
                recipes={savedRecipes}
                onPress={openRecipe}
                onSave={(r) => { void unsaveRecipe(r.id).catch(() => {}); }}
                savedIds={savedIds}
              />
            </>
          ) : null}

          {recipeHistory.length > 0 ? (
            <>
              <ThemedText type="smallBold">最近生成</ThemedText>
              <RecipeList
                recipes={recipeHistory.slice(0, 5)}
                onPress={openRecipe}
                onSave={(r) => {
                  void (savedIds.has(r.id) ? unsaveRecipe(r.id) : saveRecipe(r)).catch(() => {});
                }}
                savedIds={savedIds}
              />
            </>
          ) : null}

          {savedRecipes.length === 0 && recipeHistory.length === 0 ? (
            <Card style={styles.empty}>
              <Ionicons name="restaurant-outline" size={48} color={colors.backgroundSelected} />
              <ThemedText type="subtitle">还没有菜谱</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDesc}>
                拍一张食材的照片，AI 帮你做菜
              </ThemedText>
              <Pressable onPress={() => router.push('/camera/scan')}>
                <ThemedText type="smallBold" themeColor="primary">
                  去拍个照吧 ›
                </ThemedText>
              </Pressable>
            </Card>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.card,
  },
  ctaTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  ctaSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  emptyDesc: { textAlign: 'center' },
});

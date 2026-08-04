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
import { useUserStore } from '@/store/userStore';
import type { Recipe } from '@/types/recipe';
import { calcBMI, targetCalories, macroSplit, bmiLabel } from '@/utils/nutrition';

export default function RecipeTab() {
  const colors = useTheme();
  const { savedRecipes, recipeHistory, saveRecipe, unsaveRecipe, loadLocal, selectRecipe, error } = useRecipeStore();
  const { bodyData, goal } = useUserStore();

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  const savedIds = new Set(savedRecipes.map((r) => r.id));
  const bmi = calcBMI(bodyData);
  const calTarget = targetCalories(bodyData, goal);
  const macros = calTarget ? macroSplit(calTarget, goal?.type || '保持健康') : null;

  function openRecipe(recipe: Recipe) {
    selectRecipe(recipe);
    router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>

          {/* ====== 识别食材：拍照识别食材 ====== */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.successSoft }]}>
              <Ionicons name="camera" size={18} color={colors.success} />
            </View>
            <ThemedText type="subtitle">识别食材</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">拍食材 → AI 识别 → 生成菜谱</ThemedText>
          </View>

          <Pressable onPress={() => router.push('/camera/scan')}>
            <View style={[styles.cta, { backgroundColor: colors.primary }]}>
              <View style={styles.ctaLeft}>
                <Ionicons name="camera" size={24} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ctaTitle}>拍照识别食材</Text>
                  <Text style={styles.ctaSub}>拍一拍冰箱里的食材，AI 自动识别</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#fff" />
            </View>
          </Pressable>

          {/* 最近识别的食材快捷入口 */}
          {recipeHistory.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ingredientScroll}>
              {recipeHistory.slice(0, 6).map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => openRecipe(r)}
                  style={[styles.ingredientChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 18 }}>{r.coverEmoji}</Text>
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>
                    {r.name.length > 8 ? r.name.slice(0, 7) + '…' : r.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {/* ====== 推荐菜谱：根据身体数据推荐饮食 ====== */}
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="restaurant" size={18} color={colors.primary} />
            </View>
            <ThemedText type="subtitle">推荐菜谱</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {bodyData
                ? `基于 BMI ${bmi?.toFixed(1) ?? '--'} · ${bmiLabel(bmi)} · ${goal?.type ?? '健康'} · 目标 ${calTarget ?? '--'} 千卡/天`
                : '填写身体数据后，推荐更精准'}
            </ThemedText>
          </View>

          {/* 营养目标条 */}
          {bodyData && macros && (
            <View style={[styles.dietBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.dietItem}>
                <Text style={[styles.dietVal, { color: colors.primary }]}>{calTarget}千卡</Text>
                <Text style={[styles.dietLabel, { color: colors.textSecondary }]}>每日目标</Text>
              </View>
              <View style={[styles.dietDiv, { backgroundColor: colors.border }]} />
              <View style={styles.dietItem}>
                <Text style={[styles.dietVal, { color: '#E74C3C' }]}>{macros.protein}g</Text>
                <Text style={[styles.dietLabel, { color: colors.textSecondary }]}>蛋白质</Text>
              </View>
              <View style={[styles.dietDiv, { backgroundColor: colors.border }]} />
              <View style={styles.dietItem}>
                <Text style={[styles.dietVal, { color: '#F5B14C' }]}>{macros.carbs}g</Text>
                <Text style={[styles.dietLabel, { color: colors.textSecondary }]}>碳水</Text>
              </View>
              <View style={[styles.dietDiv, { backgroundColor: colors.border }]} />
              <View style={styles.dietItem}>
                <Text style={[styles.dietVal, { color: '#3E6FA8' }]}>{macros.fat}g</Text>
                <Text style={[styles.dietLabel, { color: colors.textSecondary }]}>脂肪</Text>
              </View>
            </View>
          )}

          {/* 收藏和历史菜谱 */}
          {error ? <ThemedText type="small" themeColor="danger">{error}</ThemedText> : null}

          {savedRecipes.length > 0 ? (
            <>
              <ThemedText type="smallBold">我的收藏</ThemedText>
              <RecipeList recipes={savedRecipes} onPress={openRecipe} onSave={(r) => { void unsaveRecipe(r.id).catch(() => {}); }} savedIds={savedIds} />
            </>
          ) : null}

          {recipeHistory.length > 0 ? (
            <>
              <ThemedText type="smallBold">最近生成</ThemedText>
              <RecipeList recipes={recipeHistory.slice(0, 5)} onPress={openRecipe}
                onSave={(r) => { void (savedIds.has(r.id) ? unsaveRecipe(r.id) : saveRecipe(r)).catch(() => {}); }}
                savedIds={savedIds}
              />
            </>
          ) : null}

          {savedRecipes.length === 0 && recipeHistory.length === 0 ? (
            <Card style={styles.empty}>
              <Ionicons name="restaurant-outline" size={48} color={colors.backgroundSelected} />
              <ThemedText type="subtitle">还没有菜谱</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDesc}>
                拍一张食材的照片，AI 帮你做菜{'\n'}身体数据越完整，饮食推荐越精准
              </ThemedText>
              <Pressable onPress={() => router.push('/camera/scan')}>
                <ThemedText type="smallBold" themeColor="primary">去拍个照吧 ›</ThemedText>
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

  sectionHeader: { gap: 2, paddingTop: Spacing.one },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },

  // 拍照 CTA
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three,
    padding: Spacing.four, borderRadius: Radius.card,
  },
  ctaLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flex: 1 },
  ctaTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  ctaSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },

  // 食材快捷标签
  ingredientScroll: { gap: Spacing.two, paddingBottom: 2 },
  ingredientChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },

  // 营养目标条
  dietBar: {
    flexDirection: 'row', borderRadius: Radius.card, borderWidth: 1,
    padding: Spacing.three,
  },
  dietItem: { flex: 1, alignItems: 'center', gap: 2 },
  dietVal: { fontSize: 17, fontWeight: '800' },
  dietLabel: { fontSize: 10 },
  dietDiv: { width: 1, height: 24, alignSelf: 'center' },

  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  emptyDesc: { textAlign: 'center' },
});

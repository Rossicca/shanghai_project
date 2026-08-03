import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { NutritionInfo } from '@/components/recipe/NutritionInfo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { reimagineRecipe } from '@/services/recipe';
import { useRecipeStore } from '@/store/recipeStore';
import { useUserStore } from '@/store/userStore';
import { estimateTargetCalories } from '@/utils/nutrition';

export default function RecipeDetail() {
  const colors = useTheme();
  const { currentRecipe, selectRecipe, savedRecipes, saveRecipe, unsaveRecipe, loadLocal } =
    useRecipeStore();
  const bodyData = useUserStore((s) => s.bodyData);
  const goal = useUserStore((s) => s.goal);

  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const recipe = currentRecipe;
  const saved = recipe ? savedRecipes.some((r) => r.id === recipe.id) : false;
  const targetCalories = recipe?.nutritionTarget?.targetCalories ?? estimateTargetCalories(bodyData, goal);

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  if (!recipe) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.empty}>
          <ThemedText>还没有菜谱，去拍个照生成一份吧</ThemedText>
          <Button title="去拍照识别" onPress={() => router.replace('/camera/scan')} />
        </View>
      </ThemedView>
    );
  }

  async function switchRecipe() {
    if (switching || !recipe) return;
    setSwitching(true);
    setSwitchError('');
    try {
      const next = await reimagineRecipe(recipe.id, 'stir_fry');
      selectRecipe(next);
    } catch (error) {
      setSwitchError((error as Error).message || '换做法失败，请重试');
    } finally {
      setSwitching(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.cover, { backgroundColor: colors.primarySoft }]}>
          <Text style={styles.coverEmoji}>{recipe.coverEmoji}</Text>
        </View>

        <ThemedText type="title">{recipe.name}</ThemedText>
        <ThemedText themeColor="textSecondary">{recipe.description}</ThemedText>

        <View style={styles.metaRow}>
          <View style={[styles.metaItem, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <ThemedText type="small">{recipe.cookTime} 分钟</ThemedText>
          </View>
          <View style={[styles.metaItem, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="flame-outline" size={18} color={colors.danger} />
            <ThemedText type="small">{recipe.difficulty}</ThemedText>
          </View>
          <View style={[styles.metaItem, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="people-outline" size={18} color={colors.success} />
            <ThemedText type="small">{recipe.servings || 1} 人份</ThemedText>
          </View>
        </View>

        <NutritionInfo
          calories={recipe.calories}
          protein={recipe.protein}
          carbs={recipe.carbs}
          fat={recipe.fat}
          targetCalories={targetCalories}
        />

        <Card>
          <ThemedText type="subtitle">食材清单</ThemedText>
          {recipe.ingredients.map((ing, i) => (
            <View key={i} style={styles.ingRow}>
              <Text style={{ color: colors.text, flex: 1 }}>{ing.name}</Text>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{ing.amount}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <ThemedText type="subtitle">烹饪步骤</ThemedText>
          {recipe.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: colors.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{i + 1}</Text>
              </View>
              <ThemedText style={{ flex: 1, lineHeight: 22 }}>{step}</ThemedText>
            </View>
          ))}
        </Card>

        {recipe.tips?.length ? (
          <Card>
            <ThemedText type="subtitle">小贴士</ThemedText>
            {recipe.tips.map((t, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="bulb-outline" size={16} color={colors.warning} />
                <ThemedText type="small" style={{ flex: 1 }}>
                  {t}
                </ThemedText>
              </View>
            ))}
          </Card>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={saved ? '已收藏' : '收藏'}
            variant="outline"
            icon={saved ? 'heart' : 'heart-outline'}
            onPress={async () => {
              if (saved) await unsaveRecipe(recipe.id);
              else await saveRecipe(recipe);
            }}
          />
          <View style={{ width: Spacing.two }} />
          <Button title="换一种做法" icon="refresh" variant="secondary" onPress={switchRecipe} loading={switching} style={{ flex: 1 }} />
        </View>

        {switchError ? <ThemedText type="small" themeColor="danger">{switchError}</ThemedText> : null}

        <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
          AI 生成的营养与用量为估算值，仅供日常饮食参考
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  cover: { height: 160, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  coverEmoji: { fontSize: 80 },
  metaRow: { flexDirection: 'row', gap: Spacing.two },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 12 },
  ingRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: Spacing.one },
  stepRow: { flexDirection: 'row', gap: Spacing.three, marginVertical: Spacing.two, alignItems: 'flex-start' },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tipRow: { flexDirection: 'row', gap: Spacing.two, marginVertical: Spacing.one, alignItems: 'center' },
  actions: { flexDirection: 'row' },
  tip: { textAlign: 'center' },
});

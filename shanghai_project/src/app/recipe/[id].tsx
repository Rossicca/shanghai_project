import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NutritionInfo } from '@/components/recipe/NutritionInfo';
import { RecipeVideoSection } from '@/components/recipe/RecipeVideoSection';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getToken } from '@/services/api';
import { recipeCoverUrl } from '@/services/media';
import { fetchRecipe, reimagineRecipe } from '@/services/recipe';
import { useRecipeStore } from '@/store/recipeStore';
import { useUserStore } from '@/store/userStore';
import { estimateTargetCalories } from '@/utils/nutrition';

export default function RecipeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const {
    currentRecipe,
    selectRecipe,
    savedRecipes,
    saveRecipe,
    unsaveRecipe,
    loadLocal,
    generateRecipe,
    recipeQueue,
    recipeQueueParams,
    recipeQueueRecipeId,
    advanceRecipeQueue,
  } =
    useRecipeStore();
  const bodyData = useUserStore((s) => s.bodyData);
  const goal = useUserStore((s) => s.goal);

  const [switching, setSwitching] = useState(false);
  const [generatingNext, setGeneratingNext] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const [detailRecipe, setDetailRecipe] = useState(currentRecipe?.id === id ? currentRecipe : null);
  const [detailLoading, setDetailLoading] = useState(Boolean(id && currentRecipe?.id !== id && getToken()));
  const [saveError, setSaveError] = useState('');
  const [failedCoverId, setFailedCoverId] = useState('');
  const recipe = currentRecipe?.id === id ? currentRecipe : detailRecipe?.id === id ? detailRecipe : null;
  const saved = recipe ? savedRecipes.some((r) => r.id === recipe.id) : false;
  const targetCalories = recipe?.nutritionTarget?.targetCalories ?? estimateTargetCalories(bodyData, goal);
  const nextCandidate = recipeQueueRecipeId === recipe?.id ? recipeQueue[0] : null;

  useEffect(() => {
    loadLocal();
  }, [loadLocal]);

  useEffect(() => {
    if (!id || currentRecipe?.id === id || !getToken()) return;
    let active = true;
    fetchRecipe(id)
      .then((next) => {
        if (!active) return;
        setDetailRecipe(next);
        selectRecipe(next);
      })
      .catch((error) => active && setSwitchError((error as Error).message || '菜谱加载失败'))
      .finally(() => active && setDetailLoading(false));
    return () => { active = false; };
  }, [currentRecipe?.id, id, selectRecipe]);

  if (detailLoading && !recipe) {
    return <ThemedView style={styles.container}><View style={styles.empty}><ActivityIndicator /></View></ThemedView>;
  }

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
      router.replace({ pathname: '/recipe/[id]', params: { id: next.id } });
    } catch (error) {
      setSwitchError((error as Error).message || '换做法失败，请重试');
    } finally {
      setSwitching(false);
    }
  }

  async function makeNextRecipe() {
    if (!nextCandidate || !recipeQueueParams || generatingNext) return;
    setGeneratingNext(true);
    setSwitchError('');
    try {
      const next = await generateRecipe({
        ...recipeQueueParams,
        selectedDish: {
          name: nextCandidate.name,
          missingIngredients: nextCandidate.missingIngredients,
          pantryLevel: nextCandidate.pantryLevel,
          sourceVideo: nextCandidate.sourceVideo,
        },
      });
      advanceRecipeQueue(next.id);
      router.replace({ pathname: '/recipe/[id]', params: { id: next.id } });
    } catch (error) {
      setSwitchError((error as Error).message || '下一道菜生成失败，请重试');
    } finally {
      setGeneratingNext(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.cover, { backgroundColor: colors.primarySoft }]}>
          {recipeCoverUrl(recipe.sourceVideo?.coverUrl) && failedCoverId !== recipe.id ? (
            <>
              <Image
                source={{ uri: recipeCoverUrl(recipe.sourceVideo?.coverUrl) }}
                style={styles.coverImage}
                resizeMode="cover"
                onError={() => setFailedCoverId(recipe.id)}
              />
              <View style={styles.coverSource}>
                <Ionicons name="play-circle" size={14} color="#FFFFFF" />
                <Text style={styles.coverSourceText}>教程视频封面</Text>
              </View>
            </>
          ) : (
            <Text style={styles.coverEmoji}>{recipe.coverEmoji}</Text>
          )}
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

        <RecipeVideoSection key={recipe.id} recipe={recipe} />

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
              setSaveError('');
              try {
                if (saved) await unsaveRecipe(recipe.id);
                else await saveRecipe(recipe);
              } catch (error) {
                setSaveError((error as Error).message || '收藏操作失败，请重试');
              }
            }}
          />
          <View style={{ width: Spacing.two }} />
          <Button title="换一种做法" icon="refresh" variant="secondary" onPress={switchRecipe} loading={switching} style={{ flex: 1 }} />
        </View>

        {nextCandidate ? (
          <View style={[styles.nextCard, { backgroundColor: colors.primarySoft }]}>
            <View style={styles.nextCopy}>
              <ThemedText type="small" themeColor="textSecondary">多选清单 · 还剩 {recipeQueue.length} 道</ThemedText>
              <ThemedText type="subtitle" numberOfLines={1}>下一道：{nextCandidate.name}</ThemedText>
            </View>
            <Button
              title="做下一道菜"
              icon="arrow-forward"
              onPress={makeNextRecipe}
              loading={generatingNext}
              disabled={switching}
            />
          </View>
        ) : null}

        {switchError || saveError ? <ThemedText type="small" themeColor="danger">{switchError || saveError}</ThemedText> : null}

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
  coverImage: { width: '100%', height: '100%', borderRadius: 20 },
  coverSource: { position: 'absolute', left: Spacing.two, bottom: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, backgroundColor: 'rgba(0,0,0,0.68)', borderRadius: 12, paddingHorizontal: Spacing.two, paddingVertical: Spacing.one },
  coverSourceText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  coverEmoji: { fontSize: 80 },
  metaRow: { flexDirection: 'row', gap: Spacing.two },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 12 },
  ingRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: Spacing.one },
  stepRow: { flexDirection: 'row', gap: Spacing.three, marginVertical: Spacing.two, alignItems: 'flex-start' },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tipRow: { flexDirection: 'row', gap: Spacing.two, marginVertical: Spacing.one, alignItems: 'center' },
  actions: { flexDirection: 'row' },
  nextCard: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  nextCopy: { gap: Spacing.one },
  tip: { textAlign: 'center' },
});

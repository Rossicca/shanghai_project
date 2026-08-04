import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { recipeCoverUrl } from '@/services/media';
import { recommendRecipes } from '@/services/recipe';
import { useRecipeStore } from '@/store/recipeStore';
import { useUserStore } from '@/store/userStore';
import type { RecipeCandidate, RecipeGenerateParams } from '@/types/recipe';

const COOK_TIMES = [10, 20, 30, 45, 60];
const DIFFICULTIES = ['简单', '中等', '困难'] as const;
const MEAL_TYPES = [
  { value: 'any', label: '不限' },
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '中餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'dessert', label: '甜点' },
] as const;
const PANTRY_LABELS = {
  existing: '少量补充',
  topup: '补几样更丰富',
  explore: '换一种吃法',
} as const;

export default function GenerateRecipe() {
  const colors = useTheme();
  const { currentIngredients, generateRecipe, selectRecipe } = useRecipeStore();
  const bodyData = useUserStore((s) => s.bodyData);
  const goal = useUserStore((s) => s.goal);

  const [ingredients, setIngredients] = useState(currentIngredients);
  const [people, setPeople] = useState(1);
  const [cookTime, setCookTime] = useState(20);
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('简单');
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number]['value']>('any');
  const [recommendations, setRecommendations] = useState<RecipeCandidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [recommending, setRecommending] = useState(false);
  const [generatingId, setGeneratingId] = useState('');
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setInterval(() => setRetryAfter((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  function updateAmount(index: number, amount: string) {
    setIngredients((prev) => prev.map((it, i) => (i === index ? { ...it, amount } : it)));
    clearRecommendations();
  }

  function removeAt(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
    clearRecommendations();
  }

  function clearRecommendations() {
    setRecommendations([]);
    setSelectedIds([]);
    setError('');
  }

  function buildParams(selectedDish?: RecipeGenerateParams['selectedDish']): RecipeGenerateParams {
    return {
      ingredients,
      people,
      cookTime,
      difficulty,
      mealType,
      selectedDish,
      user: {
        caloriesTarget: estimateTargetCalories(),
        goal: goal?.type,
        bodyData: bodyData ? {
          height: bodyData.height,
          weight: bodyData.weight,
          age: bodyData.age,
          gender: bodyData.gender,
        } : undefined,
      },
    };
  }

  async function runRecommend() {
    if (ingredients.length === 0) return;
    setRecommending(true);
    setError('');
    try {
      const next = await recommendRecipes(buildParams());
      setRecommendations(next);
      setSelectedIds([]);
    } catch (e) {
      setError((e as Error).message || '推荐失败，请重试');
    } finally {
      setRecommending(false);
    }
  }

  async function runGenerate(candidate: RecipeCandidate) {
    if (generatingId) return;
    setGeneratingId(candidate.id);
    setError('');
    try {
      const recipe = await generateRecipe(buildParams({
        name: candidate.name,
        missingIngredients: candidate.missingIngredients,
        pantryLevel: candidate.pantryLevel,
        sourceVideo: candidate.sourceVideo,
      }));
      selectRecipe(recipe);
      router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } });
    } catch (e: any) {
      if (e?.response?.status === 429) {
        setRetryAfter(Number(e.response.data?.error?.detail?.retryAfterSeconds || 35));
      }
      setError((e as Error).message || '生成失败，请重试');
    } finally {
      setGeneratingId('');
    }
  }

  function toggleCandidate(candidateId: string) {
    setSelectedIds((current) => current.includes(candidateId)
      ? current.filter((id) => id !== candidateId)
      : [...current, candidateId]);
  }

  const selectedCandidates = recommendations.filter((item) => selectedIds.includes(item.id));

  /** 估算每餐目标热量，与后端的 Mifflin-St Jeor 口径保持一致。 */
  function estimateTargetCalories(): number | undefined {
    if (!bodyData) return undefined;
    const s = bodyData.gender === '男' ? 5 : -161;
    const bmr = 10 * bodyData.weight + 6.25 * bodyData.height - 5 * bodyData.age + s;
    const tdee = bmr * 1.55;
    const dailyTarget = goal?.type === '减脂'
      ? tdee - 500
      : goal?.type === '增肌'
        ? tdee + 300
        : tdee;
    return Math.min(900, Math.max(300, Math.round(dailyTarget / 3)));
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.cardTitle}>
            <ThemedText type="subtitle">确认食材</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              可调整用量
            </ThemedText>
          </View>
          {ingredients.map((item, i) => (
            <View key={`${item.name}-${i}`} style={styles.ingredientRow}>
              <ThemedText style={{ flex: 1 }}>{item.name}</ThemedText>
              <TextInput
                value={item.amount}
                onChangeText={(t) => updateAmount(i, t)}
                style={[styles.amountInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
              />
              <Pressable onPress={() => removeAt(i)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </Card>

        <Card>
          <ThemedText type="subtitle">生成条件</ThemedText>

          <ThemedText type="smallBold" style={styles.condLabel}>
            几人份
          </ThemedText>
          <View style={styles.stepper}>
            <Pressable
              onPress={() => { setPeople((p) => Math.max(1, p - 1)); clearRecommendations(); }}
              style={[styles.stepBtn, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="remove" size={18} color={colors.text} />
            </Pressable>
            <ThemedText type="subtitle">{people}</ThemedText>
            <Pressable
              onPress={() => { setPeople((p) => Math.min(8, p + 1)); clearRecommendations(); }}
              style={[styles.stepBtn, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="add" size={18} color={colors.text} />
            </Pressable>
          </View>

          <ThemedText type="smallBold" style={styles.condLabel}>
            烹饪时间
          </ThemedText>
          <View style={styles.chips}>
            {COOK_TIMES.map((t) => (
              <Pressable key={t} onPress={() => { setCookTime(t); clearRecommendations(); }}>
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: cookTime === t ? colors.primary : colors.backgroundElement,
                    },
                  ]}>
                  <Text style={{ color: cookTime === t ? '#fff' : colors.text, fontWeight: '600' }}>
                    {t} 分钟
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <ThemedText type="smallBold" style={styles.condLabel}>
            难度
          </ThemedText>
          <View style={styles.chips}>
            {DIFFICULTIES.map((d) => (
              <Pressable key={d} onPress={() => { setDifficulty(d); clearRecommendations(); }}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: difficulty === d ? colors.primary : colors.backgroundElement },
                  ]}>
                  <Text style={{ color: difficulty === d ? '#fff' : colors.text, fontWeight: '600' }}>
                    {d}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <ThemedText type="smallBold" style={styles.condLabel}>
            想做什么
          </ThemedText>
          <View style={styles.chips}>
            {MEAL_TYPES.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected: mealType === option.value }}
                onPress={() => { setMealType(option.value); clearRecommendations(); }}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: mealType === option.value ? colors.primary : colors.backgroundElement },
                  ]}>
                  <Text style={{ color: mealType === option.value ? '#fff' : colors.text, fontWeight: '600' }}>
                    {option.label}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Card>

        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}

        {recommending ? (
          <Card style={styles.generating}>
            <ActivityIndicator color={colors.primary} />
            <ThemedText type="subtitle">AI 正在搭配更多可能…</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              先检索真实教程，再结合食材和身体目标筛选 8 种不同做法
            </ThemedText>
          </Card>
        ) : recommendations.length === 0 ? (
          <Button
            title="AI 推荐 8 种做法"
            icon="sparkles"
            size="large"
            onPress={runRecommend}
            disabled={ingredients.length === 0}
          />
        ) : null}

        {recommendations.length > 0 ? (
          <View style={styles.recommendationSection}>
            <View style={styles.recommendationHeading}>
              <View style={{ flex: 1 }}>
                <ThemedText type="title">把想做的先选出来</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  可多选；已找到 {recommendations.length} 种有真实教程依据的方案
                </ThemedText>
              </View>
              <Pressable accessibilityRole="button" onPress={runRecommend} disabled={recommending}>
                <ThemedText type="smallBold" themeColor="primary">换一批</ThemedText>
              </Pressable>
            </View>

            <View style={styles.candidateList}>
              {recommendations.map((candidate) => {
                const isSelected = selectedIds.includes(candidate.id);
                return (
                  <Pressable
                    key={candidate.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${isSelected ? '取消选择' : '选择'}${candidate.name}`}
                    onPress={() => toggleCandidate(candidate.id)}
                    style={[
                      styles.candidate,
                      {
                        backgroundColor: isSelected ? colors.primarySoft : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}>
                    <View style={styles.candidateTop}>
                      <View style={[styles.candidateCover, { backgroundColor: colors.backgroundElement }]}>
                        <Text style={styles.candidateEmoji}>{candidate.coverEmoji}</Text>
                        {recipeCoverUrl(candidate.sourceVideo?.coverUrl) ? (
                          <Image source={{ uri: recipeCoverUrl(candidate.sourceVideo?.coverUrl) }} style={styles.candidateCoverImage} />
                        ) : null}
                      </View>
                      <View style={styles.candidateTitleWrap}>
                        <ThemedText type="subtitle">{candidate.name}</ThemedText>
                        <View style={styles.metaLine}>
                          <ThemedText type="small" themeColor="warning">{PANTRY_LABELS[candidate.pantryLevel]}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">{candidate.cookTime} 分钟</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">约 {candidate.estimatedCalories} kcal</ThemedText>
                        </View>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={23}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                    </View>

                    {candidate.sourceVideo ? (
                      <View style={[styles.videoEvidence, { backgroundColor: colors.backgroundElement }]}>
                        <Ionicons name="play-circle" size={17} color={colors.primary} />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText type="smallBold" numberOfLines={1}>真实教程依据</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                            {candidate.sourceVideo.title} · {candidate.sourceVideo.author}
                          </ThemedText>
                        </View>
                      </View>
                    ) : null}

                    <ThemedText type="small" themeColor="textSecondary">{candidate.description}</ThemedText>

                    <View style={styles.ingredientSummary}>
                      <View style={styles.ingredientLine}>
                        <Ionicons name="checkmark" size={16} color={colors.success} />
                        <ThemedText type="smallBold">手上已有</ThemedText>
                        <ThemedText type="small" style={{ flex: 1 }}>
                          {candidate.availableIngredients.join('、') || '以现有食材为主'}
                        </ThemedText>
                      </View>
                      <View style={styles.ingredientLine}>
                        <Ionicons name="basket-outline" size={16} color={colors.warning} />
                        <ThemedText type="smallBold">还需补充</ThemedText>
                        <ThemedText type="small" style={{ flex: 1 }}>
                          {candidate.missingIngredients.length ? candidate.missingIngredients.join('、') : '无需额外购买'}
                        </ThemedText>
                      </View>
                    </View>

                    {isSelected ? (
                      <View style={styles.reasonRow}>
                        <Ionicons name="sparkles" size={15} color={colors.primary} />
                        <ThemedText type="small" themeColor="primary" style={{ flex: 1 }}>
                          {candidate.reason}
                        </ThemedText>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {selectedCandidates.length > 0 ? (
              <View style={[styles.selectedPanel, { backgroundColor: colors.primarySoft }]}>
                <View style={styles.selectedHeader}>
                  <View>
                    <ThemedText type="subtitle">已选 {selectedCandidates.length} 道</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">选择任意一道生成完整菜谱</ThemedText>
                  </View>
                  <Pressable accessibilityRole="button" onPress={() => setSelectedIds([])}>
                    <ThemedText type="smallBold" themeColor="primary">清空</ThemedText>
                  </Pressable>
                </View>
                {selectedCandidates.map((candidate) => {
                  const isGenerating = generatingId === candidate.id;
                  return (
                    <View key={candidate.id} style={[styles.selectedRow, { borderTopColor: colors.border }]}>
                      <Text style={styles.selectedEmoji}>{candidate.coverEmoji}</Text>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <ThemedText type="smallBold" numberOfLines={1}>{candidate.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {candidate.missingIngredients.length
                            ? `需补 ${candidate.missingIngredients.length} 样食材`
                            : '现有食材即可'}
                        </ThemedText>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`生成${candidate.name}的完整菜谱`}
                        disabled={Boolean(generatingId) || retryAfter > 0}
                        onPress={() => runGenerate(candidate)}
                        style={({ pressed }) => [
                          styles.startButton,
                          {
                            backgroundColor: colors.primary,
                            opacity: generatingId && !isGenerating ? 0.45 : pressed ? 0.75 : 1,
                          },
                        ]}>
                        {isGenerating ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="restaurant" size={15} color="#FFFFFF" />
                            <Text style={styles.startButtonText}>开始做</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.selectionHint, { backgroundColor: colors.backgroundElement }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
                <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                  点击卡片可多选，选好的菜会集中显示在这里
                </ThemedText>
              </View>
            )}
            {retryAfter > 0 ? (
              <ThemedText type="small" themeColor="warning" style={styles.tip}>{retryAfter} 秒后可再次生成</ThemedText>
            ) : null}
          </View>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
          {bodyData
            ? `已结合你的身体数据（目标${goal?.type ?? '保持健康'}）估算目标热量`
            : '去"我的"填写身体数据，可生成热量对比'}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  cardTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginVertical: Spacing.one },
  amountInput: { width: 100, borderRadius: Radius.button, paddingHorizontal: Spacing.two, paddingVertical: 6, fontSize: 14, textAlign: 'center' },
  condLabel: { marginTop: Spacing.three },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, marginTop: Spacing.two },
  stepBtn: { width: 36, height: 36, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.chip },
  generating: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  recommendationSection: { gap: Spacing.three, marginTop: Spacing.two },
  recommendationHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  candidateList: { gap: Spacing.two },
  candidate: { borderWidth: 1, borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.two },
  candidateTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  candidateCover: { width: 92, height: 66, borderRadius: Radius.button, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  candidateCoverImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  candidateEmoji: { fontSize: 30 },
  candidateTitleWrap: { flex: 1, minWidth: 0, gap: Spacing.one },
  metaLine: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  ingredientSummary: { gap: Spacing.one },
  ingredientLine: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one },
  videoEvidence: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: Radius.button, padding: Spacing.two },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one },
  selectedPanel: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.two },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderTopWidth: 1, paddingTop: Spacing.two },
  selectedEmoji: { fontSize: 24 },
  startButton: { minHeight: 40, minWidth: 88, borderRadius: Radius.button, paddingHorizontal: Spacing.two, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  startButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  selectionHint: { minHeight: 48, borderRadius: Radius.button, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  tip: { textAlign: 'center' },
});

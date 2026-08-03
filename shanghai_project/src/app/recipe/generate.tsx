import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRecipeStore } from '@/store/recipeStore';
import { useUserStore } from '@/store/userStore';
import type { RecipeGenerateParams } from '@/types/recipe';

const COOK_TIMES = [10, 20, 30, 45, 60];
const DIFFICULTIES = ['简单', '中等', '困难'] as const;

export default function GenerateRecipe() {
  const colors = useTheme();
  const { currentIngredients, generateRecipe, selectRecipe } = useRecipeStore();
  const bodyData = useUserStore((s) => s.bodyData);
  const goal = useUserStore((s) => s.goal);

  const [ingredients, setIngredients] = useState(currentIngredients);
  const [people, setPeople] = useState(1);
  const [cookTime, setCookTime] = useState(20);
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('简单');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setInterval(() => setRetryAfter((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  function updateAmount(index: number, amount: string) {
    setIngredients((prev) => prev.map((it, i) => (i === index ? { ...it, amount } : it)));
  }

  function removeAt(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  async function runGenerate() {
    if (ingredients.length === 0) return;
    setGenerating(true);
    setError('');
    const targetCalories = estimateTargetCalories();
    try {
      const params: RecipeGenerateParams = {
        ingredients,
        people,
        cookTime,
        difficulty,
        user: {
          caloriesTarget: targetCalories,
          goal: goal?.type,
        },
      };
      const recipe = await generateRecipe(params);
      selectRecipe(recipe);
      router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } });
    } catch (e: any) {
      if (e?.response?.status === 429) {
        setRetryAfter(Number(e.response.data?.error?.detail?.retryAfterSeconds || 35));
      }
      setError((e as Error).message || '生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  }

  /** 估算目标热量（Mifflin-St Jeor 基础代谢 × 活动系数 1.4） */
  function estimateTargetCalories(): number | undefined {
    if (!bodyData) return undefined;
    const s = bodyData.gender === '男' ? 5 : -161;
    const bmr = 10 * bodyData.weight + 6.25 * bodyData.height - 5 * bodyData.age + s;
    const base = bmr * 1.4;
    if (goal?.type === '减脂') return Math.round(base * 0.85);
    if (goal?.type === '增肌') return Math.round(base * 1.1);
    return Math.round(base);
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
              onPress={() => setPeople((p) => Math.max(1, p - 1))}
              style={[styles.stepBtn, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="remove" size={18} color={colors.text} />
            </Pressable>
            <ThemedText type="subtitle">{people}</ThemedText>
            <Pressable
              onPress={() => setPeople((p) => Math.min(8, p + 1))}
              style={[styles.stepBtn, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="add" size={18} color={colors.text} />
            </Pressable>
          </View>

          <ThemedText type="smallBold" style={styles.condLabel}>
            烹饪时间
          </ThemedText>
          <View style={styles.chips}>
            {COOK_TIMES.map((t) => (
              <Pressable key={t} onPress={() => setCookTime(t)}>
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
              <Pressable key={d} onPress={() => setDifficulty(d)}>
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
        </Card>

        {error ? <ThemedText themeColor="danger">{error}</ThemedText> : null}

        {generating ? (
          <Card style={styles.generating}>
            <ThemedText type="subtitle">AI 大厨正在烹饪...</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              根据 {ingredients.length} 种食材定制专属菜谱，约需几秒
            </ThemedText>
          </Card>
        ) : (
          <Button
            title={retryAfter > 0 ? `${retryAfter} 秒后可重试` : '生成菜谱'}
            icon="sparkles"
            size="large"
            onPress={runGenerate}
            disabled={ingredients.length === 0 || retryAfter > 0}
          />
        )}

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
  tip: { textAlign: 'center' },
});

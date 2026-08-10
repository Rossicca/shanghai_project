import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { RecipeVideoSection } from '@/components/recipe/RecipeVideoSection';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { findHealthInspiration } from '@/data/health-inspirations';
import { useTheme } from '@/hooks/use-theme';
import { inspirationImageUrl } from '@/services/media';
import { useInspirationStore } from '@/store/inspirationStore';
import { useRecipeStore } from '@/store/recipeStore';
import { useUserStore } from '@/store/userStore';
import type { Recipe } from '@/types/recipe';

export default function HealthInspirationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const inspiration = findHealthInspiration(id);
  const goal = useUserStore((state) => state.goal);
  const setIngredients = useRecipeStore((state) => state.setIngredients);
  const savedIds = useInspirationStore((state) => state.savedIds);
  const toggleSaved = useInspirationStore((state) => state.toggleSaved);
  const loadInspirations = useInspirationStore((state) => state.loadLocal);

  useEffect(() => {
    void loadInspirations();
  }, [loadInspirations]);

  if (!inspiration) {
    return (
      <ThemedView style={styles.empty}>
        <Ionicons name="restaurant-outline" size={42} color={colors.textSecondary} />
        <ThemedText type="subtitle">这条饮食灵感不存在</ThemedText>
        <Button title="返回菜谱" onPress={() => router.replace('/recipe')} />
      </ThemedView>
    );
  }

  function startMaking() {
    if (!inspiration) return;
    setIngredients(inspiration.ingredients.map((name, index) => ({
      id: `${inspiration.id}-${index}`,
      name,
      amount: '适量',
      confidence: 1,
      category: '灵感食材',
    })));
    router.push({ pathname: '/recipe/generate', params: { mealType: inspiration.mealType } });
  }

  const matchedGoal = goal && inspiration.goals.includes(goal.type);
  const saved = savedIds.includes(inspiration.id);
  const videoRecipe: Recipe = {
    id: `inspiration-${inspiration.id}`,
    name: inspiration.title,
    videoSearchAliases: inspiration.videoSearchAliases,
    description: inspiration.description,
    coverEmoji: '',
    sourceVideo: inspiration.sourceVideo
      ? { ...inspiration.sourceVideo, coverUrl: inspirationImageUrl(inspiration.sourceVideo.coverUrl || inspiration.image) }
      : null,
    calories: inspiration.calories,
    protein: inspiration.protein,
    carbs: 0,
    fat: 0,
    ingredients: inspiration.ingredients.map((name) => ({ name, amount: '适量' })),
    steps: [
      `准备${inspiration.ingredients.join('、')}。`,
      `按${inspiration.title}的常见做法处理主食材并完成搭配。`,
      '装盘后按个人训练目标调整份量。',
    ],
    cookTime: inspiration.time,
    difficulty: inspiration.time <= 15 ? '简单' : '中等',
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="返回菜谱" onPress={() => router.back()} style={[styles.headerButton, { backgroundColor: colors.card }]}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold">健康饮食灵感</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">先了解，再跟着匹配视频做</ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? '取消收藏这条饮食灵感' : '收藏这条饮食灵感'}
            onPress={() => void toggleSaved(inspiration.id)}
            style={[styles.headerButton, { backgroundColor: saved ? colors.primarySoft : colors.card }]}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={21} color={saved ? colors.primary : colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Image source={{ uri: inspirationImageUrl(inspiration.image) }} style={styles.heroImage} contentFit="cover" transition={180} />
            <View pointerEvents="none" style={styles.heroShade} />
            <View style={styles.heroCopy}>
              <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>{inspiration.meal}</Text></View>
              <Text style={styles.heroTitle}>{inspiration.title}</Text>
              <Text style={styles.heroDescription}>{inspiration.description}</Text>
            </View>
          </View>

          <View style={styles.metrics}>
            <Metric icon="time-outline" value={`${inspiration.time} 分钟`} label="预计时间" />
            <Metric icon="flame-outline" value={`${inspiration.calories} kcal`} label="参考热量" />
            <Metric icon="barbell-outline" value={`${inspiration.protein} g`} label="参考蛋白质" />
          </View>

          <Card style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="sparkles-outline" size={19} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle">为什么值得尝试</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{inspiration.bestFor}</ThemedText>
              </View>
            </View>
            <View style={styles.highlightList}>
              {inspiration.highlights.map((item) => (
                <View key={item} style={[styles.highlight, { backgroundColor: colors.backgroundElement }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                  <ThemedText type="smallBold">{item}</ThemedText>
                </View>
              ))}
            </View>
            {goal ? (
              <View style={[styles.goalNote, { backgroundColor: matchedGoal ? colors.primarySoft : colors.yellowSoft }]}>
                <Ionicons name={matchedGoal ? 'checkmark-circle-outline' : 'options-outline'} size={18} color={matchedGoal ? colors.primary : '#B07A26'} />
                <ThemedText type="small" style={{ flex: 1 }}>
                  {matchedGoal
                    ? `它与当前“${goal.type}”目标较匹配，AI 仍会按你的身体数据调整份量。`
                    : `当前目标是“${goal.type}”，生成做法时 AI 会重新调整食材和份量，不会照搬示例。`}
                </ThemedText>
              </View>
            ) : null}
          </Card>

          <Card style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.blueSoft }]}><Ionicons name="basket-outline" size={19} color="#557DB3" /></View>
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle">常见搭配食材</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">进入生成页后仍然可以增删，不要求全部都有</ThemedText>
              </View>
            </View>
            <View style={styles.ingredientList}>
              {inspiration.ingredients.map((ingredient) => (
                <View key={ingredient} style={[styles.ingredient, { borderColor: colors.border }]}>
                  <Ionicons name="leaf-outline" size={15} color={colors.primary} />
                  <ThemedText type="smallBold">{ingredient}</ThemedText>
                </View>
              ))}
            </View>
          </Card>

          <RecipeVideoSection
            recipe={videoRecipe}
            maxVideos={1}
            hidePlatformSearches
            title="制作步骤视频"
            description={`只展示与“${inspiration.title}”菜名一致且通过质量筛选的制作教程`}
          />

          <View style={[styles.evidence, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="library-outline" size={19} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">饮食原则说明</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">灵感遵循食物多样、合理搭配和规律进餐原则；热量与蛋白质是一般估算，不替代医学营养建议。</ThemedText>
            </View>
          </View>

          <Button title="用这个灵感生成个性化做法" icon="sparkles-outline" onPress={startMaking} size="large" />
          <Button title="看看其他饮食灵感" variant="text" onPress={() => router.back()} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Metric({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  const colors = useTheme();
  return (
    <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safeArea: { flex: 1 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  headerButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
  hero: { height: 310, borderRadius: Radius.card, overflow: 'hidden', position: 'relative', justifyContent: 'flex-end' },
  heroImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, heroShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(5,18,13,0.34)' },
  heroCopy: { padding: Spacing.four, gap: Spacing.two }, heroBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.chip },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' }, heroTitle: { color: '#fff', fontSize: 28, lineHeight: 34, fontWeight: '900' }, heroDescription: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 21 },
  metrics: { flexDirection: 'row', gap: Spacing.two }, metric: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: 3 },
  section: { gap: Spacing.three }, sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, sectionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  highlightList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, highlight: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
  goalNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.button },
  ingredientList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, ingredient: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, paddingHorizontal: 12, borderRadius: Radius.chip },
  evidence: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.card },
});

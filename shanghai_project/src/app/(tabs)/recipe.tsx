import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeList } from '@/components/recipe/RecipeList';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { HEALTH_INSPIRATIONS, type HealthInspiration } from '@/data/health-inspirations';
import { useTheme } from '@/hooks/use-theme';
import { inspirationImageUrl } from '@/services/media';
import { useInspirationStore } from '@/store/inspirationStore';
import { useRecipeStore } from '@/store/recipeStore';
import { useUserStore } from '@/store/userStore';
import type { Recipe } from '@/types/recipe';

const HEALTH_FILTERS = ['全部', '早餐', '正餐', '加餐', '素食'] as const;
const HEALTH_BATCH_SIZE = 8;

function prioritizeVideoBacked(items: HealthInspiration[]) {
  const bilibili = items.filter((item) => item.sourceVideo?.platform === 'bilibili');
  const douyin = items.filter((item) => item.sourceVideo?.platform === 'douyin');
  const verified: HealthInspiration[] = [];
  for (let index = 0; index < Math.max(bilibili.length, douyin.length); index += 1) {
    if (bilibili[index]) verified.push(bilibili[index]);
    if (douyin[index]) verified.push(douyin[index]);
  }
  return [...verified, ...items.filter((item) => !item.sourceVideo)];
}

export default function RecipeTab() {
  const colors = useTheme();
  const goal = useUserStore((state) => state.goal);
  const { savedRecipes, recipeHistory, saveRecipe, unsaveRecipe, loadLocal, selectRecipe } = useRecipeStore();
  const { savedIds: savedInspirationIds, loadLocal: loadInspirations, toggleSaved: toggleInspiration } = useInspirationStore();
  const [healthFilter, setHealthFilter] = useState<(typeof HEALTH_FILTERS)[number]>('全部');
  const [batchOffset, setBatchOffset] = useState(0);

  useEffect(() => {
    loadLocal();
    loadInspirations();
  }, [loadInspirations, loadLocal]);

  const savedIds = new Set(savedRecipes.map((recipe) => recipe.id));
  const healthPool = prioritizeVideoBacked([...HEALTH_INSPIRATIONS]
    .filter((item) => healthFilter === '全部' || item.group === healthFilter)
    .sort((a, b) => {
      if (!goal) return 0;
      return Number(b.goals.includes(goal.type)) - Number(a.goals.includes(goal.type));
    }));
  const healthPicks = healthPool.length <= HEALTH_BATCH_SIZE
    ? healthPool
    : Array.from({ length: HEALTH_BATCH_SIZE }, (_, index) => healthPool[(batchOffset + index) % healthPool.length]);
  const savedInspirationSet = new Set(savedInspirationIds);

  function openRecipe(recipe: Recipe) {
    selectRecipe(recipe);
    router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } });
  }

  function openHealthPick(pick: HealthInspiration) {
    router.push({ pathname: '/recipe/inspiration/[id]', params: { id: pick.id } });
  }

  function selectHealthFilter(filter: (typeof HEALTH_FILTERS)[number]) {
    setHealthFilter(filter);
    setBatchOffset(0);
  }

  function showNextHealthBatch() {
    if (healthPool.length <= HEALTH_BATCH_SIZE) return;
    setBatchOffset((offset) => (offset + HEALTH_BATCH_SIZE) % healthPool.length);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.title}>今天吃什么？</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
                {goal ? `结合“${goal.type}”目标，为你准备更合适的选择` : '从手边食材开始，也可以直接挑一份健康灵感'}
              </ThemedText>
            </View>
            <Pressable accessibilityLabel="查看菜谱收藏" onPress={() => router.push('/favorites')} style={[styles.headerAction, { backgroundColor: colors.card }]}>
              <Ionicons name="bookmark-outline" size={21} color={colors.text} />
            </Pressable>
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push('/camera/scan')} style={[styles.cameraHero, { backgroundColor: colors.primary }]}>
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={29} color="#fff" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.cameraTitle}>拍下手边食材</Text>
              <Text style={styles.cameraSubtitle}>识别食材后，AI 会给出 6 道可选菜谱和缺少的配料</Text>
              <View style={styles.cameraSteps}>
                <Text style={styles.cameraStep}>识别</Text>
                <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.72)" />
                <Text style={styles.cameraStep}>挑选</Text>
                <Ionicons name="arrow-forward" size={12} color="rgba(255,255,255,0.72)" />
                <Text style={styles.cameraStep}>跟着视频做</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#fff" />
          </Pressable>

          <Pressable onPress={() => router.push('/recipe/generate')} style={styles.manualEntry}>
            <Ionicons name="create-outline" size={17} color={colors.primary} />
            <Text style={[styles.manualText, { color: colors.primary }]}>没有照片？手动输入食材</Text>
          </Pressable>

          <View style={styles.sectionHeading}>
            <View>
              <ThemedText type="subtitle">健康饮食灵感</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">共 {healthPool.length} 种 · 已核验视频优先，其他内容实时匹配</ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="换一批健康饮食灵感"
              disabled={healthPool.length <= HEALTH_BATCH_SIZE}
              onPress={showNextHealthBatch}
              style={({ pressed }) => [
                styles.refreshButton,
                { backgroundColor: colors.primarySoft, opacity: healthPool.length <= HEALTH_BATCH_SIZE ? 0.45 : pressed ? 0.7 : 1 },
              ]}>
              <Ionicons name="refresh" size={16} color={colors.primary} />
              <Text style={[styles.refreshText, { color: colors.primary }]}>换一批</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
            {HEALTH_FILTERS.map((filter) => {
              const selected = filter === healthFilter;
              return (
                <Pressable key={filter} onPress={() => selectHealthFilter(filter)} style={[styles.filterChip, { backgroundColor: selected ? colors.primary : colors.backgroundElement }]}>
                  <Text style={[styles.filterText, { color: selected ? '#fff' : colors.text }]}>{filter}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.pickGrid}>
            {healthPicks.map((pick) => (
              <Pressable key={pick.id} onPress={() => openHealthPick(pick)} style={[styles.pickCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.pickImageWrap, { backgroundColor: colors.backgroundElement }]}>
                  <Image source={{ uri: inspirationImageUrl(pick.image) }} style={styles.pickImage} resizeMode="cover" />
                  <View style={styles.imageShade} />
                  <View style={styles.mealBadge}><Text style={styles.mealBadgeText}>{pick.meal}</Text></View>
                  {pick.sourceVideo ? (
                    <View style={styles.videoBadge}>
                      <Ionicons name={pick.sourceVideo.platform === 'douyin' ? 'musical-notes' : 'tv'} size={11} color="#FFFFFF" />
                      <Text style={styles.videoBadgeText}>{pick.sourceVideo.platform === 'douyin' ? '抖音教程' : 'B站教程'}</Text>
                    </View>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={savedInspirationSet.has(pick.id) ? `取消收藏${pick.title}` : `收藏${pick.title}`}
                    hitSlop={6}
                    onPress={(event) => {
                      event.stopPropagation();
                      void toggleInspiration(pick.id);
                    }}
                    style={({ pressed }) => [styles.saveButton, { opacity: pressed ? 0.72 : 1 }]}>
                    <Ionicons name={savedInspirationSet.has(pick.id) ? 'bookmark' : 'bookmark-outline'} size={19} color="#FFFFFF" />
                  </Pressable>
                </View>
                <View style={styles.pickBody}>
                  <ThemedText type="smallBold" numberOfLines={1}>{pick.title}</ThemedText>
                  <View style={styles.pickMeta}>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary">{pick.time} 分钟 · 约 {pick.calories} 千卡</ThemedText>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={[styles.balanceGuide, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ThemedText type="smallBold">一餐的简单搭配思路</ThemedText>
            <View style={styles.guideRows}>
              <GuideRow icon="leaf-outline" title="蔬菜" copy="至少一种深色蔬菜，增加食物多样性" tint={colors.primary} />
              <GuideRow icon="fish-outline" title="蛋白质" copy="鸡蛋、奶、豆制品、鱼肉或瘦肉任选一种" tint="#557DB3" />
              <GuideRow icon="nutrition-outline" title="主食" copy="结合当天训练量选择全谷物、薯类或米面" tint="#B07A26" />
            </View>
          </View>

          {savedRecipes.length > 0 ? (
            <View style={styles.listSection}>
              <View style={styles.listHeading}><ThemedText type="subtitle">我的收藏</ThemedText><Pressable onPress={() => router.push('/favorites')}><ThemedText type="smallBold" themeColor="primary">查看全部</ThemedText></Pressable></View>
              <RecipeList recipes={savedRecipes.slice(0, 4)} onPress={openRecipe} onSave={(recipe) => unsaveRecipe(recipe.id)} savedIds={savedIds} />
            </View>
          ) : null}

          {recipeHistory.length > 0 ? (
            <View style={styles.listSection}>
              <ThemedText type="subtitle">最近生成</ThemedText>
              <RecipeList recipes={recipeHistory.slice(0, 5)} onPress={openRecipe} onSave={(recipe) => (savedIds.has(recipe.id) ? unsaveRecipe(recipe.id) : saveRecipe(recipe))} savedIds={savedIds} />
            </View>
          ) : (
            <View style={[styles.historyEmpty, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="time-outline" size={19} color={colors.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">生成过的菜谱会保存在这里，方便下次继续做。</ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function GuideRow({ icon, title, copy, tint }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string; tint: string }) {
  return (
    <View style={styles.guideRow}>
      <View style={[styles.guideIcon, { backgroundColor: `${tint}18` }]}><Ionicons name={icon} size={18} color={tint} /></View>
      <View style={{ flex: 1 }}><ThemedText type="smallBold">{title}</ThemedText><ThemedText type="small" themeColor="textSecondary">{copy}</ThemedText></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '800' },
  subtitle: { lineHeight: 19, marginTop: 2 },
  headerAction: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cameraHero: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card },
  cameraIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.17)' },
  cameraTitle: { color: '#fff', fontSize: 18, lineHeight: 24, fontWeight: '800' },
  cameraSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 18, marginTop: 2 },
  cameraSteps: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.two },
  cameraStep: { color: '#fff', fontSize: 10, fontWeight: '700' },
  manualEntry: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -Spacing.one },
  manualText: { fontSize: 12, fontWeight: '700' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: Spacing.two },
  refreshButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 12, borderRadius: Radius.button },
  refreshText: { fontSize: 12, fontWeight: '800' },
  filterList: { gap: Spacing.two, paddingRight: Spacing.three },
  filterChip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: Radius.chip },
  filterText: { fontSize: 12, fontWeight: '800' },
  pickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pickCard: { flexGrow: 1, flexBasis: '47%', maxWidth: '49%', minWidth: 148, borderRadius: Radius.card, borderWidth: 1, overflow: 'hidden' },
  pickImageWrap: { height: 106, position: 'relative' },
  pickImage: { width: '100%', height: '100%' },
  imageShade: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.12)' },
  mealBadge: { position: 'absolute', top: Spacing.two, left: Spacing.two, backgroundColor: 'rgba(0,0,0,0.56)', borderRadius: Radius.chip, paddingHorizontal: 9, paddingVertical: 4 },
  mealBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  videoBadge: { position: 'absolute', left: Spacing.two, bottom: Spacing.two, minHeight: 24, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(7,20,15,0.72)', borderRadius: Radius.chip, paddingHorizontal: 8, paddingVertical: 4 },
  videoBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  saveButton: { position: 'absolute', top: Spacing.two, right: Spacing.two, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(7,20,15,0.68)', alignItems: 'center', justifyContent: 'center' },
  pickBody: { padding: Spacing.two, gap: 5 },
  pickMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceGuide: { borderWidth: 1, borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.three },
  guideRows: { gap: Spacing.three },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  guideIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  listSection: { gap: Spacing.two },
  listHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyEmpty: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.card },
});

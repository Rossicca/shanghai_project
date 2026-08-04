import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MoreSheet } from '@/components/home/MoreSheet';
import { NotificationSheet } from '@/components/home/NotificationSheet';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlanStore } from '@/store/planStore';
import { useRecipeStore } from '@/store/recipeStore';
import { useUserStore } from '@/store/userStore';
import { useWorkoutStore } from '@/store/workoutStore';
import type { Recipe } from '@/types/recipe';
import { calcBMI, targetCalories, macroSplit, bmiLabel } from '@/utils/nutrition';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

export default function HomeScreen() {
  const colors = useTheme();
  const { bodyData, goal, bodyHistory } = useUserStore();
  const { recipeHistory, loadLocal: loadRecipes, selectRecipe } = useRecipeStore();
  const { history: workoutHistory, loadLocal: loadWorkouts } = useWorkoutStore();
  const { plan, loadPlan } = usePlanStore();
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    loadRecipes();
    loadWorkouts();
    loadPlan();
  }, [loadRecipes, loadWorkouts, loadPlan]);

  const todayKey = new Date().toDateString();
  const todayRecipes = recipeHistory.filter(
    (r) => r.createdAt && new Date(r.createdAt).toDateString() === todayKey
  );
  const todayIntake = todayRecipes.reduce((s, r) => s + (r.calories ?? 0), 0);
  const burned = workoutHistory.reduce((s, v) => s + (v.calories ?? 0), 0);
  const target = targetCalories(bodyData, goal) ?? 1800;
  const macros = target ? macroSplit(target, goal?.type || '健康') : null;
  const pct = Math.round((todayIntake / target) * 100);
  const remain = Math.max(0, target - todayIntake);
  const bmi = calcBMI(bodyData);

  const streak = bodyHistory.length;
  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

  function openRecipe(r: Recipe) {
    selectRecipe(r);
    router.push({ pathname: '/recipe/[id]', params: { id: r.id } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* 品牌行 */}
          <View style={styles.brandRow}>
            <View style={styles.brand}>
              <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
                <Ionicons name="leaf" size={19} color="#fff" />
              </View>
            </View>
            <View style={styles.topIcons}>
              <Pressable hitSlop={8} onPress={() => setNoticesOpen(true)}>
                <Ionicons name="notifications-outline" size={21} color={colors.textSecondary} />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => setMoreOpen(true)}>
                <Ionicons name="ellipsis-horizontal" size={21} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* 问候 */}
          <View style={styles.greet}>
            <ThemedText style={styles.greetTitle}>早上好，一起动起来 🌿</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {today} · 已坚持记录 {streak} 天
            </ThemedText>
          </View>

          {/* ====== 训练计划 Hero —— 首页首屏核心 ====== */}
          {plan ? (
            /* 已有计划 → 展示计划详情 */
            <View style={styles.heroSection}>
              <View style={[styles.planHeroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.planHeroHead}>
                  <View style={styles.planHeroTitleRow}>
                    <View style={[styles.planHeroIcon, { backgroundColor: colors.primarySoft }]}>
                      <Ionicons name="calendar" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="subtitle">我的训练计划</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">{plan.summary}</ThemedText>
                    </View>
                  </View>
                  <Pressable
                    style={[styles.planAdjustBtn, { borderColor: colors.primary }]}
                    onPress={() => router.push('/workout/plan')}>
                    <Text style={[styles.planAdjustText, { color: colors.primary }]}>调整计划</Text>
                  </Pressable>
                </View>

                {/* 本周概览 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
                  {plan.weeklySchedule.map((day, i) => (
                    <View key={day.day} style={[styles.dayCard, { backgroundColor: colors.backgroundElement }]}>
                      <Text style={[styles.dayLabel, { color: colors.textSecondary }]}>
                        周{WEEKDAY_LABELS[i % 7]}
                      </Text>
                      <Text style={[styles.dayTitle, { color: colors.text }]} numberOfLines={1}>
                        {day.title}
                      </Text>
                      <Text style={[styles.dayDur, { color: colors.primary }]}>
                        {day.durationMinutes}分钟
                      </Text>
                      <View style={styles.dayExList}>
                        {day.exercises.slice(0, 3).map((ex, j) => (
                          <Text key={j} style={[styles.dayEx, { color: colors.textSecondary }]} numberOfLines={1}>
                            · {ex.name}
                          </Text>
                        ))}
                        {day.exercises.length > 3 ? (
                          <Text style={[styles.dayEx, { color: colors.textSecondary }]}>
                            +{day.exercises.length - 3} 个动作
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <Pressable
                  style={[styles.todayBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/workout/plan')}>
                  <Ionicons name="play-circle" size={20} color="#fff" />
                  <Text style={styles.todayBtnText}>查看完整计划</Text>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          ) : (
            /* 无计划 → 引导生成 */
            <View style={styles.heroSection}>
              <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.heroIconWrap, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="fitness" size={36} color={colors.primary} />
                </View>
                <Text style={[styles.heroTitle, { color: colors.text }]}>生成你的专属训练计划</Text>
                <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
                  AI 根据你的身体数据、健身目标和器械条件，{'\n'}制定每周个性化训练方案
                </Text>

                <View style={styles.heroTags}>
                  {bodyData ? (
                    <View style={[styles.heroTag, { backgroundColor: colors.successSoft }]}>
                      <Ionicons name="body" size={14} color={colors.success} />
                      <Text style={[styles.heroTagText, { color: colors.success }]}>
                        {bodyData.height}cm / {bodyData.weight}kg
                      </Text>
                    </View>
                  ) : null}
                  {goal ? (
                    <View style={[styles.heroTag, { backgroundColor: colors.primarySoft }]}>
                      <Ionicons name="flag" size={14} color={colors.primary} />
                      <Text style={[styles.heroTagText, { color: colors.primary }]}>{goal.type}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.heroTag, { backgroundColor: colors.yellowSoft }]}>
                    <Ionicons name="time" size={14} color="#B07A26" />
                    <Text style={[styles.heroTagText, { color: '#B07A26' }]}>AI 定制</Text>
                  </View>
                </View>

                <Pressable
                  style={[styles.heroBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/workout/plan')}>
                  <Ionicons name="calendar-outline" size={20} color="#fff" />
                  <Text style={styles.heroBtnText}>开始定制训练计划</Text>
                </Pressable>

                {!bodyData && (
                  <Pressable onPress={() => router.push('/profile/body')}>
                    <ThemedText type="small" themeColor="primary" style={{ textAlign: 'center' }}>
                      先填写身体数据，让 AI 更懂你 ›
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* 今日目标（线形进度） */}
          <View style={[styles.ringCard, { backgroundColor: colors.card }]}>
            <View style={styles.ringHead}>
              <ThemedText type="smallBold">今日目标</ThemedText>
              <View style={[styles.pill, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.pillText, { color: colors.success }]}>热量 · {goal?.type ?? '健康'}</Text>
              </View>
            </View>
            <View style={styles.lineRow}>
              <View style={styles.lineBarWrap}>
                <View style={[styles.lineBar, { backgroundColor: colors.backgroundSelected }]}>
                  <View style={[styles.lineFill, { width: `${Math.min(100, pct)}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.linePct, { color: colors.text }]}>
                  {Math.min(100, pct)}
                  <Text style={{ fontSize: 11 }}>%</Text>
                </Text>
              </View>
              <View style={styles.ringInfo}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoKey, { color: colors.textSecondary }]}>已摄入</Text>
                  <Text style={[styles.infoVal, { color: colors.text }]}>{todayIntake} 千卡</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoKey, { color: colors.textSecondary }]}>运动消耗</Text>
                  <Text style={[styles.infoVal, { color: colors.text }]}>{burned} 千卡</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoKey, { color: colors.textSecondary }]}>还可摄入</Text>
                  <Text style={[styles.infoVal, { color: colors.success }]}>{remain} 千卡</Text>
                </View>
              </View>
            </View>
            <Pressable
              style={[styles.cta, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/camera/scan')}>
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.ctaText}>拍照记一餐</Text>
            </Pressable>
          </View>

          {/* 金刚区 */}
          <View style={styles.section}>
            <ThemedText type="smallBold" style={styles.sectionTitle}>
              快捷功能
            </ThemedText>
            <View style={styles.grid}>
              <Pressable style={styles.cell} onPress={() => router.push('/camera/scan')}>
                <View style={[styles.cellIcon, { backgroundColor: colors.successSoft }]}>
                  <Ionicons name="camera" size={22} color={colors.success} />
                </View>
                <Text style={[styles.cellLabel, { color: colors.textSecondary }]}>拍照识别</Text>
              </Pressable>
              <Pressable style={styles.cell} onPress={() => router.push('/workout')}>
                <View style={[styles.cellIcon, { backgroundColor: colors.yellowSoft }]}>
                  <Ionicons name="play-circle" size={22} color="#B07A26" />
                </View>
                <Text style={[styles.cellLabel, { color: colors.textSecondary }]}>训练视频</Text>
              </Pressable>
              <Pressable style={styles.cell} onPress={() => router.push('/recipe')}>
                <View style={[styles.cellIcon, { backgroundColor: colors.pinkSoft }]}>
                  <Ionicons name="restaurant" size={22} color="#C0664C" />
                </View>
                <Text style={[styles.cellLabel, { color: colors.textSecondary }]}>AI 菜谱</Text>
              </Pressable>
              <Pressable style={styles.cell} onPress={() => router.push('/profile/body')}>
                <View style={[styles.cellIcon, { backgroundColor: colors.blueSoft }]}>
                  <Ionicons name="body" size={22} color="#3E6FA8" />
                </View>
                <Text style={[styles.cellLabel, { color: colors.textSecondary }]}>身体数据</Text>
              </Pressable>
            </View>
          </View>

          {/* 数据行 */}
          <View style={styles.dataStrip}>
            <View style={[styles.dataCell, { backgroundColor: colors.card }]}>
              <Text style={[styles.dataNum, { color: colors.text }]}>{bmi ? bmi.toFixed(1) : '--'}</Text>
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>BMI</Text>
            </View>
            <View style={[styles.dataCell, { backgroundColor: colors.card }]}>
              <Text style={[styles.dataNum, { color: colors.text }]}>
                {bodyData ? `${bodyData.weight}kg` : '--'}
              </Text>
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>体重</Text>
            </View>
            <View style={[styles.dataCell, { backgroundColor: colors.card }]}>
              <Text style={[styles.dataNum, { color: colors.text }]}>{streak}</Text>
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>连续记录</Text>
            </View>
            <View style={[styles.dataCell, { backgroundColor: colors.card }]}>
              <Text style={[styles.dataNum, { color: colors.text }]}>{burned}</Text>
              <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>千卡消耗</Text>
            </View>
          </View>

          {/* 今日饮食建议 */}
          {macros && (
            <View style={styles.section}>
              <View style={styles.feedHead}>
                <ThemedText type="smallBold" style={styles.sectionTitle}>
                  今日饮食建议
                </ThemedText>
                <Pressable onPress={() => router.push('/recipe')}>
                  <Text style={[styles.more, { color: colors.success }]}>去菜谱 ›</Text>
                </Pressable>
              </View>
              <View style={[styles.dietBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.dietItem}>
                  <Text style={[styles.dietVal, { color: colors.primary }]}>{target}千卡</Text>
                  <Text style={[styles.dietLabel, { color: colors.textSecondary }]}>目标热量</Text>
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
            </View>
          )}

          {/* 今日推荐 */}
          <View style={styles.section}>
            <View style={styles.feedHead}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                今日推荐
              </ThemedText>
              <Pressable onPress={() => router.push('/recipe')}>
                <Text style={[styles.more, { color: colors.success }]}>更多 ›</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedScroll}>
              {todayRecipes.length > 0 ? (
                todayRecipes.slice(0, 4).map((r) => (
                  <Pressable key={r.id} style={[styles.feedCard, { backgroundColor: colors.card }]} onPress={() => openRecipe(r)}>
                    <View style={[styles.feedCover, { backgroundColor: colors.primarySoft }]}>
                      <Text style={styles.feedEmoji}>{r.coverEmoji}</Text>
                    </View>
                    <View style={styles.feedBody}>
                      <Text style={[styles.feedTitle, { color: colors.text }]} numberOfLines={2}>
                        {r.name}
                      </Text>
                      <View style={styles.feedMeta}>
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{r.cookTime} 分钟</Text>
                        <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>{r.calories} 千卡</Text>
                      </View>
                    </View>
                  </Pressable>
                ))
              ) : (
                <Pressable
                  style={[styles.feedCard, styles.feedEmpty, { backgroundColor: colors.card }]}
                  onPress={() => router.push('/camera/scan')}>
                  <View style={[styles.feedCover, { backgroundColor: colors.successSoft }]}>
                    <Ionicons name="camera" size={30} color={colors.success} />
                  </View>
                  <View style={styles.feedBody}>
                    <Text style={[styles.feedTitle, { color: colors.text }]}>还没有今天的记录</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>拍个照，AI 帮你做菜 ›</Text>
                  </View>
                </Pressable>
              )}
            </ScrollView>
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
            健康建议仅供参考，非医疗用途 · 演示数据
          </ThemedText>
        </ScrollView>
      </SafeAreaView>

      <NotificationSheet visible={noticesOpen} onClose={() => setNoticesOpen(false)} />
      <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingBottom: Spacing.five, gap: Spacing.three },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.three + 4, paddingTop: Spacing.two,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoMark: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontSize: 19, fontWeight: '800', letterSpacing: 0.5 },
  topIcons: { flexDirection: 'row', gap: 14 },
  greet: { paddingHorizontal: Spacing.four, gap: 3 },
  greetTitle: { fontSize: 22, fontWeight: '800', lineHeight: 30 },

  // ====== 训练计划 Hero ======
  heroSection: { paddingHorizontal: Spacing.three + 4 },

  heroCard: {
    borderRadius: Radius.card, borderWidth: 1, padding: Spacing.four,
    alignItems: 'center', gap: Spacing.two,
  },
  heroIconWrap: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  heroDesc: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  heroTags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, justifyContent: 'center' },
  heroTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.chip },
  heroTagText: { fontSize: 12, fontWeight: '600' },
  heroBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two,
    paddingHorizontal: Spacing.five, paddingVertical: 14, borderRadius: Radius.button,
    marginTop: Spacing.one, width: '100%',
  },
  heroBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  planHeroCard: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.three, gap: Spacing.three },
  planHeroHead: { gap: Spacing.two },
  planHeroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  planHeroIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  planAdjustBtn: { alignSelf: 'flex-end', paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.chip, borderWidth: 1 },
  planAdjustText: { fontSize: 13, fontWeight: '700' },
  weekScroll: { maxHeight: 170 },
  dayCard: { width: 148, padding: Spacing.two + 2, borderRadius: 14, marginRight: Spacing.two, gap: 5 },
  dayLabel: { fontSize: 11, fontWeight: '600' },
  dayTitle: { fontSize: 13, fontWeight: '800' },
  dayDur: { fontSize: 12, fontWeight: '700' },
  dayExList: { gap: 1 },
  dayEx: { fontSize: 11, lineHeight: 17 },
  todayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.two, paddingVertical: 12, borderRadius: Radius.button,
  },
  todayBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // 今日目标卡
  ringCard: { marginHorizontal: Spacing.three + 4, borderRadius: Radius.card, padding: Spacing.three },
  ringHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: '600' },
  lineRow: { gap: Spacing.three },
  lineBarWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  lineBar: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  lineFill: { height: '100%', borderRadius: 5 },
  linePct: { fontSize: 17, fontWeight: '800' },
  ringInfo: { gap: 9 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  infoKey: { fontSize: 12 },
  infoVal: { fontSize: 15, fontWeight: '700' },
  cta: {
    marginTop: 14, borderRadius: 14, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  section: { paddingHorizontal: Spacing.three + 4, gap: 10 },
  sectionTitle: { fontSize: 15 },
  grid: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, alignItems: 'center', gap: 7, paddingVertical: 10 },
  cellIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cellLabel: { fontSize: 11, fontWeight: '600' },
  dataStrip: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.three + 4 },
  dataCell: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center', gap: 2 },
  dataNum: { fontSize: 17, fontWeight: '800' },
  dataLabel: { fontSize: 10 },
  feedHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  more: { fontSize: 12, fontWeight: '600' },
  feedScroll: { gap: 12, paddingBottom: 6 },
  feedCard: { width: 158, borderRadius: 18, overflow: 'hidden' },
  feedCover: { height: 88, alignItems: 'center', justifyContent: 'center' },
  feedEmoji: { fontSize: 40 },
  feedBody: { padding: 10, gap: 5 },
  feedTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17, minHeight: 34 },
  feedMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // 饮食建议
  dietBar: { flexDirection: 'row', borderRadius: Radius.card, borderWidth: 1, padding: Spacing.three, marginTop: 4 },
  dietItem: { flex: 1, alignItems: 'center', gap: 2 },
  dietVal: { fontSize: 16, fontWeight: '800' },
  dietLabel: { fontSize: 10 },
  dietDiv: { width: 1, height: 22, alignSelf: 'center' },

  feedEmpty: {},
  tip: { textAlign: 'center', marginTop: Spacing.two, paddingHorizontal: Spacing.four },
});

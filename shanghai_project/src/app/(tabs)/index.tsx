import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostCard } from '@/components/community/PostCard';
import { FastingTimer } from '@/components/home/FastingTimer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCommunityStore } from '@/store/communityStore';
import { useRecipeStore } from '@/store/recipeStore';
import { useUserStore } from '@/store/userStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { fetchLatestWorkoutPlan } from '@/services/workout';
import { getToken } from '@/services/api';
import type { WorkoutPlan } from '@/types/workout';
import { calcBMI, estimateTargetCalories } from '@/utils/nutrition';
import { useWebHorizontalDrag } from '@/utils/webScroll';

export default function HomeScreen() {
  const colors = useTheme();
  const { bodyData, goal, bodyHistory } = useUserStore();
  const { recipeHistory, loadLocal: loadRecipes } = useRecipeStore();
  const { history: workoutHistory, loadLocal: loadWorkouts } = useWorkoutStore();
  const { posts: communityPosts, load: loadCommunityPosts, toggleLike } = useCommunityStore();
  const [fastingOpen, setFastingOpen] = useState(false);
  const [latestPlan, setLatestPlan] = useState<WorkoutPlan | null>(null);
  // 今日推荐推文区：支持鼠标拖拽平移
  const postScrollRef = useRef<ScrollView>(null);
  useWebHorizontalDrag(postScrollRef);

  useEffect(() => {
    loadRecipes();
    loadWorkouts();
    loadCommunityPosts();
    if (getToken()) fetchLatestWorkoutPlan().then(setLatestPlan).catch(() => setLatestPlan(null));
  }, [loadRecipes, loadWorkouts, loadCommunityPosts]);

  const todayKey = new Date().toDateString();
  const todayRecipes = recipeHistory.filter(
    (r) => r.createdAt && new Date(r.createdAt).toDateString() === todayKey
  );
  const todayIntake = todayRecipes.reduce((s, r) => s + (r.calories ?? 0), 0);
  const todayWorkouts = workoutHistory.filter(
    (video) => video.completedAt && new Date(video.completedAt).toDateString() === todayKey
  );
  const burned = todayWorkouts.reduce((sum, video) => sum + (video.calories ?? 0), 0);
  const target = estimateTargetCalories(bodyData, goal);
  const pct = target ? Math.round((todayIntake / target) * 100) : 0;
  const remain = target ? Math.max(0, target - todayIntake) : null;
  const bmi = calcBMI(bodyData);
  const bmiStatus = bmi == null ? '待填写' : bmi < 18.5 ? '偏低' : bmi < 24 ? '正常' : bmi < 28 ? '偏高' : '较高';
  const weeklyFrequency = goal?.weeklyFrequency ?? latestPlan?.planConditions?.weeklyFrequency ?? 3;
  const profileFields = bodyData
    ? [bodyData.height, bodyData.weight, bodyData.age, bodyData.gender, bodyData.waist, bodyData.hip, bodyData.bodyFat]
    : [];
  const profileCompleteness = bodyData
    ? Math.round((profileFields.filter((value) => value !== null && value !== undefined).length / 7) * 100)
    : 0;

  const streak = bodyHistory.length;
  const now = new Date();
  const today = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  const hour = now.getHours();
  const greeting = hour < 5
    ? '夜深了'
    : hour < 11
      ? '早上好'
      : hour < 14
        ? '中午好'
        : hour < 18
          ? '下午好'
          : '晚上好';
  const scheduleIndex = ((now.getDay() + 6) % 7);
  const todayPlanDay = latestPlan?.weeklySchedule?.[scheduleIndex % Math.max(latestPlan?.weeklySchedule?.length || 1, 1)];
  const todayDietDay = latestPlan?.dietPlan?.[scheduleIndex % Math.max(latestPlan?.dietPlan?.length || 1, 1)];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* 按时间变化的问候与常用入口 */}
          <View style={styles.greetRow}>
            <View style={styles.greet}>
              <ThemedText style={styles.greetTitle}>{greeting}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {today} · {goal ? `正在朝“${goal.type}”前进` : '从一份适合你的计划开始'}
              </ThemedText>
            </View>
            <View style={styles.topIcons}>
              <Pressable accessibilityLabel="查看通知" style={styles.headerIcon} onPress={() => router.push('/notifications')}>
                <Ionicons name="notifications-outline" size={21} color={colors.textSecondary} />
              </Pressable>
              <Pressable accessibilityLabel="打开设置" style={styles.headerIcon} onPress={() => router.push('/more')}>
                <Ionicons name="ellipsis-horizontal" size={21} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* 首页主任务：已有计划直接展示，没有计划时提供生成入口 */}
          <View style={styles.section}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (latestPlan) router.push({ pathname: '/workout/plan-result', params: { planId: latestPlan.planId } });
                else router.push('/workout/plan');
              }}
              style={[styles.planEntry, { backgroundColor: colors.primary }]}>
              <View style={styles.planTopRow}>
                <View style={styles.planIcon}>
                  <Ionicons name={latestPlan ? 'calendar' : 'sparkles'} size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{latestPlan ? '本周计划已准备好' : '生成专属训练与饮食计划'}</Text>
                  <Text style={styles.planDescription} numberOfLines={2}>
                    {latestPlan ? latestPlan.summary : '结合身体数据、目标、器械和每周频率进行安排'}
                  </Text>
                </View>
                <View style={styles.planArrow}>
                  <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                </View>
              </View>
              <View style={styles.planMetrics}>
                <PlanMetric label="身高" value={bodyData ? `${bodyData.height}cm` : '--'} />
                <PlanMetric label="体重" value={bodyData ? `${bodyData.weight}kg` : '--'} />
                <PlanMetric label="目标" value={goal?.type ?? '待设置'} />
                <PlanMetric label="频率" value={`每周${weeklyFrequency}次`} />
              </View>
              {latestPlan ? (
                <View style={styles.planPreview}>
                  {latestPlan.weeklySchedule.slice(0, 3).map((day) => (
                    <View key={day.day} style={styles.planDay}>
                      <Text style={styles.planDayNumber}>第{day.day}天</Text>
                      <Text style={styles.planDayTitle} numberOfLines={1}>{day.title}</Text>
                      <Text style={styles.planDayMeta}>{day.durationMinutes} 分钟</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </Pressable>
          </View>

          {/* 今日营养记录：没有身体资料时不显示伪造的默认热量目标。 */}
          <View style={[styles.ringCard, { backgroundColor: colors.card }]}>
            <View style={styles.ringHead}>
              <ThemedText type="smallBold">今日营养记录</ThemedText>
              <View style={[styles.pill, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.pillText, { color: colors.success }]}>
                  {target ? `参考目标 · ${target} 千卡` : '补全资料后计算'}
                </Text>
              </View>
            </View>
            <View style={styles.lineRow}>
              {/* 线形进度条 */}
              <View style={styles.lineBarWrap}>
                <View style={[styles.lineBar, { backgroundColor: colors.backgroundSelected }]}>
                  <View style={[styles.lineFill, { width: `${Math.min(100, pct)}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.linePct, { color: colors.text }]}>
                  {target ? Math.min(100, pct) : '--'}
                  {target ? <Text style={{ fontSize: 11 }}>%</Text> : null}
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
                  <Text style={[styles.infoVal, { color: colors.success }]}>{remain == null ? '--' : `${remain} 千卡`}</Text>
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

          {/* 高频入口 */}
          <View style={styles.section}>
            <View style={styles.actionGrid}>
              <Pressable style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => router.push('/camera/scan')}>
                <View style={[styles.actionIcon, { backgroundColor: colors.successSoft }]}>
                  <Ionicons name="camera" size={24} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">拍食材</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">识别后生成适合你的菜谱</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable style={[styles.actionCard, { backgroundColor: colors.card }]} onPress={() => router.push('/workout')}>
                <View style={[styles.actionIcon, { backgroundColor: colors.yellowSoft }]}>
                  <Ionicons name="play" size={24} color="#B07A26" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">去运动</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">按目标挑选跟练视频</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={styles.secondaryActions}>
              <Pressable style={styles.secondaryAction} onPress={() => router.push('/recipe')}>
                <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
                <ThemedText type="smallBold">菜谱库</ThemedText>
              </Pressable>
              <Pressable style={styles.secondaryAction} onPress={() => router.push('/profile/body')}>
                <Ionicons name="body-outline" size={18} color={colors.primary} />
                <ThemedText type="smallBold">身体数据</ThemedText>
              </Pressable>
              <Pressable style={styles.secondaryAction} onPress={() => setFastingOpen(true)}>
                <Ionicons name="timer-outline" size={18} color={colors.primary} />
                <ThemedText type="smallBold">断食钟</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* 身体状态 */}
          <View style={styles.section}>
            <View style={styles.feedHead}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>身体状态</ThemedText>
              <Pressable onPress={() => router.push('/profile/body')}><Text style={[styles.more, { color: colors.success }]}>更新数据</Text></Pressable>
            </View>
            <View style={styles.dataStrip}>
              <View style={[styles.dataCell, { backgroundColor: colors.card }]}>
                <Text style={[styles.dataNum, { color: colors.text }]}>{bmi ? bmi.toFixed(1) : '--'}</Text>
                <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>BMI · {bmiStatus}</Text>
              </View>
              <View style={[styles.dataCell, { backgroundColor: colors.card }]}>
                <Text style={[styles.dataNum, { color: colors.text }]}>{profileCompleteness}%</Text>
                <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>资料完整度</Text>
              </View>
              <View style={[styles.dataCell, { backgroundColor: colors.card }]}>
                <Text style={[styles.dataNum, { color: colors.text }]}>{streak}</Text>
                <Text style={[styles.dataLabel, { color: colors.textSecondary }]}>身体记录</Text>
              </View>
            </View>
            <Pressable
              style={[styles.statusHint, { backgroundColor: colors.backgroundElement }]}
              onPress={() => router.push(profileCompleteness < 70 ? '/profile/body' : '/workout/plan')}>
              <Ionicons
                name={profileCompleteness < 70 ? 'create-outline' : 'analytics-outline'}
                size={20}
                color={colors.primary}
              />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">
                  {profileCompleteness < 70 ? '补全可选围度，推荐会更细' : '身体资料已可用于个性化分析'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {profileCompleteness < 70
                    ? '腰围、臀围与体脂为可选项；BMI 只作健康筛查，不作为诊断。'
                    : `已记录 ${streak} 次身体数据，可重新生成更贴近现状的计划。`}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* 今天建议：训练、饮食和视频分别给出清晰下一步。 */}
          <View style={styles.section}>
            <View style={styles.feedHead}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>今天建议</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">来自你的最新计划</ThemedText>
            </View>
            <View style={styles.todayGrid}>
              <Pressable
                style={[styles.todayTask, { backgroundColor: colors.card }]}
                onPress={() => latestPlan
                  ? router.push({ pathname: '/workout/plan-result', params: { planId: latestPlan.planId } })
                  : router.push('/workout/plan')}>
                <View style={[styles.todayIcon, { backgroundColor: colors.successSoft }]}>
                  <Ionicons name="barbell-outline" size={22} color={colors.success} />
                </View>
                <View style={styles.todayBody}>
                  <ThemedText type="small" themeColor="textSecondary">训练</ThemedText>
                  <ThemedText type="smallBold" numberOfLines={1}>{todayPlanDay?.title || '先生成专属训练计划'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {todayPlanDay ? `${todayPlanDay.durationMinutes} 分钟 · 含热身与拉伸` : '结合目标、器械与每周频率安排'}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable style={[styles.todayTask, { backgroundColor: colors.card }]} onPress={() => router.push('/recipe')}>
                <View style={[styles.todayIcon, { backgroundColor: colors.yellowSoft }]}>
                  <Ionicons name="nutrition-outline" size={22} color="#A56C1E" />
                </View>
                <View style={styles.todayBody}>
                  <ThemedText type="small" themeColor="textSecondary">饮食</ThemedText>
                  <ThemedText type="smallBold" numberOfLines={1}>{todayDietDay?.focus || '查看健康饮食灵感'}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {todayDietDay?.meals?.slice(0, 2).map((meal) => meal.name).join(' · ') || '拍食材后按你的目标生成菜谱'}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable style={[styles.todayTask, { backgroundColor: colors.card }]} onPress={() => router.push('/workout')}>
                <View style={[styles.todayIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="play-circle-outline" size={23} color={colors.primary} />
                </View>
                <View style={styles.todayBody}>
                  <ThemedText type="small" themeColor="textSecondary">视频</ThemedText>
                  <ThemedText type="smallBold">让 AI 挑一节合适的内容</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">双击分类栏可换一组安全视频</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>

          {/* 社区精选 */}
          <View style={styles.section}>
            <View style={styles.feedHead}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                社区精选
              </ThemedText>
              <Pressable onPress={() => router.push('/community')}>
                <Text style={[styles.more, { color: colors.success }]}>更多 ›</Text>
              </Pressable>
            </View>
            <ScrollView ref={postScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedScroll}>
              {communityPosts.length > 0 ? (
                communityPosts.slice(0, 6).map((post) => (
                  <View key={post.id} style={styles.postCardWrap}>
                    <PostCard post={post} onToggleLike={toggleLike} />
                  </View>
                ))
              ) : (
                <Pressable
                  style={[styles.feedCard, styles.feedEmpty, { backgroundColor: colors.card }]}
                  onPress={() => router.push('/community')}>
                  <View style={[styles.feedCover, { backgroundColor: colors.successSoft }]}>
                    <Ionicons name="people" size={30} color={colors.success} />
                  </View>
                  <View style={styles.feedBody}>
                    <Text style={[styles.feedTitle, { color: colors.text }]}>还没有社区动态</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>去社区看看大家的分享 ›</Text>
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

      <Modal
        visible={fastingOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFastingOpen(false)}>
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFastingOpen(false)} />
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            <View style={styles.modalClose}>
              <Pressable hitSlop={8} onPress={() => setFastingOpen(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <FastingTimer />
          </View>
        </View>
      </Modal>

    </ThemedView>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.planMetric}>
      <Text style={styles.planMetricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.planMetricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingBottom: Spacing.five, gap: Spacing.three },
  // 时间问候
  greetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  topIcons: { flexDirection: 'row', gap: 4 },
  headerIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  greet: { flex: 1, minWidth: 0, gap: 3 },
  greetTitle: { fontSize: 22, fontWeight: '800', lineHeight: 30 },
  // 今日目标卡
  ringCard: {
    marginHorizontal: Spacing.three + 4,
    borderRadius: Radius.card,
    padding: Spacing.three,
  },
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
    marginTop: 14,
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  // 训练计划入口卡
  planEntry: {
    gap: Spacing.three,
    padding: Spacing.three + 2,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  planTopRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 24 },
  planDescription: { color: 'rgba(255,255,255,0.78)', fontSize: 12, lineHeight: 18, marginTop: 2 },
  planArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  planMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  planMetric: { flex: 1, minWidth: 0, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 6 },
  planMetricValue: { color: '#fff', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  planMetricLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, textAlign: 'center', marginTop: 2 },
  planPreview: { flexDirection: 'row', gap: 6 },
  planDay: { flex: 1, minWidth: 0, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 12, padding: 8 },
  planDayNumber: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '700' },
  planDayTitle: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 2 },
  planDayMeta: { color: 'rgba(255,255,255,0.65)', fontSize: 9, marginTop: 2 },
  // 金刚区
  section: { paddingHorizontal: Spacing.three + 4, gap: 10 },
  sectionTitle: { fontSize: 15 },
  actionGrid: { gap: Spacing.two },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.card },
  actionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryActions: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.one },
  secondaryAction: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8 },
  // 数据行
  dataStrip: { flexDirection: 'row', gap: 10 },
  dataCell: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  dataNum: { fontSize: 17, fontWeight: '800' },
  dataLabel: { fontSize: 10 },
  statusHint: { minHeight: 64, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  todayGrid: { gap: Spacing.two },
  todayTask: { minHeight: 76, borderRadius: Radius.card, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  todayIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todayBody: { flex: 1, minWidth: 0, gap: 2 },
  // 内容流
  feedHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  more: { fontSize: 12, fontWeight: '600' },
  feedScroll: { gap: 12, paddingBottom: 6 },
  postCardWrap: { width: 270 },
  feedCard: { width: 158, borderRadius: 18, overflow: 'hidden' },
  feedCover: { height: 88, alignItems: 'center', justifyContent: 'center' },
  feedEmoji: { fontSize: 40 },
  feedBody: { padding: 10, gap: 5 },
  feedTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17, minHeight: 34 },
  feedMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feedEmpty: {},
  tip: { textAlign: 'center', marginTop: Spacing.two, paddingHorizontal: Spacing.four },
  // 断食番茄钟弹窗（Web 端横向居中并限制为手机框宽度）
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four, alignItems: 'center' },
  modalCard: { width: '100%', maxWidth: 480, borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.one },
  modalClose: { alignItems: 'flex-end' },
});

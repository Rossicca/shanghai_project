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
import { calcBMI, estimateTargetCalories } from '@/utils/nutrition';
import { useWebHorizontalDrag } from '@/utils/webScroll';

export default function HomeScreen() {
  const colors = useTheme();
  const { bodyData, goal, bodyHistory } = useUserStore();
  const { recipeHistory, loadLocal: loadRecipes } = useRecipeStore();
  const { history: workoutHistory, loadLocal: loadWorkouts } = useWorkoutStore();
  const { posts: communityPosts, load: loadCommunityPosts, toggleLike } = useCommunityStore();
  const [fastingOpen, setFastingOpen] = useState(false);
  // 今日推荐推文区：支持鼠标拖拽平移
  const postScrollRef = useRef<ScrollView>(null);
  useWebHorizontalDrag(postScrollRef);

  useEffect(() => {
    loadRecipes();
    loadWorkouts();
    loadCommunityPosts();
  }, [loadRecipes, loadWorkouts, loadCommunityPosts]);

  const todayKey = new Date().toDateString();
  const todayRecipes = recipeHistory.filter(
    (r) => r.createdAt && new Date(r.createdAt).toDateString() === todayKey
  );
  const todayIntake = todayRecipes.reduce((s, r) => s + (r.calories ?? 0), 0);
  const burned = workoutHistory.reduce((s, v) => s + (v.calories ?? 0), 0);
  const target = estimateTargetCalories(bodyData, goal) ?? 1800;
  const pct = Math.round((todayIntake / target) * 100);
  const remain = Math.max(0, target - todayIntake);
  const bmi = calcBMI(bodyData);

  const streak = bodyHistory.length;
  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

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
              <Text style={[styles.brandName, { color: colors.text }]}>芽芽健康</Text>
            </View>
            <View style={styles.topIcons}>
              <Pressable hitSlop={8} onPress={() => router.push('/notifications')}>
                <Ionicons name="notifications-outline" size={21} color={colors.textSecondary} />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => router.push('/more')}>
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

          {/* 训练计划（从练 tab 移入） */}
          <View style={styles.section}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/workout/plan')}
              style={[styles.planEntry, { backgroundColor: colors.primarySoft }]}>
              <View style={[styles.planIcon, { backgroundColor: colors.primary }]}>
                <Ionicons name="calendar-outline" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">生成每周训练计划</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  按目标、器械和身体限制安排动作与提醒
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
          </View>

          {/* 今日目标（线形进度） */}
          <View style={[styles.ringCard, { backgroundColor: colors.card }]}>
            <View style={styles.ringHead}>
              <ThemedText type="smallBold">今日目标</ThemedText>
              <View style={[styles.pill, { backgroundColor: colors.primarySoft }]}>
                <Text style={[styles.pillText, { color: colors.success }]}>热量 · {goal?.type ?? '健康'}</Text>
              </View>
            </View>
            <View style={styles.lineRow}>
              {/* 线形进度条 */}
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
                  <Ionicons name="barbell" size={22} color="#B07A26" />
                </View>
                <Text style={[styles.cellLabel, { color: colors.textSecondary }]}>运动推荐</Text>
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
              <Pressable style={styles.cell} onPress={() => setFastingOpen(true)}>
                <View style={[styles.cellIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="hourglass-outline" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.cellLabel, { color: colors.textSecondary }]}>断食番茄钟</Text>
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

          {/* 今日推荐：别人发布的推文 */}
          <View style={styles.section}>
            <View style={styles.feedHead}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>
                今日推荐
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingBottom: Spacing.five, gap: Spacing.three },
  // 品牌行
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three + 4,
    paddingTop: Spacing.two,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 19, fontWeight: '800', letterSpacing: 0.5 },
  topIcons: { flexDirection: 'row', gap: 14 },
  // 问候
  greet: { paddingHorizontal: Spacing.four, gap: 3 },
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
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    padding: Spacing.three, borderRadius: 16,
  },
  planIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  // 金刚区
  section: { paddingHorizontal: Spacing.three + 4, gap: 10 },
  sectionTitle: { fontSize: 15 },
  grid: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1, alignItems: 'center', gap: 7, paddingVertical: 10 },
  cellIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cellLabel: { fontSize: 11, fontWeight: '600' },
  // 数据行
  dataStrip: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.three + 4 },
  dataCell: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  dataNum: { fontSize: 17, fontWeight: '800' },
  dataLabel: { fontSize: 10 },
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
  // 断食番茄钟弹窗
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  modalCard: { borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.one },
  modalClose: { alignItems: 'flex-end' },
});

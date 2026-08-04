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
import { calcBMI, targetCalories, macroSplit } from '@/utils/nutrition';

const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];

export default function HomeScreen() {
  const colors = useTheme();
  const { bodyData, goal, bodyHistory } = useUserStore();
  const { recipeHistory, loadLocal: loadRecipes, selectRecipe } = useRecipeStore();
  const { history: workoutHistory, loadLocal: loadWorkouts } = useWorkoutStore();
  const { plan, loadPlan } = usePlanStore();
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => { loadRecipes(); loadWorkouts(); loadPlan(); }, [loadRecipes, loadWorkouts, loadPlan]);

  const todayKey = new Date().toDateString();
  const todayRecipes = recipeHistory.filter((r) => r.createdAt && new Date(r.createdAt).toDateString() === todayKey);
  const todayIntake = todayRecipes.reduce((s, r) => s + (r.calories ?? 0), 0);
  const burned = workoutHistory.reduce((s, v) => s + (v.calories ?? 0), 0);
  const target = targetCalories(bodyData, goal) ?? 1800;
  const macros = target ? macroSplit(target, goal?.type || '健康') : null;
  const pct = Math.min(100, Math.round((todayIntake / target) * 100));
  const remain = Math.max(0, target - todayIntake);
  const bmi = calcBMI(bodyData);
  const streak = bodyHistory.length;
  const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

  // 今日训练计划
  const todayPlan = (() => {
    if (!plan) return null;
    const dow = new Date().getDay();
    const dayIdx = dow === 0 ? 6 : dow - 1;
    const match = plan.weeklySchedule.find((d: any) => d.day - 1 === dayIdx);
    return match ? { rest: false, day: match } : { rest: true, day: null };
  })();

  function openRecipe(r: Recipe) { selectRecipe(r); router.push({ pathname: '/recipe/[id]', params: { id: r.id } }); }
  function openVideoLink(kw: string) { const { Linking } = require('react-native'); Linking.openURL(`https://search.bilibili.com/all?keyword=${encodeURIComponent(kw)}`); }

  const timeGreeting = new Date().getHours() < 12 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好';

  return (
    <ThemedView style={S.outer}>
      <SafeAreaView style={S.safe} edges={['top']}>
        <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

          {/* ---- 顶栏 ---- */}
          <View style={S.topBar}>
            <View style={S.logoMark}>
              <Ionicons name="leaf" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[S.greet, { color: colors.text }]}>{timeGreeting} 🌿</Text>
              <Text style={[S.greetSub, { color: colors.textSecondary }]}>{today} · 记录 {streak} 天</Text>
            </View>
            <Pressable hitSlop={8} onPress={() => setNoticesOpen(true)} style={S.topBtn}>
              <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => setMoreOpen(true)} style={S.topBtn}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* ====== 今日训练计划 ====== */}
          {todayPlan ? (
            <View style={[S.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: todayPlan.rest ? 0 : Spacing.two }}>
                <View style={[S.heroIcon, { backgroundColor: todayPlan.rest ? colors.yellowSoft : colors.primarySoft }]}>
                  <Ionicons name={todayPlan.rest ? 'cafe' : 'flame'} size={18} color={todayPlan.rest ? '#B07A26' : colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.heroTitle, { color: colors.text }]}>
                    {todayPlan.rest ? '今日休息' : `今日训练 · ${todayPlan.day!.title}`}
                  </Text>
                  <Text style={[S.heroSub, { color: colors.textSecondary }]}>
                    {todayPlan.rest ? '肌肉在恢复中生长' : `${todayPlan.day!.durationMinutes}分钟 · ${todayPlan.day!.exercises?.length || 0}个动作`}
                  </Text>
                </View>
                <Pressable onPress={() => router.push('/workout/plan-result')} style={[S.heroBtn, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>查看</Text>
                </Pressable>
              </View>
              {!todayPlan.rest && todayPlan.day!.exercises && (
                <View style={{ gap: 6 }}>
                  {todayPlan.day!.exercises.slice(0, 3).map((ex: any, j: number) => (
                    <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13, flex: 1 }} numberOfLines={1}>{ex.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{ex.sets}组×{ex.reps}</Text>
                      {ex.searchKeyword ? (
                        <Pressable onPress={() => openVideoLink(ex.searchKeyword)} style={{ padding: 4 }}>
                          <Ionicons name="play-circle" size={20} color="#FB7299" />
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                  {todayPlan.day!.exercises.length > 3 && (
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>+{todayPlan.day!.exercises.length - 3} 个动作（查看完整计划）</Text>
                  )}
                </View>
              )}
            </View>
          ) : (
            <Pressable onPress={() => router.push('/workout/plan')} style={[S.heroCard, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 1.5 }]}>
              <View style={[S.heroIcon, { backgroundColor: colors.primarySoft, marginBottom: Spacing.two }]}>
                <Ionicons name="fitness" size={28} color={colors.primary} />
              </View>
              <Text style={[S.heroTitle, { color: colors.text, textAlign: 'center' }]}>生成专属训练计划</Text>
              <Text style={[S.heroSub, { color: colors.textSecondary, textAlign: 'center' }]}>
                AI 根据你的身体数据、目标和器械条件，定制每周训练方案
              </Text>
              {bodyData ? (
                <View style={[S.heroTags, { marginTop: Spacing.two }]}>
                  <View style={[S.heroTag, { backgroundColor: colors.successSoft }]}>
                    <Text style={[S.heroTagT, { color: colors.success }]}>{bodyData.height}cm {bodyData.weight}kg</Text>
                  </View>
                  {goal && <View style={[S.heroTag, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[S.heroTagT, { color: colors.primary }]}>{goal.type}</Text>
                  </View>}
                </View>
              ) : (
                <Text style={[S.heroSub, { color: colors.primary, marginTop: Spacing.one }]}>先填写身体数据，让AI更懂你 ›</Text>
              )}
            </Pressable>
          )}

          {/* ====== 今日热量 ====== */}
          <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[S.sectionLabel, { color: colors.text }]}>今日热量</Text>
              <View style={[S.pill, { backgroundColor: colors.primarySoft }]}>
                <Text style={[S.pillT, { color: colors.primary }]}>{pct}%</Text>
              </View>
            </View>
            <View style={[S.barBg, { backgroundColor: colors.backgroundSelected }]}>
              <View style={[S.barFill, { width: `${pct}%`, backgroundColor: pct > 90 ? colors.danger : colors.primary }]} />
            </View>
            <View style={{ flexDirection: 'row', marginTop: 12, gap: Spacing.one }}>
              <View style={[S.statCell, { backgroundColor: colors.backgroundElement }]}>
                <Text style={[S.statVal, { color: colors.text }]}>{todayIntake}</Text>
                <Text style={[S.statLbl, { color: colors.textSecondary }]}>已摄入 kcal</Text>
              </View>
              <View style={[S.statCell, { backgroundColor: colors.backgroundElement }]}>
                <Text style={[S.statVal, { color: colors.text }]}>{burned}</Text>
                <Text style={[S.statLbl, { color: colors.textSecondary }]}>运动消耗</Text>
              </View>
              <View style={[S.statCell, { backgroundColor: colors.backgroundElement }]}>
                <Text style={[S.statVal, { color: colors.success }]}>{remain}</Text>
                <Text style={[S.statLbl, { color: colors.textSecondary }]}>还可摄入</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push('/camera/scan')} style={[S.ctaBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>拍照记一餐</Text>
            </Pressable>
          </View>

          {/* ====== 快捷功能 ====== */}
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            {[
              { icon: 'camera', label: '拍照识别', color: colors.success, bg: colors.successSoft, route: '/camera/scan' },
              { icon: 'play-circle', label: '训练视频', color: '#B07A26', bg: colors.yellowSoft, route: '/workout' },
              { icon: 'restaurant', label: 'AI 菜谱', color: '#C0664C', bg: '#FCE9E4', route: '/recipe' },
              { icon: 'body', label: '身体数据', color: '#3E6FA8', bg: '#E7F0FA', route: '/profile/body' },
            ].map((item) => (
              <Pressable key={item.label} onPress={() => router.push(item.route as any)} style={[S.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[S.quickIcon, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={[S.quickLbl, { color: colors.textSecondary }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* ====== 身体数据行 ====== */}
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            <View style={[S.dataCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[S.dataVal, { color: colors.text }]}>{bmi?.toFixed(1) ?? '--'}</Text>
              <Text style={[S.dataLbl, { color: colors.textSecondary }]}>BMI</Text>
            </View>
            <View style={[S.dataCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[S.dataVal, { color: colors.text }]}>{bodyData ? `${bodyData.weight}kg` : '--'}</Text>
              <Text style={[S.dataLbl, { color: colors.textSecondary }]}>体重</Text>
            </View>
            <View style={[S.dataCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[S.dataVal, { color: colors.text }]}>{bodyData ? `${bodyData.height}cm` : '--'}</Text>
              <Text style={[S.dataLbl, { color: colors.textSecondary }]}>身高</Text>
            </View>
            <View style={[S.dataCell, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[S.dataVal, { color: colors.text }]}>{streak}</Text>
              <Text style={[S.dataLbl, { color: colors.textSecondary }]}>连续天</Text>
            </View>
          </View>

          {/* ====== 饮食建议 ====== */}
          {macros && (
            <View style={[S.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={[S.sectionLabel, { color: colors.text }]}>饮食建议</Text>
                <Pressable onPress={() => router.push('/recipe')}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>去菜谱 ›</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <MacroBlock label="目标热量" value={`${target}`} unit="kcal" color={colors.primary} />
                <MacroBlock label="蛋白质" value={`${macros.protein}g`} unit="" color="#E74C3C" />
                <MacroBlock label="碳水" value={`${macros.carbs}g`} unit="" color="#F5B14C" />
                <MacroBlock label="脂肪" value={`${macros.fat}g`} unit="" color="#3E6FA8" />
              </View>
            </View>
          )}

          {/* ====== 今日推荐 ====== */}
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[S.sectionLabel, { color: colors.text }]}>今日推荐</Text>
              <Pressable onPress={() => router.push('/recipe')}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>更多 ›</Text>
              </Pressable>
            </View>
            {todayRecipes.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
                {todayRecipes.slice(0, 4).map((r) => (
                  <Pressable key={r.id} onPress={() => openRecipe(r)} style={[S.recipeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[S.recipeCover, { backgroundColor: colors.primarySoft }]}>
                      <Text style={{ fontSize: 36 }}>{r.coverEmoji}</Text>
                    </View>
                    <View style={{ padding: 10 }}>
                      <Text style={[S.recipeName, { color: colors.text }]} numberOfLines={2}>{r.name}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{r.cookTime}min</Text>
                        <Text style={{ color: colors.danger, fontSize: 11, fontWeight: '700' }}>{r.calories}kcal</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Pressable onPress={() => router.push('/camera/scan')} style={[S.recipeCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingVertical: 30 }]}>
                <Ionicons name="camera" size={28} color={colors.primary} />
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6 }}>拍个照，AI帮做菜</Text>
              </Pressable>
            )}
          </View>

          <Text style={[S.disclaimer, { color: colors.textSecondary }]}>
            健康建议仅供参考，非医疗用途
          </Text>
        </ScrollView>
      </SafeAreaView>
      <NotificationSheet visible={noticesOpen} onClose={() => setNoticesOpen(false)} />
      <MoreSheet visible={moreOpen} onClose={() => setMoreOpen(false)} />
    </ThemedView>
  );
}

function MacroBlock({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, color: '#5A7A6F', marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '800', color }}>{value}</Text>
      {unit ? <Text style={{ fontSize: 10, color: '#8AA89C' }}>{unit}</Text> : null}
    </View>
  );
}

const S = StyleSheet.create({
  outer: { flex: 1 },
  safe: { flex: 1 },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },

  // 顶栏
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 4 },
  logoMark: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#2FA886', alignItems: 'center', justifyContent: 'center' },
  greet: { fontSize: 20, fontWeight: '800' },
  greetSub: { fontSize: 12 },
  topBtn: { padding: 4 },

  // Hero
  heroCard: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.three },
  heroIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  heroSub: { fontSize: 12, lineHeight: 18 },
  heroBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.chip },
  heroTags: { flexDirection: 'row', gap: 6 },
  heroTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.chip },
  heroTagT: { fontSize: 11, fontWeight: '600' },
  dayMini: { width: 110, padding: 10, borderRadius: 12, marginRight: 8 },
  dayMiniLbl: { fontSize: 10, fontWeight: '600' },
  dayMiniTitle: { fontSize: 12, fontWeight: '800', marginVertical: 2 },
  dayMiniDur: { fontSize: 11, fontWeight: '700' },
  dayMiniEx: { fontSize: 10, marginTop: 2 },

  // 通用卡片
  card: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.three },

  // 热量
  sectionLabel: { fontSize: 14, fontWeight: '800' },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  pillT: { fontSize: 12, fontWeight: '700' },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  statCell: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800' },
  statLbl: { fontSize: 10, marginTop: 1 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: Radius.button, marginTop: 12 },

  // 快捷
  quickBtn: { flex: 1, borderRadius: Radius.card, borderWidth: 1, paddingVertical: 14, alignItems: 'center', gap: 8 },
  quickIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  quickLbl: { fontSize: 11, fontWeight: '600' },

  // 数据行
  dataCell: { flex: 1, borderRadius: 14, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  dataVal: { fontSize: 15, fontWeight: '800' },
  dataLbl: { fontSize: 10, marginTop: 1 },

  // 推荐
  recipeCard: { width: 148, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  recipeCover: { height: 76, alignItems: 'center', justifyContent: 'center' },
  recipeName: { fontSize: 12, fontWeight: '700', lineHeight: 16, minHeight: 32 },

  disclaimer: { textAlign: 'center', fontSize: 11, paddingTop: 4 },
});

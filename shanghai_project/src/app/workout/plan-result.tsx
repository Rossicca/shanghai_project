import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchLatestWorkoutPlan,
  fetchWorkoutPlan,
  setWorkoutPlanFavorite,
  setWorkoutPlanSaved,
} from '@/services/workout';
import { useRecipeStore } from '@/store/recipeStore';
import type { WorkoutPlan, WorkoutPlanActivity } from '@/types/workout';
import { openExternalLink } from '@/utils/externalLink';

const MODE_LABELS = { gentle: '温和适应', balanced: '均衡训练', progressive: '渐进挑战' } as const;
const LOCATION_LABELS = { home: '居家', gym: '健身房', outdoor: '户外' } as const;
const GOAL_LABELS = { lose_fat: '减脂', gain_muscle: '增肌', shape: '塑形', maintain: '保持健康' } as const;

export default function WorkoutPlanResultPage() {
  const colors = useTheme();
  const params = useLocalSearchParams<{ planId?: string }>();
  const setRecipeIngredients = useRecipeStore((state) => state.setIngredients);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const [dietDay, setDietDay] = useState(1);
  const [activeSection, setActiveSection] = useState<'training' | 'diet'>('training');

  useEffect(() => {
    const request = params.planId ? fetchWorkoutPlan(params.planId) : fetchLatestWorkoutPlan();
    request.then(setPlan).catch((requestError) => setError(requestError.message || '计划加载失败')).finally(() => setLoading(false));
  }, [params.planId]);

  async function toggleSaved() {
    if (!plan || action) return;
    setAction('save');
    try {
      setPlan(await setWorkoutPlanSaved(plan.planId, !plan.isSaved));
    } catch (requestError) {
      setError((requestError as Error).message || '保存失败');
    } finally {
      setAction('');
    }
  }

  async function toggleFavorite() {
    if (!plan || action) return;
    setAction('favorite');
    try {
      setPlan(await setWorkoutPlanFavorite(plan.planId, !plan.isFavorite));
    } catch (requestError) {
      setError((requestError as Error).message || '收藏失败');
    } finally {
      setAction('');
    }
  }

  function makeSuggestedRecipe(ingredients: string[]) {
    setRecipeIngredients(ingredients.map((name) => ({ name, amount: '适量', confidence: 1 })));
    router.push('/recipe/generate');
  }

  async function openLink(url: string) {
    if (Platform.OS === 'web') {
      openExternalLink(url);
      return;
    }
    if (await Linking.canOpenURL(url).catch(() => false)) await Linking.openURL(url);
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText>正在整理你的专属计划…</ThemedText>
      </ThemedView>
    );
  }

  if (!plan) {
    return (
      <ThemedView style={styles.center}>
        <Ionicons name="document-text-outline" size={42} color={colors.textSecondary} />
        <ThemedText type="subtitle">还没有可查看的计划</ThemedText>
        <ThemedText type="small" themeColor="danger">{error}</ThemedText>
        <Button title="返回填写条件" onPress={() => router.replace('/workout/plan')} />
      </ThemedView>
    );
  }

  const conditions = plan.planConditions;
  const targets = plan.nutritionTargets;
  const activeDietDay = plan.dietPlan?.find((day) => day.day === dietDay) || plan.dietPlan?.[0];
  const goalSummary = (plan.goalTypes?.length ? plan.goalTypes : [plan.goalType])
    .map((goal) => GOAL_LABELS[goal]).join(' + ');

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="返回修改" hitSlop={10} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText style={styles.pageTitle}>专属计划</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">训练与饮食分开查看，随时切换</ThemedText>
          </View>
          <Pressable accessibilityLabel="收藏计划" onPress={toggleFavorite} style={[styles.headerAction, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name={plan.isFavorite ? 'heart' : 'heart-outline'} size={21} color={plan.isFavorite ? '#E85D75' : colors.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, { backgroundColor: colors.primary }]}>
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>AI 个性化方案 · {goalSummary}</Text></View>
            <Text style={styles.heroTitle}>训练与饮食，按你来安排</Text>
            <Text style={styles.heroSummary}>{plan.summary}</Text>
            <View style={styles.heroPills}>
              <Text style={styles.heroPill}>{conditions ? LOCATION_LABELS[conditions.workoutLocation] : '按条件安排'}</Text>
              <Text style={styles.heroPill}>{conditions?.sessionDurationMinutes ?? '--'} 分钟/次</Text>
              <Text style={styles.heroPill}>{conditions?.trainingMode ? MODE_LABELS[conditions.trainingMode] : '均衡训练'}</Text>
            </View>
          </View>

          {plan.generationWarning ? (
            <View style={[styles.warning, { backgroundColor: colors.yellowSoft }]}>
              <Ionicons name="information-circle-outline" size={20} color="#B07A26" />
              <ThemedText type="small" style={{ flex: 1 }}>{plan.generationWarning}</ThemedText>
            </View>
          ) : null}

          <View style={styles.planActions}>
            <Button
              title={plan.isSaved ? '已保存到计划' : '保存到我的计划'}
              icon={plan.isSaved ? 'checkmark-circle' : 'download-outline'}
              onPress={toggleSaved}
              loading={action === 'save'}
              style={{ flex: 1 }}
            />
            <Button title="重新调整" variant="outline" icon="options-outline" onPress={() => router.push('/workout/plan')} style={{ flex: 1 }} />
          </View>

          {error ? <ThemedText type="small" themeColor="danger">{error}</ThemedText> : null}

          <View style={[styles.planSwitch, { backgroundColor: colors.backgroundElement }]}>
            <PlanSwitchButton
              active={activeSection === 'training'}
              icon="barbell-outline"
              title="训练计划"
              summary={`${plan.weeklySchedule.length} 天 · 含热身与拉伸`}
              onPress={() => setActiveSection('training')}
            />
            <PlanSwitchButton
              active={activeSection === 'diet'}
              icon="restaurant-outline"
              title="饮食计划"
              summary={`${plan.dietPlan?.length || 7} 天 · ${conditions?.mealsPerDay || 4} 餐/天`}
              onPress={() => setActiveSection('diet')}
            />
          </View>

          {activeSection === 'training' && plan.profileAnalysis?.insights?.length ? (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeading}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="analytics-outline" size={21} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="subtitle">AI 为什么这样安排</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">已使用 {plan.profileAnalysis.dataCompleteness}% 的可选身体数据</ThemedText>
                </View>
              </View>
              <View style={styles.analysisList}>
                {plan.profileAnalysis.insights.map((insight, index) => (
                  <View key={`${insight}-${index}`} style={styles.analysisRow}>
                    <View style={[styles.analysisDot, { backgroundColor: colors.primary }]} />
                    <ThemedText type="small" style={{ flex: 1 }}>{insight}</ThemedText>
                  </View>
                ))}
              </View>
              <ThemedText type="small" themeColor="textSecondary">这些指标用于一般健身规划，不用于疾病诊断。</ThemedText>
            </Card>
          ) : null}

          {activeSection === 'diet' && conditions ? (
            <Card style={styles.dietConditionCard}>
              <View style={styles.sectionHeading}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.yellowSoft }]}>
                  <Ionicons name="options-outline" size={21} color="#B07A26" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="subtitle">你的饮食条件</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">AI 已把时间、预算、厨具和口味一起纳入计划</ThemedText>
                </View>
              </View>
              <View style={styles.conditionChips}>
                <ConditionChip icon="time-outline" label={`${conditions.mealPrepTime || 30} 分钟/餐`} />
                <ConditionChip icon="wallet-outline" label={conditions.foodBudget === 'economy' ? '经济实用' : conditions.foodBudget === 'flexible' ? '食材灵活' : '均衡适中'} />
                <ConditionChip icon="restaurant-outline" label={`${conditions.mealsPerDay || 4} 餐/天`} />
                {(conditions.kitchenTools || []).slice(0, 3).map((item) => <ConditionChip key={item} icon="construct-outline" label={item} />)}
              </View>
              {conditions.dietaryPreferences?.length ? <ThemedText type="small" themeColor="textSecondary">偏好：{conditions.dietaryPreferences.join(' · ')}</ThemedText> : null}
              {conditions.flavorPreferences?.length ? <ThemedText type="small" themeColor="textSecondary">口味：{conditions.flavorPreferences.join(' · ')}</ThemedText> : null}
            </Card>
          ) : null}

          {activeSection === 'diet' && targets ? (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeading}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.successSoft }]}>
                  <Ionicons name="nutrition-outline" size={21} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="subtitle">每日营养目标</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">按身体数据、目标和训练频率估算</ThemedText>
                </View>
              </View>
              <View style={styles.targetGrid}>
                <TargetMetric label="热量" value={`${targets.calories}`} unit="kcal" />
                <TargetMetric label="蛋白质" value={`${targets.protein}`} unit="g" />
                <TargetMetric label="碳水" value={`${targets.carbs}`} unit="g" />
                <TargetMetric label="脂肪" value={`${targets.fat}`} unit="g" />
                <TargetMetric label="饮水" value={`${targets.water}`} unit="ml" />
              </View>
              <ThemedText type="small" themeColor="textSecondary">{plan.nutritionSummary}</ThemedText>
            </Card>
          ) : null}

          {activeSection === 'training' ? <View style={styles.sectionIntro}>
            <ThemedText type="subtitle">本周训练安排</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">每次都包含热身、主训练和练后拉伸</ThemedText>
          </View> : null}

          {activeSection === 'training' ? plan.weeklySchedule.map((day) => (
            <Card key={day.day} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={[styles.dayNumber, { backgroundColor: colors.primary }]}><Text style={styles.dayNumberText}>{day.day}</Text></View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="subtitle">{day.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">约 {day.durationMinutes} 分钟</ThemedText>
                </View>
              </View>

              <PlanPhase title="训练前热身" icon="sunny-outline" tint="#E89B32">
                {(day.warmup || []).map((activity, index) => (
                  <ActivityRow key={`warm-${activity.name}-${index}`} activity={activity} onOpen={openLink} />
                ))}
              </PlanPhase>

              <PlanPhase title="主训练" icon="barbell-outline" tint={colors.primary}>
                {day.exercises.map((exercise, index) => (
                  <View key={`${exercise.name}-${index}`} style={styles.activityRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <ThemedText type="smallBold">{exercise.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">{exercise.sets} 组 · {exercise.reps} · 休息 {exercise.restSeconds} 秒</ThemedText>
                      <ThemedText type="small">{exercise.notes}</ThemedText>
                    </View>
                    {exercise.videoUrl ? <VideoLink platform={exercise.videoPlatform} title={exercise.videoTitle} onPress={() => openLink(exercise.videoUrl!)} /> : null}
                  </View>
                ))}
              </PlanPhase>

              <PlanPhase title="练后拉伸" icon="body-outline" tint="#557DB3">
                {(day.cooldown || []).map((activity, index) => (
                  <ActivityRow key={`cool-${activity.name}-${index}`} activity={activity} onOpen={openLink} />
                ))}
              </PlanPhase>
            </Card>
          )) : null}

          {activeSection === 'diet' && plan.dietPlan?.length && activeDietDay ? (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeading}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.yellowSoft }]}>
                  <Ionicons name="restaurant-outline" size={21} color="#B07A26" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="subtitle">7 天饮食安排</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">训练日和恢复日分开考虑，点击一餐可继续生成菜谱</ThemedText>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dietTabs}>
                {plan.dietPlan.map((day) => {
                  const active = day.day === activeDietDay.day;
                  return (
                    <Pressable key={day.day} onPress={() => setDietDay(day.day)} style={[styles.dietTab, { backgroundColor: active ? colors.primary : colors.backgroundElement }]}>
                      <Text style={[styles.dietTabLabel, { color: active ? '#fff' : colors.text }]}>第 {day.day} 天</Text>
                      <Text style={[styles.dietTabHint, { color: active ? 'rgba(255,255,255,0.78)' : colors.textSecondary }]}>{day.trainingDay ? '训练' : '恢复'}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={[styles.dietFocus, { backgroundColor: colors.backgroundElement }]}>
                <Ionicons name={activeDietDay.trainingDay ? 'barbell-outline' : 'moon-outline'} size={18} color={colors.primary} />
                <ThemedText type="small" style={{ flex: 1 }}>{activeDietDay.focus}</ThemedText>
              </View>
              {activeDietDay.meals.map((meal) => (
                <Pressable key={`${meal.mealType}-${meal.name}`} onPress={() => makeSuggestedRecipe(meal.ingredients)} style={styles.mealRow}>
                  <View style={[styles.mealType, { backgroundColor: colors.primarySoft }]}><ThemedText type="smallBold" themeColor="primary">{meal.mealType}</ThemedText></View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold">{meal.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{meal.reason}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{meal.ingredients.join(' · ')}</ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              ))}
              <Button title="拍照识别现有食材并匹配计划" variant="secondary" icon="camera" onPress={() => router.push('/camera/scan')} />
            </Card>
          ) : plan.mealSuggestions?.length ? (
            <Card style={styles.sectionCard}>
              <ThemedText type="subtitle">配套饮食与菜谱</ThemedText>
              {plan.mealSuggestions.slice(0, 4).map((meal) => (
                <Pressable key={`${meal.mealType}-${meal.name}`} onPress={() => makeSuggestedRecipe(meal.ingredients)} style={styles.mealRow}>
                  <View style={[styles.mealType, { backgroundColor: colors.primarySoft }]}><ThemedText type="smallBold" themeColor="primary">{meal.mealType}</ThemedText></View>
                  <View style={{ flex: 1 }}><ThemedText type="smallBold">{meal.name}</ThemedText><ThemedText type="small" themeColor="textSecondary">{meal.reason}</ThemedText></View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              ))}
            </Card>
          ) : null}

          {plan.evidence?.length ? (
            <Card style={styles.sectionCard}>
              <View style={styles.sectionHeading}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.blueSoft }]}>
                  <Ionicons name="library-outline" size={21} color="#557DB3" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="subtitle">方案依据</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">健康结论采用可核验机构资料</ThemedText>
                </View>
              </View>
              {plan.evidence.map((item) => (
                <Pressable key={item.url} onPress={() => openLink(item.url)} style={styles.evidenceRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="smallBold">{item.organization}</ThemedText>
                    <ThemedText type="small">{item.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">{item.note}</ThemedText>
                  </View>
                  <Ionicons name="open-outline" size={18} color={colors.primary} />
                </Pressable>
              ))}
            </Card>
          ) : null}

          {activeSection === 'training' ? <View style={[styles.reminders, { backgroundColor: colors.backgroundElement }]}>
            <ThemedText type="smallBold">安全与恢复提醒</ThemedText>
            {plan.reminders.map((item, index) => (
              <View key={`${item}-${index}`} style={styles.reminderRow}>
                <Ionicons name="checkmark-circle-outline" size={17} color={colors.primary} />
                <ThemedText type="small" style={{ flex: 1 }}>{item}</ThemedText>
              </View>
            ))}
            <ThemedText type="small" themeColor="textSecondary">{plan.disclaimer}</ThemedText>
          </View> : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function TargetMetric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return <View style={styles.targetMetric}><ThemedText type="smallBold">{value} <ThemedText type="small" themeColor="textSecondary">{unit}</ThemedText></ThemedText><ThemedText type="small" themeColor="textSecondary">{label}</ThemedText></View>;
}

function PlanSwitchButton({ active, icon, title, summary, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; summary: string; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.planSwitchButton, { backgroundColor: active ? colors.card : 'transparent', borderColor: active ? colors.border : 'transparent' }]}>
      <View style={[styles.planSwitchIcon, { backgroundColor: active ? colors.primarySoft : 'rgba(128,128,128,0.10)' }]}><Ionicons name={icon} size={20} color={active ? colors.primary : colors.textSecondary} /></View>
      <View style={{ flex: 1, minWidth: 0 }}><ThemedText type="smallBold">{title}</ThemedText><ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>{summary}</ThemedText></View>
      {active ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}

function ConditionChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const colors = useTheme();
  return <View style={[styles.conditionChip, { backgroundColor: colors.backgroundElement }]}><Ionicons name={icon} size={14} color={colors.primary} /><ThemedText type="smallBold">{label}</ThemedText></View>;
}

function VideoLink({ platform, title, onPress }: { platform?: 'bilibili' | 'douyin' | null; title?: string | null; onPress: () => void }) {
  const colors = useTheme();
  const label = platform === 'douyin' ? '抖音讲解' : 'B站讲解';
  return (
    <Pressable accessibilityLabel={`打开匹配视频${title ? `：${title}` : ''}`} onPress={onPress} style={[styles.videoLink, { backgroundColor: colors.primarySoft }]}>
      <Ionicons name="play" size={13} color={colors.primary} />
      <ThemedText type="smallBold" themeColor="primary">{label}</ThemedText>
    </Pressable>
  );
}

function PlanPhase({ title, icon, tint, children }: { title: string; icon: keyof typeof Ionicons.glyphMap; tint: string; children: ReactNode }) {
  return <View style={styles.phase}><View style={styles.phaseTitle}><Ionicons name={icon} size={17} color={tint} /><ThemedText type="smallBold">{title}</ThemedText></View>{children}</View>;
}

function ActivityRow({ activity, onOpen }: { activity: WorkoutPlanActivity; onOpen: (url: string) => void }) {
  return <View style={styles.activityRow}><View style={{ flex: 1, minWidth: 0 }}><ThemedText type="smallBold">{activity.name}</ThemedText><ThemedText type="small" themeColor="textSecondary">{activity.durationSeconds} 秒 · {activity.notes}</ThemedText></View>{activity.videoUrl ? <VideoLink platform={activity.videoPlatform} title={activity.videoTitle} onPress={() => onOpen(activity.videoUrl!)} /> : null}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safeArea: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  pageTitle: { fontSize: 24, lineHeight: 30, fontWeight: '900' },
  headerAction: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },
  hero: { borderRadius: Radius.card, padding: Spacing.four, gap: Spacing.two },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.chip },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' }, heroTitle: { color: '#fff', fontSize: 26, fontWeight: '900' },
  heroSummary: { color: 'rgba(255,255,255,0.86)', fontSize: 14, lineHeight: 21 }, heroPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  heroPill: { color: '#fff', fontSize: 11, fontWeight: '700', backgroundColor: 'rgba(0,0,0,0.13)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: Radius.chip },
  planActions: { flexDirection: 'row', gap: Spacing.two }, sectionCard: { gap: Spacing.three },
  planSwitch: { flexDirection: 'row', gap: Spacing.one, padding: 4, borderRadius: Radius.card },
  planSwitchButton: { flex: 1, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, borderRadius: 15, borderWidth: 1 },
  planSwitchIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.button },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, sectionIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  targetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, targetMetric: { minWidth: 88, flexGrow: 1, gap: 2 },
  dietConditionCard: { gap: Spacing.three }, conditionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, conditionChip: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.two, borderRadius: Radius.chip },
  sectionIntro: { gap: 2, marginTop: Spacing.one }, dayCard: { gap: Spacing.three }, dayHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  analysisList: { gap: Spacing.two }, analysisRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two }, analysisDot: { width: 7, height: 7, borderRadius: 4, marginTop: 7 },
  dayNumber: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, dayNumberText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  phase: { gap: Spacing.two }, phaseTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 }, activityRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 6 },
  videoLink: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.two, borderRadius: Radius.chip },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two }, mealType: { minWidth: 48, paddingHorizontal: Spacing.two, paddingVertical: 6, borderRadius: Radius.chip, alignItems: 'center' },
  dietTabs: { gap: Spacing.two, paddingRight: Spacing.two }, dietTab: { minWidth: 66, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, alignItems: 'center' }, dietTabLabel: { fontSize: 12, fontWeight: '800' }, dietTabHint: { fontSize: 10, marginTop: 2 },
  dietFocus: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.button },
  evidenceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two }, reminders: { gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.card }, reminderRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
});

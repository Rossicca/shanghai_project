import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUserStore } from '@/store/userStore';
import { usePlanStore } from '@/store/planStore';
import { fetchLatestWorkoutPlan, generateWorkoutPlan } from '@/services/workout';
import type { WorkoutPlan, WorkoutPlanInput } from '@/types/workout';
import {
  calcBMR, calcTDEE, calcBMI, bmiLabel, idealWeightRange,
  targetCalories, macroSplit, trainingSplitAdvice,
} from '@/utils/nutrition';

const DURATIONS = [20, 30, 45, 60];
const LOCATIONS: { value: WorkoutPlanInput['workoutLocation']; label: string; icon: string }[] = [
  { value: 'home', label: '居家', icon: 'home' },
  { value: 'gym', label: '健身房', icon: 'fitness' },
  { value: 'outdoor', label: '户外', icon: 'sunny' },
];
const LEVELS: { value: WorkoutPlanInput['fitnessLevel']; label: string }[] = [
  { value: 'beginner', label: '入门（< 3个月）' },
  { value: 'intermediate', label: '进阶（3-12个月）' },
  { value: 'advanced', label: '有经验（> 1年）' },
];
const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];

function goalCode(gType?: string): WorkoutPlanInput['goalType'] {
  return ({ '减脂': 'lose_fat', '增肌': 'gain_muscle', '塑形': 'shape' } as const)[gType || ''] || 'maintain';
}

export default function WorkoutPlanPage() {
  const colors = useTheme();
  const { bodyData, goal } = useUserStore();
  const savePlan = usePlanStore((s) => s.setPlan);

  // 自动推导的智能默认值
  const bmi = calcBMI(bodyData);
  const bmr = calcBMR(bodyData);
  const ideal = bodyData ? idealWeightRange(bodyData.height) : null;
  const autoFreq = goal?.weeklyFrequency || (goal?.type === '增肌' ? 4 : goal?.type === '减脂' ? 5 : 3);

  const [weeklyFrequency, setWeeklyFrequency] = useState(autoFreq);
  const [duration, setDuration] = useState(goal?.type === '减脂' ? 45 : 30);
  const [location, setLocation] = useState<WorkoutPlanInput['workoutLocation']>('home');
  const [hasEquipment, setHasEquipment] = useState(false);
  const [level, setLevel] = useState<WorkoutPlanInput['fitnessLevel']>('beginner');
  const [limitations, setLimitations] = useState('');
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const tdee = calcTDEE(bodyData, weeklyFrequency);
  const calTarget = targetCalories(bodyData, goal, weeklyFrequency);
  const macros = calTarget ? macroSplit(calTarget, goal?.type || '保持健康') : null;
  const splitAdvice = trainingSplitAdvice(weeklyFrequency, goal?.type || '保持健康');

  // 今天是训练日还是休息日
  const todayInfo = useMemo(() => {
    if (!plan) return null;
    const dow = new Date().getDay(); // 0=Sun
    const dayIndex = dow === 0 ? 6 : dow - 1; // Mon=0
    const scheduleDays = plan.weeklySchedule.map((d) => d.day - 1);
    const today = plan.weeklySchedule.find((d) => d.day - 1 === dayIndex);
    if (today) return { isTrainingDay: true as const, day: today };
    return { isTrainingDay: false as const };
  }, [plan]);

  useEffect(() => {
    fetchLatestWorkoutPlan().then((latest) => {
      if (latest) { setPlan(latest); savePlan(latest); }
    }).catch(() => {});
  }, [savePlan]);

  async function runGenerate() {
    setLoading(true);
    setError('');
    try {
      const result = await generateWorkoutPlan({
        goalType: goalCode(goal?.type),
        weeklyFrequency,
        sessionDurationMinutes: duration,
        workoutLocation: location,
        hasEquipment,
        fitnessLevel: level,
        limitations: limitations.split(/[，,；;\n]/).map((s) => s.trim()).filter(Boolean),
        bodyData: bodyData ? {
          height: bodyData.height, weight: bodyData.weight,
          age: bodyData.age, gender: bodyData.gender,
          bmi: bmi ?? undefined, bmr: bmr ?? undefined,
          tdee: tdee ?? undefined,
          targetCalories: calTarget,
          bodyFat: bodyData.bodyFat,
        } : undefined,
        goal: goal ? { type: goal.type, targetWeight: goal.targetWeight } : undefined,
      });
      setPlan(result);
      savePlan(result);
    } catch (e) {
      setError((e as Error).message || '训练计划生成失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  function openBilibiliSearch(keyword: string) {
    const url = `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`;
    Linking.openURL(url).catch(() => setError('无法打开B站'));
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">每周训练计划</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {bodyData
                ? `基于你的身体数据（${bodyData.height}cm/${bodyData.weight}kg/${bodyData.age}岁）定制`
                : '填写身体数据后推荐更精准'}
            </ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* 身体数据总览卡片 */}
          {bodyData && (
            <Card style={styles.bodyCard}>
              <View style={styles.bodyGrid}>
                <BodyStat label="BMI" value={bmi?.toFixed(1) ?? '--'} sub={bmiLabel(bmi)} color={colors.primary} />
                <BodyStat label="基础代谢" value={bmr ? `${bmr}` : '--'} sub="千卡/天" color={colors.warning} />
                <BodyStat label="每日消耗" value={tdee ? `${tdee}` : '--'} sub="TDEE 千卡" color="#E74C3C" />
                <BodyStat
                  label="目标热量"
                  value={calTarget ? `${calTarget}` : '--'}
                  sub={goal?.type === '减脂' ? '减脂缺口' : goal?.type === '增肌' ? '增肌盈余' : '维持'}
                  color={colors.success}
                />
              </View>
              {ideal && (
                <View style={styles.idealRow}>
                  <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary">
                    理想体重范围 {ideal.min}–{ideal.max} kg
                    {goal?.targetWeight ? ` · 你的目标 ${goal.targetWeight}kg` : ''}
                  </ThemedText>
                </View>
              )}
              {macros && (
                <View style={styles.macroRow}>
                  <MacroChip label="蛋白质" value={`${macros.protein}g`} color="#E74C3C" />
                  <MacroChip label="碳水" value={`${macros.carbs}g`} color={colors.warning} />
                  <MacroChip label="脂肪" value={`${macros.fat}g`} color={colors.primary} />
                </View>
              )}
            </Card>
          )}

          {/* 今日状态 */}
          {plan && todayInfo && (
            <Card style={[styles.todayCard, {
              backgroundColor: todayInfo.isTrainingDay ? colors.primarySoft : colors.yellowSoft,
            }]}>
              <View style={styles.todayRow}>
                <Ionicons
                  name={todayInfo.isTrainingDay ? 'flame' : 'cafe'}
                  size={24}
                  color={todayInfo.isTrainingDay ? colors.primary : '#B07A26'}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText type="subtitle">
                    {todayInfo.isTrainingDay
                      ? `今天是训练日 · ${todayInfo.day!.title}`
                      : '今天是休息日'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {todayInfo.isTrainingDay
                      ? `约${todayInfo.day!.durationMinutes}分钟 · ${todayInfo.day!.exercises.length}个动作`
                      : '好好恢复，肌肉在休息时生长'}
                  </ThemedText>
                </View>
              </View>
            </Card>
          )}

          {/* 训练条件表单 */}
          <Card style={styles.form}>
            <ThemedText type="subtitle">训练条件</ThemedText>

            {/* 训练分化建议 */}
            <View style={[styles.splitHint, { backgroundColor: colors.backgroundElement }]}>
              <Ionicons name="bulb" size={16} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <ThemedText type="smallBold">{splitAdvice.split}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{splitAdvice.description}</ThemedText>
              </View>
            </View>

            <ThemedText type="smallBold">每周训练天数</ThemedText>
            <View style={styles.stepper}>
              <Pressable style={[styles.stepBtn, { backgroundColor: colors.backgroundElement }]} onPress={() => setWeeklyFrequency((v) => Math.max(1, v - 1))}>
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>
              <ThemedText type="subtitle">{weeklyFrequency} 天</ThemedText>
              <Pressable style={[styles.stepBtn, { backgroundColor: colors.backgroundElement }]} onPress={() => setWeeklyFrequency((v) => Math.min(7, v + 1))}>
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>

            <OptionRow label="单次时长" options={DURATIONS.map((v) => ({ value: v, label: `${v}分钟` }))} value={duration} onChange={setDuration} />
            <OptionRow label="训练地点" options={LOCATIONS} value={location} onChange={setLocation} />
            <OptionRow label="训练基础" options={LEVELS} value={level} onChange={setLevel} />
            <OptionRow label="器械条件" options={[{ value: false, label: '无器械' }, { value: true, label: '有器械' }]} value={hasEquipment} onChange={setHasEquipment} />

            <ThemedText type="smallBold">身体限制（可选）</ThemedText>
            <TextInput
              value={limitations}
              onChangeText={setLimitations}
              placeholder="例如：膝关节避免跳跃、腰部不适"
              placeholderTextColor={colors.textSecondary}
              multiline maxLength={240}
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }]}
            />
            <Button title={plan ? '重新生成计划' : '生成训练计划'} icon="calendar-outline" loading={loading} onPress={runGenerate} size="large" />
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <ThemedText type="small" themeColor="danger" style={{ flex: 1 }}>{error}</ThemedText>
              </View>
            ) : null}
          </Card>

          {/* 生成的计划详情 */}
          {plan ? (
            <View style={styles.result}>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="checkmark" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="subtitle">计划已生成</ThemedText>
                  <ThemedText themeColor="textSecondary">{plan.summary}</ThemedText>
                </View>
              </View>

              {plan.weeklySchedule.map((day) => (
                <Card key={day.day} style={styles.dayCard}>
                  <View style={styles.dayHead}>
                    <View>
                      <ThemedText type="smallBold">第{day.day}天 · 周{WEEKDAY[(day.day - 1) % 7]}</ThemedText>
                      <ThemedText type="subtitle">{day.title}</ThemedText>
                      {day.focusDescription ? (
                        <ThemedText type="small" themeColor="textSecondary">{day.focusDescription}</ThemedText>
                      ) : null}
                    </View>
                    <View style={[styles.dayDurBadge, { backgroundColor: colors.primarySoft }]}>
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                        {day.durationMinutes}分钟
                      </Text>
                    </View>
                  </View>

                  {/* 热身 */}
                  {day.warmup && day.warmup.length > 0 && (
                    <View style={styles.phaseBlock}>
                      <View style={[styles.phaseHead, { backgroundColor: colors.yellowSoft }]}>
                        <Ionicons name="sunny" size={15} color="#B07A26" />
                        <Text style={{ color: '#B07A26', fontWeight: '700', fontSize: 13 }}>热身 · {day.warmup.reduce((s, w) => s + (parseInt(w.duration || '0') || 0), 0)}分钟</Text>
                      </View>
                      {day.warmup.map((w, i) => (
                        <View key={i} style={styles.sectionItem}>
                          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{w.name}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{w.duration} · {w.notes}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 正式训练 */}
                  <View style={styles.phaseBlock}>
                    <View style={[styles.phaseHead, { backgroundColor: colors.primarySoft }]}>
                      <Ionicons name="barbell" size={15} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>正式训练 · {day.exercises.length}个动作</Text>
                    </View>
                    {day.exercises.map((ex, j) => (
                      <View key={`${ex.name}-${j}`} style={[styles.exercise, j > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <ThemedText type="smallBold">{ex.name}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {ex.sets}组 × {ex.reps} · 休息{ex.restSeconds}秒
                            {ex.category ? ` · ${ex.category}` : ''}
                          </ThemedText>
                          <ThemedText type="small">{ex.notes}</ThemedText>
                        </View>
                        {ex.searchKeyword ? (
                          <Pressable
                            style={[styles.searchBtn, { backgroundColor: '#FB7299' }]}
                            onPress={() => openBilibiliSearch(ex.searchKeyword!)}>
                            <Ionicons name="play-circle" size={18} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>找跟练</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                  </View>

                  {/* 拉伸 */}
                  {day.stretching && day.stretching.length > 0 && (
                    <View style={styles.phaseBlock}>
                      <View style={[styles.phaseHead, { backgroundColor: '#E7F0FA' }]}>
                        <Ionicons name="leaf" size={15} color="#3E6FA8" />
                        <Text style={{ color: '#3E6FA8', fontWeight: '700', fontSize: 13 }}>拉伸放松</Text>
                      </View>
                      {day.stretching.map((s, i) => (
                        <View key={i} style={styles.sectionItem}>
                          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{s.name}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{s.duration} · {s.notes}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              ))}

              {/* 训练提醒 */}
              <View style={[styles.reminders, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="smallBold">训练提醒</ThemedText>
                {plan.reminders.map((item, i) => (
                  <View key={`r-${i}`} style={styles.reminderRow}>
                    <Ionicons name="checkmark-circle-outline" size={17} color={colors.primary} />
                    <ThemedText type="small" style={{ flex: 1 }}>{item}</ThemedText>
                  </View>
                ))}
                {plan.disclaimer ? (
                  <ThemedText type="small" themeColor="textSecondary">{plan.disclaimer}</ThemedText>
                ) : null}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// ---- 小 UI 组件 ----

function BodyStat({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 11, color: '#5A7A6F' }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: '#8AA89C' }}>{sub}</Text>
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${color}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '800', color }}>{value}</Text>
    </View>
  );
}

function OptionRow<T extends string | number | boolean>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: string; icon?: string }[]; value: T; onChange: (v: T) => void;
}) {
  const colors = useTheme();
  return (
    <View style={styles.optGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.opts}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={String(opt.value)}
              onPress={() => onChange(opt.value)}
              style={[styles.opt, { backgroundColor: selected ? colors.primary : colors.backgroundElement }]}>
              {opt.icon ? <Ionicons name={opt.icon as any} size={14} color={selected ? '#fff' : colors.text} /> : null}
              <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '600', fontSize: 13 }}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.four },

  // 身体数据卡片
  bodyCard: { gap: Spacing.two },
  bodyGrid: { flexDirection: 'row', gap: Spacing.two },
  idealRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  macroRow: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'center', paddingTop: 2 },

  // 今日状态
  todayCard: { padding: Spacing.three },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },

  // 表单
  form: { gap: Spacing.three },
  splitHint: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepBtn: { width: 38, height: 38, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
  optGroup: { gap: Spacing.two },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.three, paddingVertical: 10, borderRadius: Radius.chip },
  input: { minHeight: 76, borderRadius: Radius.button, padding: Spacing.three, fontSize: 16, textAlignVertical: 'top' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },

  // 计划结果
  result: { gap: Spacing.three },
  summaryRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  summaryIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  dayCard: { gap: Spacing.three },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  dayDurBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },

  // 训练阶段块
  phaseBlock: { gap: Spacing.two },
  phaseHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, alignSelf: 'flex-start' },
  sectionItem: { gap: 2, paddingLeft: 4 },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
  },

  reminders: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16 },
  reminderRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
});

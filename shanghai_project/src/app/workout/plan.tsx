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
import type { BodyData, WorkoutPlan, WorkoutPlanInput } from '@/types/workout';
import {
  calcBMR, calcTDEE, calcBMI, bmiLabel, idealWeightRange,
  targetCalories, macroSplit, trainingSplitAdvice, estimateBodyFat,
} from '@/utils/nutrition';

// ---- 常量 ----
const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];
const EQUIPMENT_OPTIONS = [
  { key: 'none', label: '无器械', icon: 'body' },
  { key: 'mat', label: '瑜伽垫', icon: 'leaf' },
  { key: 'dumbbell', label: '哑铃', icon: 'barbell' },
  { key: 'barbell', label: '杠铃', icon: 'fitness' },
  { key: 'band', label: '弹力带', icon: 'pulse' },
  { key: 'kettlebell', label: '壶铃', icon: 'flame' },
  { key: 'bench', label: '卧推凳', icon: 'grid' },
  { key: 'rack', label: '深蹲架', icon: 'hardware-chip' },
  { key: 'cable', label: '龙门架/绳索', icon: 'git-network' },
  { key: 'pullup', label: '引体向上杆', icon: 'arrow-up' },
  { key: 'trx', label: 'TRX/悬挂绳', icon: 'infinite' },
  { key: 'treadmill', label: '跑步机', icon: 'walk' },
  { key: 'bike', label: '动感单车', icon: 'bicycle' },
  { key: 'rower', label: '划船机', icon: 'boat' },
  { key: 'rope', label: '跳绳', icon: 'sync' },
  { key: 'roller', label: '泡沫轴', icon: 'disc' },
  { key: 'ball', label: '健身球', icon: 'planet' },
  { key: 'other', label: '其他器械', icon: 'ellipsis-horizontal' },
];
const STYLE_OPTIONS = [
  { key: 'gentle', label: '温和', desc: '低强度，不追求极限' },
  { key: 'moderate', label: '标准', desc: '中等强度，循序渐进' },
  { key: 'intense', label: '高强度', desc: '全力以赴，冲击极限' },
];
const GOAL_TYPES = ['减脂', '增肌', '塑形', '保持健康'] as const;

// ---- 组件 ----

export default function WorkoutPlanPage() {
  const colors = useTheme();
  const { bodyData: savedBody, goal: savedGoal, setBodyData, setGoal } = useUserStore();
  const savePlan = usePlanStore((s) => s.setPlan);

  // ===== 第1步：基础信息 =====
  const [gender, setGender] = useState<'男' | '女'>(savedBody?.gender ?? '男');
  const [age, setAge] = useState(savedBody?.age ? String(savedBody.age) : '25');
  const [height, setHeight] = useState(savedBody?.height ? String(savedBody.height) : '170');
  const [weight, setWeight] = useState(savedBody?.weight ? String(savedBody.weight) : '65');
  const [bodyFat, setBodyFat] = useState(savedBody?.bodyFat ? String(savedBody.bodyFat) : '');

  // ===== 第2步：身材维度（可选）=====
  const [waist, setWaist] = useState(savedBody?.waist ? String(savedBody.waist) : '');
  const [hip, setHip] = useState(savedBody?.hip ? String(savedBody.hip) : '');

  // ===== 第3步：目标与条件 =====
  const [goalType, setGoalType] = useState<string>(savedGoal?.type ?? '减脂');
  const [targetWeight, setTargetWeight] = useState(savedGoal?.targetWeight ? String(savedGoal.targetWeight) : '');
  const [equipment, setEquipment] = useState<string[]>(() => {
    if (!savedGoal) return ['mat'];
    return ['mat']; // 默认至少有瑜伽垫
  });
  const [style, setStyle] = useState('moderate');
  const [weeklyFrequency, setWeeklyFrequency] = useState(savedGoal?.weeklyFrequency ?? 3);
  const [sessionDuration, setSessionDuration] = useState(goalType === '减脂' ? 45 : 30);
  const [limitations, setLimitations] = useState('');

  // ---- 计划状态 ----
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ---- 自动推导 ----
  const hNum = parseFloat(height) || 170;
  const wNum = parseFloat(weight) || 65;
  const bmi = calcBMI({ height: hNum, weight: wNum, age: parseInt(age) || 25, gender } as BodyData);
  const bmr = calcBMR({ height: hNum, weight: wNum, age: parseInt(age) || 25, gender } as BodyData);
  const bodyForTdee: BodyData = { height: hNum, weight: wNum, age: parseInt(age) || 25, gender };
  const tdee = calcTDEE(bodyForTdee, weeklyFrequency);
  const calTarget = targetCalories(bodyForTdee, { type: goalType } as any, weeklyFrequency);
  const macros = calTarget ? macroSplit(calTarget, goalType) : null;
  const ideal = idealWeightRange(hNum);
  const splitAdvice = trainingSplitAdvice(weeklyFrequency, goalType);

  // 体脂率：优先用户填的，否则估算
  const bodyFatNum = parseFloat(bodyFat) || undefined;
  const estimatedBF = bodyFatNum ?? (savedBody ? estimateBodyFat({ ...savedBody, height: hNum, weight: wNum, waist: parseFloat(waist) || undefined, hip: parseFloat(hip) || undefined, age: parseInt(age) || 25, gender }) : null);
  const bfDisplay = bodyFatNum ? `${bodyFatNum}%` : estimatedBF ? `${estimatedBF.toFixed(1)}%` : null;

  // 今日状态
  const todayInfo = useMemo(() => {
    if (!plan) return null;
    const dow = new Date().getDay();
    const dayIndex = dow === 0 ? 6 : dow - 1;
    const today = plan.weeklySchedule.find((d) => d.day - 1 === dayIndex);
    if (today) return { isTrainingDay: true as const, day: today };
    return { isTrainingDay: false as const };
  }, [plan]);

  useEffect(() => {
    fetchLatestWorkoutPlan().then((latest) => {
      if (latest) { setPlan(latest); savePlan(latest); }
    }).catch(() => {});
  }, [savePlan]);

  function toggleEquip(key: string) {
    setEquipment((prev) =>
      key === 'none' ? ['none'] : prev.filter((k) => k !== 'none').includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev.filter((k) => k !== 'none'), key]
    );
  }

  async function runGenerate() {
    setLoading(true); setError('');
    try {
      // 先保存身体数据
      const body: BodyData = {
        gender, age: parseInt(age) || 25, height: hNum, weight: wNum,
        bodyFat: bodyFatNum, waist: parseFloat(waist) || undefined,
        hip: parseFloat(hip) || undefined,
      };
      await setBodyData(body);
      await setGoal({ type: goalType as any, targetWeight: parseFloat(targetWeight) || undefined, weeklyFrequency });

      const input: WorkoutPlanInput = {
        goalType: ({ '减脂': 'lose_fat', '增肌': 'gain_muscle', '塑形': 'shape' } as const)[goalType] || 'maintain',
        weeklyFrequency,
        sessionDurationMinutes: sessionDuration,
        workoutLocation: 'home',
        hasEquipment: !equipment.includes('none') && equipment.length > 0,
        fitnessLevel: 'beginner',
        limitations: limitations.split(/[，,；;\n]/).map((s) => s.trim()).filter(Boolean),
        bodyData: {
          height: hNum, weight: wNum, age: parseInt(age) || 25, gender,
          bmi: bmi ?? undefined, bmr: bmr ?? undefined,
          tdee: tdee ?? undefined, targetCalories: calTarget,
          bodyFat: estimatedBF ?? undefined,
        },
        goal: { type: goalType, targetWeight: parseFloat(targetWeight) || undefined },
        // 额外传给 AI 的上下文
        equipmentList: equipment.filter((k) => k !== 'none'),
        trainingStyle: style,
        bodyFatEstimate: estimatedBF,
      } as any;

      const result = await generateWorkoutPlan(input);
      setPlan(result);
      savePlan(result);
    } catch (e) {
      setError((e as Error).message || '训练计划生成失败');
    } finally { setLoading(false); }
  }

  function openBilibili(keyword: string) {
    Linking.openURL(`https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`).catch(() => {});
  }

  // ===== 渲染 =====
  return (
    <ThemedView style={styles.outer}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">训练计划</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">填写数据 → AI 生成个性化方案</ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* ====== 步骤1：基础信息 ====== */}
          <StepBadge num={1} label="基础信息" colors={colors} />
          <Card style={styles.card}>
            {/* 性别 */}
            <ThemedText type="smallBold">性别</ThemedText>
            <View style={styles.chipRow}>
              {(['男', '女'] as const).map((g) => (
                <Pressable key={g} onPress={() => setGender(g)} style={[styles.chip, {
                  backgroundColor: gender === g ? colors.primary : colors.backgroundElement,
                  borderColor: gender === g ? colors.primary : colors.border,
                }]}>
                  <Text style={{ color: gender === g ? '#fff' : colors.text, fontWeight: '700' }}>{g}</Text>
                </Pressable>
              ))}
            </View>

            {/* 年龄 + 身高 + 体重 */}
            <View style={styles.row3}>
              <Field label="年龄" value={age} onChange={setAge} suffix="岁" numeric colors={colors} />
              <Field label="身高" value={height} onChange={setHeight} suffix="cm" numeric colors={colors} />
              <Field label="体重" value={weight} onChange={setWeight} suffix="kg" numeric colors={colors} />
            </View>

            {/* 自动计算结果 */}
            {bmi && (
              <View style={[styles.resultBar, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="analytics" size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                  BMI {bmi.toFixed(1)} · {bmiLabel(bmi)}
                  {bmr ? ` · BMR ${bmr} kcal` : ''}
                  {tdee ? ` · TDEE ${tdee} kcal` : ''}
                </Text>
              </View>
            )}

            {/* 体脂率 */}
            <ThemedText type="smallBold">体脂率</ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <TextInput
                value={bodyFat}
                onChangeText={(t) => setBodyFat(t.replace(/[^\d.]/g, ''))}
                placeholder={estimatedBF ? `估算 ${estimatedBF.toFixed(1)}%` : '自填或留空'}
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                style={[styles.input, { flex: 1, color: colors.text, backgroundColor: colors.backgroundElement }]}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>%</Text>
            </View>
            {!bodyFat && estimatedBF && (
              <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                未填写时使用围度估算值（{estimatedBF.toFixed(1)}%）
              </Text>
            )}
          </Card>

          {/* ====== 步骤2：身材维度（可选）====== */}
          <StepBadge num={2} label="身材维度" sub="可选" colors={colors} />
          <Card style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.two }}>
              填写后体脂率和计划更精准
            </ThemedText>
            <View style={styles.row3}>
              <Field label="腰围" value={waist} onChange={setWaist} suffix="cm" numeric optional colors={colors} />
              <Field label="臀围" value={hip} onChange={setHip} suffix="cm" numeric optional colors={colors} />
              <View style={{ flex: 1 }} />
            </View>
          </Card>

          {/* ====== 步骤3：目标与条件 ====== */}
          <StepBadge num={3} label="健身目标与条件" colors={colors} />

          {/* 3a. 健身目标 */}
          <Card style={styles.card}>
            <ThemedText type="smallBold">健身目标</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">选择主要方向，AI 会针对性设计</ThemedText>
            <View style={styles.chipRow}>
              {GOAL_TYPES.map((g) => (
                <Pressable key={g} onPress={() => setGoalType(g)} style={[styles.chip, {
                  backgroundColor: goalType === g ? colors.primary : colors.backgroundElement,
                  borderColor: goalType === g ? colors.primary : colors.border,
                }]}>
                  <Text style={{ color: goalType === g ? '#fff' : colors.text, fontWeight: '700' }}>{g}</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* 3b. 目标体重 */}
          <Card style={styles.card}>
            <ThemedText type="smallBold">目标体重</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {ideal ? `根据身高 ${hNum}cm，健康体重范围 ${ideal.min}–${ideal.max} kg` : '设定一个合理的目标体重'}
            </ThemedText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two }}>
              <TextInput
                value={targetWeight} onChangeText={(t) => setTargetWeight(t.replace(/[^\d.]/g, ''))}
                placeholder="留空则由 AI 自动判断"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                style={[styles.input, { flex: 1, color: colors.text, backgroundColor: colors.backgroundElement }]}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>kg</Text>
            </View>
            {calTarget && macros && (
              <View style={[styles.macroCard, { backgroundColor: colors.backgroundElement, marginTop: Spacing.two }]}>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: colors.primary }]}>{calTarget}</Text>
                  <Text style={[styles.macroUnit, { color: colors.textSecondary }]}>kcal/天</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: '#E74C3C' }]}>{macros.protein}g</Text>
                  <Text style={[styles.macroUnit, { color: colors.textSecondary }]}>蛋白质</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: '#F5B14C' }]}>{macros.carbs}g</Text>
                  <Text style={[styles.macroUnit, { color: colors.textSecondary }]}>碳水</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: '#3E6FA8' }]}>{macros.fat}g</Text>
                  <Text style={[styles.macroUnit, { color: colors.textSecondary }]}>脂肪</Text>
                </View>
              </View>
            )}
          </Card>

          {/* 3b. 器械 */}
          <Card style={styles.card}>
            <ThemedText type="smallBold">可用器械（多选）</ThemedText>
            <View style={styles.chipRow}>
              {EQUIPMENT_OPTIONS.map((eq) => {
                const sel = equipment.includes(eq.key);
                return (
                  <Pressable key={eq.key} onPress={() => toggleEquip(eq.key)} style={[styles.chip, {
                    backgroundColor: sel ? colors.primary : colors.backgroundElement,
                    borderColor: sel ? colors.primary : colors.border,
                  }]}>
                    <Ionicons name={eq.icon as any} size={13} color={sel ? '#fff' : colors.text} />
                    <Text style={{ color: sel ? '#fff' : colors.text, fontWeight: '600', fontSize: 12 }}>{eq.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* 3c. 训练风格 */}
          <Card style={styles.card}>
            <ThemedText type="smallBold">训练偏好</ThemedText>
            <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
              {STYLE_OPTIONS.map((s) => {
                const sel = style === s.key;
                return (
                  <Pressable key={s.key} onPress={() => setStyle(s.key)} style={[styles.styleRow, {
                    backgroundColor: sel ? colors.primarySoft : colors.backgroundElement,
                    borderColor: sel ? colors.primary : colors.border,
                  }]}>
                    <View style={[styles.radio, { borderColor: sel ? colors.primary : colors.textSecondary }]}>
                      {sel && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{s.label}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{s.desc}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* 3d. 频率 + 时长 */}
          <Card style={styles.card}>
            <ThemedText type="smallBold">每周训练 {weeklyFrequency} 天 · 每次 {sessionDuration} 分钟</ThemedText>
            <View style={[styles.splitHint, { backgroundColor: colors.backgroundElement, marginTop: Spacing.two }]}>
              <Ionicons name="bulb" size={15} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{splitAdvice.split}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{splitAdvice.description}</Text>
              </View>
            </View>
            {/* 频率滑块 */}
            <View style={styles.stepper}>
              <Pressable onPress={() => setWeeklyFrequency((v) => Math.max(1, v - 1))}
                style={[styles.stepBtn, { backgroundColor: colors.backgroundElement }]}>
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>
              <ThemedText type="subtitle">{weeklyFrequency} 天</ThemedText>
              <Pressable onPress={() => setWeeklyFrequency((v) => Math.min(7, v + 1))}
                style={[styles.stepBtn, { backgroundColor: colors.backgroundElement }]}>
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>
            {/* 时长选择 */}
            <View style={styles.chipRow}>
              {[20, 30, 45, 60].map((d) => (
                <Pressable key={d} onPress={() => setSessionDuration(d)} style={[styles.chip, {
                  backgroundColor: sessionDuration === d ? colors.primary : colors.backgroundElement,
                  borderColor: sessionDuration === d ? colors.primary : colors.border,
                }]}>
                  <Text style={{ color: sessionDuration === d ? '#fff' : colors.text, fontWeight: '600' }}>{d}分钟</Text>
                </Pressable>
              ))}
            </View>
          </Card>

          {/* 身体情况说明 */}
          <Card style={styles.card}>
            <ThemedText type="smallBold">有什么需要避开的吗？</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              填写后 AI 会自动避开不适合你的动作，让训练更安全
            </ThemedText>
            <TextInput
              value={limitations} onChangeText={setLimitations}
              placeholder="例如：右膝偶尔不适，避免跳跃类动作；腰部容易酸痛，不要大重量硬拉；左手腕旧伤注意…"
              placeholderTextColor={colors.textSecondary}
              multiline maxLength={300}
              style={[styles.textArea, { color: colors.text, backgroundColor: colors.backgroundElement }]}
            />
          </Card>

          {/* ====== 生成按钮 ====== */}
          <Button title={plan ? '重新生成计划' : '✨ AI 生成训练计划'} icon="calendar-outline"
            loading={loading} onPress={runGenerate} size="large" />
          {error ? (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <ThemedText type="small" themeColor="danger" style={{ flex: 1 }}>{error}</ThemedText>
            </View>
          ) : null}

          {/* ====== 已有计划 ====== */}
          {plan ? (
            <View style={styles.planResult}>
              {/* 今日状态 */}
              {todayInfo && (
                <View style={[styles.todayCard, {
                  backgroundColor: todayInfo.isTrainingDay ? colors.primarySoft : colors.yellowSoft,
                }]}>
                  <Ionicons name={todayInfo.isTrainingDay ? 'flame' : 'cafe'} size={22}
                    color={todayInfo.isTrainingDay ? colors.primary : '#B07A26'} />
                  <View style={{ flex: 1 }}>
                    <ThemedText type="subtitle">
                      {todayInfo.isTrainingDay
                        ? `今天训练日 · ${todayInfo.day!.title}`
                        : '今天是休息日 · 肌肉在恢复中生长'}
                    </ThemedText>
                    {todayInfo.isTrainingDay && (
                      <ThemedText type="small" themeColor="textSecondary">
                        约{todayInfo.day!.durationMinutes}分钟 · {todayInfo.day!.exercises.length}个动作
                      </ThemedText>
                    )}
                  </View>
                </View>
              )}

              <ThemedText type="subtitle" style={{ marginBottom: Spacing.two }}>📋 每周计划</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.two }}>
                {plan.summary}
              </ThemedText>

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
                    <View style={[styles.dayBadge, { backgroundColor: colors.primarySoft }]}>
                      <Text style={{ color: colors.primary, fontWeight: '700' }}>{day.durationMinutes}min</Text>
                    </View>
                  </View>

                  {day.warmup?.length ? (
                    <PhaseBlock color="#B07A26" bg={colors.yellowSoft} icon="sunny" title={`热身 · ${day.warmup.reduce((s,w) => s + (parseInt(w.duration||'0')||0), 0)}min`} items={day.warmup} colors={colors} />
                  ) : null}

                  <PhaseBlock color={colors.primary} bg={colors.primarySoft} icon="barbell" title={`训练 · ${day.exercises.length}个动作`} items={day.exercises} colors={colors}
                    renderRight={(ex: any) => ex.searchKeyword ? (
                      <Pressable style={[styles.searchBtn, { backgroundColor: '#FB7299' }]} onPress={() => openBilibili(ex.searchKeyword!)}>
                        <Ionicons name="play-circle" size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>找跟练</Text>
                      </Pressable>
                    ) : null}
                  />

                  {day.stretching?.length ? (
                    <PhaseBlock color="#3E6FA8" bg="#E7F0FA" icon="leaf" title="拉伸放松" items={day.stretching} colors={colors} />
                  ) : null}
                </Card>
              ))}

              <View style={[styles.reminders, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="smallBold">训练提醒</ThemedText>
                {plan.reminders.map((item, i) => (
                  <View key={`r-${i}`} style={styles.reminderRow}>
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                    <ThemedText type="small" style={{ flex: 1 }}>{item}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Card style={[styles.planResult, { alignItems: 'center', padding: Spacing.five }]}>
              <Ionicons name="fitness-outline" size={48} color={colors.backgroundSelected} />
              <ThemedText type="subtitle" style={{ marginTop: Spacing.two }}>填写上方信息</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                越详细的身体数据，AI 生成的训练计划越精准
              </ThemedText>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// ---- 小部件 ----

function StepBadge({ num, label, sub, colors }: { num: number; label: string; sub?: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.two, marginBottom: -Spacing.two, paddingHorizontal: Spacing.two }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{num}</Text>
      </View>
      <ThemedText type="smallBold">{label}</ThemedText>
      {sub ? <ThemedText type="small" themeColor="textSecondary">{sub}</ThemedText> : null}
    </View>
  );
}

function Field({ label, value, onChange, suffix, numeric, optional, colors }: {
  label: string; value: string; onChange: (v: string) => void; suffix: string; numeric?: boolean; optional?: boolean; colors: any;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>{label}{optional ? ' (选)' : ''}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundElement, borderRadius: Radius.button, paddingHorizontal: 10 }}>
        <TextInput
          value={value}
          onChangeText={(t) => onChange(numeric ? t.replace(/[^\d.]/g, '') : t)}
          keyboardType={numeric ? 'numeric' : 'default'}
          placeholder={optional ? '--' : ''}
          placeholderTextColor={colors.textSecondary}
          style={{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: 10 }}
        />
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{suffix}</Text>
      </View>
    </View>
  );
}

function PhaseBlock({ color, bg, icon, title, items, colors, renderRight }: {
  color: string; bg: string; icon: string; title: string;
  items: any[]; colors: any; renderRight?: (item: any) => React.ReactNode;
}) {
  return (
    <View style={{ gap: Spacing.two }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' }}>
        <Ionicons name={icon as any} size={13} color={color} />
        <Text style={{ color, fontWeight: '700', fontSize: 12 }}>{title}</Text>
      </View>
      {items.map((item: any, i: number) => (
        <View key={i} style={[item.sets ? {} : {}, i > 0 && item.sets ? { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.two } : {}]}>
          {item.sets ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{item.name}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {item.sets}组 × {item.reps} · 休息{item.restSeconds}s
                  {item.category ? ` · ${item.category}` : ''}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.notes}</Text>
              </View>
              {renderRight?.(item)}
            </View>
          ) : (
            <View>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{item.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{item.duration} · {item.notes}</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// ---- 样式 ----
const styles = StyleSheet.create({
  outer: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.three },

  card: { gap: Spacing.two },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.chip, borderWidth: 1 },

  row3: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  input: { borderRadius: Radius.button, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },

  resultBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.two, borderRadius: Radius.chip },
  macroCard: { flexDirection: 'row', borderRadius: Radius.card, padding: Spacing.two, marginTop: Spacing.one },
  macroItem: { flex: 1, alignItems: 'center' },
  macroVal: { fontSize: 17, fontWeight: '800' },
  macroUnit: { fontSize: 10 },

  styleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card, borderWidth: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  splitHint: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.two, borderRadius: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginTop: Spacing.two },
  stepBtn: { width: 40, height: 40, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
  textArea: { minHeight: 72, borderRadius: Radius.button, padding: Spacing.three, fontSize: 14, textAlignVertical: 'top', marginTop: Spacing.one },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },

  planResult: { gap: Spacing.three },
  todayCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card },
  dayCard: { gap: Spacing.two },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  dayBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  searchBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  reminders: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16 },
  reminderRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
});

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getToken } from '@/services/api';
import { fetchLatestWorkoutPlan, generateWorkoutPlan } from '@/services/workout';
import { useUserStore } from '@/store/userStore';
import { usePlanStore } from '@/store/planStore';
import type { WorkoutPlan, WorkoutPlanInput } from '@/types/workout';

const DURATIONS = [20, 30, 45, 60];
const LOCATIONS: { value: WorkoutPlanInput['workoutLocation']; label: string }[] = [
  { value: 'home', label: '居家' }, { value: 'gym', label: '健身房' }, { value: 'outdoor', label: '户外' },
];
const LEVELS: { value: WorkoutPlanInput['fitnessLevel']; label: string }[] = [
  { value: 'beginner', label: '入门' }, { value: 'intermediate', label: '进阶' }, { value: 'advanced', label: '有经验' },
];

function goalCode(value?: string): WorkoutPlanInput['goalType'] {
  return ({ '\u51cf\u8102': 'lose_fat', '\u589e\u808c': 'gain_muscle', '\u5851\u5f62': 'shape' } as const)[value || ''] || 'maintain';
}

export default function WorkoutPlanPage() {
  const colors = useTheme();
  const goal = useUserStore((state) => state.goal);
  const savePlan = usePlanStore((state) => state.setPlan);
  const [weeklyFrequency, setWeeklyFrequency] = useState(() => goal?.weeklyFrequency ?? 3);
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState<WorkoutPlanInput['workoutLocation']>('home');
  const [hasEquipment, setHasEquipment] = useState(false);
  const [level, setLevel] = useState<WorkoutPlanInput['fitnessLevel']>('beginner');
  const [limitations, setLimitations] = useState('');
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) return;
    fetchLatestWorkoutPlan().then((latest) => {
      if (latest) { setPlan(latest); savePlan(latest); }
    }).catch(() => {});
  }, [savePlan]);

  async function runGenerate() {
    if (!getToken()) {
      setError('生成个性化计划需要登录账号，以便读取并保存身体数据。');
      return;
    }
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
        limitations: limitations.split(/[，,；;\n]/).map((item) => item.trim()).filter(Boolean),
      });
      setPlan(result);
      savePlan(result);
    } catch (requestError) {
      setError((requestError as Error).message || '训练计划生成失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  async function openVideo(url: string) {
    const supported = await Linking.canOpenURL(url).catch(() => false);
    if (supported) await Linking.openURL(url);
    else setError('视频链接暂时不可用，文字动作说明仍可正常跟练。');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">每周训练计划</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">按你的条件生成可执行的动作与提醒</ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.form}>
            <ThemedText type="subtitle">训练条件</ThemedText>

            <ThemedText type="smallBold">每周训练天数</ThemedText>
            <View style={styles.stepper}>
              <Pressable style={[styles.stepButton, { backgroundColor: colors.backgroundElement }]} onPress={() => setWeeklyFrequency((value) => Math.max(1, value - 1))}>
                <Ionicons name="remove" size={18} color={colors.text} />
              </Pressable>
              <ThemedText type="subtitle">{weeklyFrequency} 天</ThemedText>
              <Pressable style={[styles.stepButton, { backgroundColor: colors.backgroundElement }]} onPress={() => setWeeklyFrequency((value) => Math.min(7, value + 1))}>
                <Ionicons name="add" size={18} color={colors.text} />
              </Pressable>
            </View>

            <OptionRow label="单次时长" options={DURATIONS.map((value) => ({ value, label: `${value} 分钟` }))} value={duration} onChange={setDuration} />
            <OptionRow label="训练地点" options={LOCATIONS} value={location} onChange={setLocation} />
            <OptionRow label="训练基础" options={LEVELS} value={level} onChange={setLevel} />
            <OptionRow label="器械条件" options={[{ value: false, label: '无器械' }, { value: true, label: '有器械' }]} value={hasEquipment} onChange={setHasEquipment} />

            <ThemedText type="smallBold">身体限制（可选）</ThemedText>
            <TextInput
              value={limitations}
              onChangeText={setLimitations}
              placeholder="例如：膝关节避免跳跃、腰部不适"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={240}
              style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }]}
            />
            <Button title={plan ? '重新生成计划' : '生成训练计划'} icon="calendar-outline" loading={loading} onPress={runGenerate} size="large" />
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <ThemedText type="small" themeColor="danger" style={{ flex: 1 }}>{error}</ThemedText>
                {!getToken() ? <Pressable onPress={() => router.push('/auth/login')}><ThemedText type="smallBold" themeColor="primary">去登录</ThemedText></Pressable> : null}
              </View>
            ) : null}
          </Card>

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
                  <View style={styles.dayHeader}>
                    <View>
                      <ThemedText type="smallBold">第 {day.day} 天</ThemedText>
                      <ThemedText type="subtitle">{day.title}</ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">约 {day.durationMinutes} 分钟</ThemedText>
                  </View>
                  {day.exercises.map((exercise, index) => (
                    <View key={`${exercise.name}-${index}`} style={[styles.exercise, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <ThemedText type="smallBold">{exercise.name}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {exercise.sets} 组 · {exercise.reps} · 休息 {exercise.restSeconds} 秒
                        </ThemedText>
                        <ThemedText type="small">{exercise.notes}</ThemedText>
                      </View>
                      {exercise.videoUrl ? (
                        <Pressable accessibilityRole="link" onPress={() => openVideo(exercise.videoUrl!)}>
                          <Ionicons name="play-circle-outline" size={26} color={colors.primary} />
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </Card>
              ))}

              <View style={[styles.reminders, { backgroundColor: colors.backgroundElement }]}>
                <ThemedText type="smallBold">训练提醒</ThemedText>
                {plan.reminders.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.reminderRow}>
                    <Ionicons name="checkmark-circle-outline" size={17} color={colors.primary} />
                    <ThemedText type="small" style={{ flex: 1 }}>{item}</ThemedText>
                  </View>
                ))}
                <ThemedText type="small" themeColor="textSecondary">{plan.disclaimer}</ThemedText>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function OptionRow<T extends string | number | boolean>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void;
}) {
  const colors = useTheme();
  return (
    <View style={styles.optionGroup}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable key={String(option.value)} onPress={() => onChange(option.value)} style={[styles.option, { backgroundColor: selected ? colors.primary : colors.backgroundElement }]}>
              <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '600' }}>{option.label}</Text>
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
  form: { gap: Spacing.three }, stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepButton: { width: 38, height: 38, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
  optionGroup: { gap: Spacing.two }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: { paddingHorizontal: Spacing.three, paddingVertical: 10, borderRadius: Radius.chip },
  input: { minHeight: 76, borderRadius: Radius.button, padding: Spacing.three, fontSize: 16, textAlignVertical: 'top' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, result: { gap: Spacing.three },
  summaryRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  summaryIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayCard: { gap: Spacing.two }, dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  reminders: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16 }, reminderRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
});

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FitnessGoal } from '@/types/workout';

const GOALS = [
  { type: '减脂', icon: 'trending-down-outline', description: '降低体脂，建立可持续的饮食与运动节奏' },
  { type: '增肌', icon: 'barbell-outline', description: '提高力量与肌肉量，安排渐进式抗阻训练' },
  { type: '塑形', icon: 'body-outline', description: '改善体态与线条，兼顾力量和灵活性' },
  { type: '保持健康', icon: 'heart-outline', description: '保持活力，规律完成每周运动' },
] as const;
const DEADLINES = ['', '4周', '8周', '12周', '24周'] as const;

type Props = {
  initial?: FitnessGoal | null;
  onSave: (goal: FitnessGoal) => void;
  saving?: boolean;
  error?: string;
};

export function GoalSelector({ initial, onSave, saving, error }: Props) {
  const colors = useTheme();
  const [types, setTypes] = useState<FitnessGoal['type'][]>(
    initial?.types?.length ? initial.types : [initial?.type ?? '减脂']
  );
  const [targetWeight, setTargetWeight] = useState(initial?.targetWeight ? String(initial.targetWeight) : '');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [weeklyFrequency, setWeeklyFrequency] = useState(initial?.weeklyFrequency ?? 3);
  const frequencyCopy = weeklyFrequency <= 2
    ? '轻量起步，优先建立习惯'
    : weeklyFrequency <= 4
      ? '训练与恢复比较均衡'
      : '频率较高，需要更重视恢复和睡眠';

  function handleSave() {
    onSave({
      type: types[0],
      types,
      targetWeight: types.length === 1 && types[0] === '保持健康' ? undefined : parseFloat(targetWeight) || undefined,
      deadline: deadline || undefined,
      weeklyFrequency,
    });
  }

  function toggleGoal(next: FitnessGoal['type']) {
    setTypes((current) => {
      if (next === '保持健康') return ['保持健康'];
      const withoutMaintain = current.filter((item) => item !== '保持健康');
      if (withoutMaintain.includes(next)) {
        return withoutMaintain.length > 1 ? withoutMaintain.filter((item) => item !== next) : withoutMaintain;
      }
      return [...withoutMaintain, next];
    });
  }

  return (
    <View style={styles.content}>
      <View style={styles.intro}>
        <ThemedText style={styles.title}>你想先改变什么？</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.introText}>
          可同时选择多个目标，AI 会协调训练量、视频类型和饮食建议。
        </ThemedText>
      </View>

      <View style={styles.goalList}>
        {GOALS.map((goal) => {
          const selected = types.includes(goal.type);
          return (
            <Pressable
              key={goal.type}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggleGoal(goal.type)}
              style={[
                styles.goalRow,
                {
                  backgroundColor: selected ? colors.primarySoft : colors.card,
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}>
              <View style={[styles.goalIcon, { backgroundColor: selected ? colors.primary : colors.backgroundElement }]}>
                <Ionicons name={goal.icon} size={21} color={selected ? '#fff' : colors.textSecondary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText type="smallBold">{goal.type}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.goalDescription}>{goal.description}</ThemedText>
              </View>
              <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={selected ? colors.primary : colors.border} />
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeading}>
          <View>
            <ThemedText type="smallBold">每周训练几次？</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{frequencyCopy}</ThemedText>
          </View>
        </View>
        <View style={styles.stepper}>
          <Pressable accessibilityLabel="减少每周训练次数" disabled={weeklyFrequency <= 1} onPress={() => setWeeklyFrequency((value) => Math.max(1, value - 1))} style={[styles.stepButton, { backgroundColor: colors.backgroundElement, opacity: weeklyFrequency <= 1 ? 0.4 : 1 }]}>
            <Ionicons name="remove" size={21} color={colors.text} />
          </Pressable>
          <View style={styles.frequencyValue}>
            <Text style={[styles.frequencyNumber, { color: colors.text }]}>{weeklyFrequency}</Text>
            <ThemedText type="small" themeColor="textSecondary">天 / 周</ThemedText>
          </View>
          <Pressable accessibilityLabel="增加每周训练次数" disabled={weeklyFrequency >= 7} onPress={() => setWeeklyFrequency((value) => Math.min(7, value + 1))} style={[styles.stepButton, { backgroundColor: colors.backgroundElement, opacity: weeklyFrequency >= 7 ? 0.4 : 1 }]}>
            <Ionicons name="add" size={21} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View>
          <ThemedText type="smallBold">目标细节</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">不确定可以暂时跳过</ThemedText>
        </View>
        {!(types.length === 1 && types[0] === '保持健康') ? (
          <Input
            label="期望体重"
            value={targetWeight}
            onChangeText={(value) => setTargetWeight(value.replace(/[^\d.]/g, ''))}
            keyboardType="numeric"
            placeholder="可选"
            rightElement={<Text style={[styles.unit, { color: colors.textSecondary }]}>kg</Text>}
          />
        ) : null}
        <ThemedText type="smallBold">希望多久后复盘？</ThemedText>
        <View style={styles.deadlineRow}>
          {DEADLINES.map((value) => {
            const selected = deadline === value;
            return (
              <Pressable key={value || 'none'} onPress={() => setDeadline(value)} style={[styles.deadlineChip, { backgroundColor: selected ? colors.primary : colors.backgroundElement }]}>
                <Text style={{ color: selected ? '#fff' : colors.text, fontSize: 12, fontWeight: '700' }}>{value || '暂不设置'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.summary, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="sparkles-outline" size={20} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold">计划将按这个节奏生成</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {types.join(' + ')} · 每周 {weeklyFrequency} 练{deadline ? ` · ${deadline}后复盘` : ''}
          </ThemedText>
        </View>
      </View>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.pinkSoft }]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <ThemedText type="small" themeColor="danger" style={{ flex: 1 }}>{error}</ThemedText>
        </View>
      ) : null}

      <Button title={initial ? '保存健身目标' : '完成目标设置'} onPress={handleSave} loading={saving} size="large" icon="checkmark-circle-outline" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three, paddingBottom: Spacing.three },
  intro: { gap: Spacing.one, paddingHorizontal: Spacing.one },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '800' },
  introText: { lineHeight: 20, maxWidth: 420 },
  goalList: { gap: Spacing.two },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderWidth: 1, borderRadius: Radius.card },
  goalIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  goalDescription: { lineHeight: 18, marginTop: 2 },
  section: { gap: Spacing.three, padding: Spacing.three, borderWidth: 1, borderRadius: Radius.card },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepButton: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  frequencyValue: { alignItems: 'center' },
  frequencyNumber: { fontSize: 34, lineHeight: 40, fontWeight: '800' },
  deadlineRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  deadlineChip: { paddingHorizontal: Spacing.three, paddingVertical: 9, borderRadius: Radius.chip },
  unit: { fontSize: 12, paddingLeft: Spacing.two },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.card },
  errorBanner: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', padding: Spacing.three, borderRadius: Radius.button },
});

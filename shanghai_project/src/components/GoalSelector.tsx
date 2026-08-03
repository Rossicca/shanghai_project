import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { FitnessGoal } from '@/types/workout';

const GOAL_TYPES = ['减脂', '增肌', '塑形', '保持健康'] as const;
const GOAL_DESCS: Record<(typeof GOAL_TYPES)[number], string> = {
  减脂: '降低体脂，健康掉秤',
  增肌: '增加肌肉量，提高代谢',
  塑形: '改善线条，紧致身材',
  保持健康: '规律运动，维持状态',
};

type Props = {
  initial?: FitnessGoal | null;
  onSave: (goal: FitnessGoal) => void;
  saving?: boolean;
};

/** 健身目标选择：减脂/增肌/塑形/保持健康 + 目标体重/期限 */
export function GoalSelector({ initial, onSave, saving }: Props) {
  const colors = useTheme();

  const [type, setType] = useState<(typeof GOAL_TYPES)[number]>(initial?.type ?? '减脂');
  const [targetWeight, setTargetWeight] = useState(initial?.targetWeight ? String(initial.targetWeight) : '');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [weeklyFrequency, setWeeklyFrequency] = useState(initial?.weeklyFrequency ?? 3);

  function handleSave() {
    onSave({
      type,
      targetWeight: parseFloat(targetWeight) || undefined,
      deadline: deadline || undefined,
      weeklyFrequency,
    });
  }

  return (
    <View style={styles.content}>
      <Card>
        <ThemedText type="subtitle">你的健身目标</ThemedText>
        <View style={styles.grid}>
          {GOAL_TYPES.map((g) => (
            <Pressable
              key={g}
              onPress={() => setType(g)}
              style={[
                styles.typeCard,
                {
                  backgroundColor: type === g ? colors.primarySoft : colors.backgroundElement,
                  borderColor: type === g ? colors.primary : colors.border,
                },
              ]}>
              <Text style={{ color: type === g ? colors.primary : colors.text, fontWeight: '700' }}>
                {g}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                {GOAL_DESCS[g]}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <ThemedText type="subtitle">目标细节</ThemedText>
        <View style={styles.row}>
          <View style={styles.inputHalf}>
            <Input
              label="目标体重 (kg)"
              value={targetWeight}
              onChangeText={(t) => setTargetWeight(t.replace(/[^\d.]/g, ''))}
              keyboardType="numeric"
              placeholder="可选"
            />
          </View>
          <View style={styles.inputHalf}>
            <Input label="目标期限" value={deadline} onChangeText={setDeadline} placeholder="如：3个月" />
          </View>
        </View>
      </Card>

      <Card>
        <ThemedText type="subtitle">每周训练次数</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.frequencyHint}>
          用于生成与你时间安排匹配的训练计划
        </ThemedText>
        <View style={styles.frequencyRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((count) => {
            const selected = weeklyFrequency === count;
            return (
              <Pressable
                key={count}
                accessibilityRole="button"
                accessibilityLabel={`每周训练 ${count} 次`}
                accessibilityState={{ selected }}
                onPress={() => setWeeklyFrequency(count)}
                style={[
                  styles.frequencyChip,
                  {
                    backgroundColor: selected ? colors.primary : colors.backgroundElement,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}>
                <Text style={{ color: selected ? '#FFFFFF' : colors.text, fontWeight: '700' }}>
                  {count}次
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Button title={initial ? '保存修改' : '保存目标'} onPress={handleSave} loading={saving} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.three },
  typeCard: {
    width: '48%',
    flexGrow: 1,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  row: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  inputHalf: { width: '48%', flexGrow: 1 },
  frequencyHint: { marginTop: Spacing.one },
  frequencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.three },
  frequencyChip: {
    minWidth: 58,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.chip,
    borderWidth: 1,
  },
});

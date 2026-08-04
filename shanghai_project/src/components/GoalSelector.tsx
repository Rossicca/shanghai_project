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
const GOAL_DESCS: Record<string, string> = { 减脂: '降低体脂，健康掉秤', 增肌: '增加肌肉量，提高代谢', 塑形: '改善线条，紧致身材', 保持健康: '规律运动，维持状态' };
const STYLE_OPTIONS = [
  { key: 'gentle' as const, label: '温和', desc: '低强度，不追求极限，适合入门' },
  { key: 'moderate' as const, label: '标准', desc: '中等强度，循序渐进，适合大多数人' },
  { key: 'intense' as const, label: '高强度', desc: '全力以赴，冲击极限，适合有经验者' },
];

type Props = { initial?: FitnessGoal | null; onSave: (goal: FitnessGoal) => void; saving?: boolean };

export function GoalSelector({ initial, onSave, saving }: Props) {
  const colors = useTheme();
  const [types, setTypes] = useState<string[]>(initial?.types || (initial?.type ? [initial.type] : ['减脂']));
  const [targetWeight, setTargetWeight] = useState(initial?.targetWeight ? String(initial.targetWeight) : '');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [weeklyFrequency, setWeeklyFrequency] = useState(initial?.weeklyFrequency ?? 3);
  const [style, setStyle] = useState<'gentle' | 'moderate' | 'intense'>(initial?.trainingStyle ?? 'moderate');

  function handleSave() {
    onSave({
      types,
      type: types[0], // 兼容旧版
      targetWeight: parseFloat(targetWeight) || undefined,
      deadline: deadline || undefined,
      weeklyFrequency,
      trainingStyle: style,
    });
  }

  function toggleType(g: string) {
    if (types.includes(g) && types.length > 1) setTypes(types.filter((t) => t !== g));
    else if (!types.includes(g)) setTypes([...types, g]);
  }

  return (
    <View style={styles.content}>
      {/* 健身目标 - 多选 */}
      <Card>
        <ThemedText type="subtitle">健身目标（可多选）</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">已选：{types.join(' + ')}</ThemedText>
        <View style={styles.grid}>
          {GOAL_TYPES.map((g) => {
            const sel = types.includes(g);
            return (
              <Pressable key={g} onPress={() => toggleType(g)} style={[styles.typeCard, {
                backgroundColor: sel ? colors.primarySoft : colors.backgroundElement,
                borderColor: sel ? colors.primary : colors.border,
              }]}>
                <Text style={{ color: sel ? colors.primary : colors.text, fontWeight: '700' }}>{g}</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{GOAL_DESCS[g]}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* 训练偏好 */}
      <Card>
        <ThemedText type="subtitle">训练偏好</ThemedText>
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

      {/* 目标体重 */}
      <Card>
        <ThemedText type="subtitle">目标体重 (kg)</ThemedText>
        <View style={styles.row}>
          <View style={styles.inputHalf}>
            <Input label="目标体重" value={targetWeight} onChangeText={(t) => setTargetWeight(t.replace(/[^\d.]/g, ''))} keyboardType="numeric" placeholder="可选" />
          </View>
          <View style={styles.inputHalf}>
            <Input label="目标期限" value={deadline} onChangeText={setDeadline} placeholder="如：3个月" />
          </View>
        </View>
      </Card>

      {/* 每周频率 */}
      <Card>
        <ThemedText type="subtitle">每周训练次数</ThemedText>
        <View style={styles.freqRow}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const sel = weeklyFrequency === n;
            return (
              <Pressable key={n} onPress={() => setWeeklyFrequency(n)} style={[styles.freqChip, {
                backgroundColor: sel ? colors.primary : colors.backgroundElement,
                borderColor: sel ? colors.primary : colors.border,
              }]}>
                <Text style={{ color: sel ? '#fff' : colors.text, fontWeight: '700' }}>{n}次</Text>
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
  typeCard: { width: '48%', flexGrow: 1, padding: Spacing.three, borderRadius: Radius.card, borderWidth: 1 },
  styleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card, borderWidth: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three },
  inputHalf: { width: '48%', flexGrow: 1 },
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.three },
  freqChip: { minWidth: 52, alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.chip, borderWidth: 1 },
});

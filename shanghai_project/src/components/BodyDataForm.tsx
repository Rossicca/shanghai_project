import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BodyData } from '@/types/workout';

type Props = {
  initial?: BodyData | null;
  onSave: (data: BodyData) => void;
  saving?: boolean;
};

/** 身体数据录入：身高/体重/年龄/性别/体脂/腰围/臀围，实时算 BMI */
export function BodyDataForm({ initial, onSave, saving }: Props) {
  const colors = useTheme();

  const [gender, setGender] = useState<'男' | '女'>(initial?.gender ?? '男');
  const [age, setAge] = useState(initial?.age ? String(initial.age) : '22');
  const [height, setHeight] = useState(initial?.height ? String(initial.height) : '170');
  const [weight, setWeight] = useState(initial?.weight ? String(initial.weight) : '60');
  const [bodyFat, setBodyFat] = useState(initial?.bodyFat ? String(initial.bodyFat) : '');
  const [waist, setWaist] = useState(initial?.waist ? String(initial.waist) : '');
  const [hip, setHip] = useState(initial?.hip ? String(initial.hip) : '');

  const h = parseFloat(height);
  const w = parseFloat(weight);
  const bmi = h > 0 && w > 0 ? w / (h / 100) ** 2 : null;

  const bmiLabel = bmi ? (bmi < 18.5 ? '偏瘦' : bmi < 24 ? '正常' : bmi < 28 ? '偏胖' : '肥胖') : '';

  function handleSave() {
    const data: BodyData = {
      gender,
      age: parseInt(age) || 22,
      height: h || 170,
      weight: w || 60,
      bodyFat: parseFloat(bodyFat) || undefined,
      waist: parseFloat(waist) || undefined,
      hip: parseFloat(hip) || undefined,
    };
    onSave(data);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card>
        <ThemedText type="subtitle">性别</ThemedText>
        <View style={styles.genderRow}>
          {(['男', '女'] as const).map((g) => (
            <Pressable
              key={g}
              onPress={() => setGender(g)}
              style={[
                styles.genderChip,
                {
                  backgroundColor: gender === g ? colors.primary : colors.backgroundElement,
                  borderColor: gender === g ? colors.primary : colors.border,
                },
              ]}>
              <Text style={{ color: gender === g ? '#FFF' : colors.text, fontWeight: '700' }}>{g}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card style={styles.rowCard}>
        <View style={styles.inputHalf}>
          <Input label="年龄" value={age} onChangeText={(t) => setAge(t.replace(/[^\d]/g, ''))} keyboardType="number-pad" placeholder="岁" />
        </View>
        <View style={styles.inputHalf}>
          <Input label="身高 (cm)" value={height} onChangeText={(t) => setHeight(t.replace(/[^\d.]/g, ''))} keyboardType="numeric" placeholder="170" />
        </View>
        <View style={styles.inputHalf}>
          <Input label="体重 (kg)" value={weight} onChangeText={(t) => setWeight(t.replace(/[^\d.]/g, ''))} keyboardType="numeric" placeholder="60" />
        </View>
      </Card>

      {bmi ? (
        <View style={[styles.bmiBanner, { backgroundColor: colors.primarySoft }]}>
          <ThemedText themeColor="primary">
            你的 BMI ≈ {bmi.toFixed(1)}（{bmiLabel}）
          </ThemedText>
        </View>
      ) : null}

      <Card>
        <ThemedText type="subtitle">可选指标</ThemedText>
        <View style={styles.rowCard}>
          <View style={styles.inputHalf}>
            <Input label="体脂率 (%)" value={bodyFat} onChangeText={(t) => setBodyFat(t.replace(/[^\d.]/g, ''))} keyboardType="numeric" placeholder="可选" />
          </View>
          <View style={styles.inputHalf}>
            <Input label="腰围 (cm)" value={waist} onChangeText={(t) => setWaist(t.replace(/[^\d.]/g, ''))} keyboardType="numeric" placeholder="可选" />
          </View>
          <View style={styles.inputHalf}>
            <Input label="臀围 (cm)" value={hip} onChangeText={(t) => setHip(t.replace(/[^\d.]/g, ''))} keyboardType="numeric" placeholder="可选" />
          </View>
        </View>
      </Card>

      <Button title={initial ? '保存修改' : '保存身体数据'} onPress={handleSave} loading={saving} size="large" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three },
  genderRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  genderChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.chip,
    alignItems: 'center',
    borderWidth: 1,
  },
  rowCard: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  inputHalf: { width: '48%', flexGrow: 1 },
  bmiBanner: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    alignItems: 'center',
  },
});

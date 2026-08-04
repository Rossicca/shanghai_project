import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BodyData } from '@/types/workout';

type Props = { initial?: BodyData | null; onSave: (data: BodyData) => void; saving?: boolean };

export function BodyDataForm({ initial, onSave, saving }: Props) {
  const colors = useTheme();
  const [gender, setGender] = useState<'男' | '女'>(initial?.gender ?? '男');
  const [age, setAge] = useState(initial?.age ? String(initial.age) : '25');
  const [height, setHeight] = useState(initial?.height ? String(initial.height) : '170');
  const [weight, setWeight] = useState(initial?.weight ? String(initial.weight) : '65');
  const [bodyFat, setBodyFat] = useState(initial?.bodyFat ? String(initial.bodyFat) : '');
  const [waist, setWaist] = useState(initial?.waist ? String(initial.waist) : '');
  const [hip, setHip] = useState(initial?.hip ? String(initial.hip) : '');
  const [chest, setChest] = useState('');
  const [arm, setArm] = useState('');
  const [thigh, setThigh] = useState('');
  const [calf, setCalf] = useState('');
  const [shoulder, setShoulder] = useState('');
  const [neck, setNeck] = useState('');

  const h = parseFloat(height) || 170;
  const w = parseFloat(weight) || 65;
  const bmi = h > 0 && w > 0 ? w / (h / 100) ** 2 : null;
  const bmiLabel = bmi ? (bmi < 18.5 ? '偏瘦' : bmi < 24 ? '正常' : bmi < 28 ? '偏胖' : '肥胖') : '';

  function handleSave() {
    onSave({
      gender, age: parseInt(age) || 25, height: h, weight: w,
      bodyFat: parseFloat(bodyFat) || undefined,
      waist: parseFloat(waist) || undefined,
      hip: parseFloat(hip) || undefined,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* 基础信息 */}
      <Card>
        <ThemedText type="subtitle">基础信息</ThemedText>
        <View style={styles.row}><ThemedText type="smallBold">性别</ThemedText></View>
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
        <View style={styles.row3}>
          <Fld label="年龄" value={age} onChange={setAge} suffix="岁" numeric colors={colors} />
          <Fld label="身高" value={height} onChange={setHeight} suffix="cm" numeric colors={colors} />
          <Fld label="体重" value={weight} onChange={setWeight} suffix="kg" numeric colors={colors} />
        </View>
        {bmi && (
          <View style={[styles.bmi, { backgroundColor: colors.primarySoft }]}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>BMI {bmi.toFixed(1)} · {bmiLabel}</Text>
          </View>
        )}
        <ThemedText type="smallBold" style={{ marginTop: Spacing.two }}>体脂率（可选）</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
          <TextInput value={bodyFat} onChangeText={(t) => setBodyFat(t.replace(/[^\d.]/g, ''))} placeholder="自填或留空" placeholderTextColor={colors.textSecondary} keyboardType="numeric"
            style={[styles.input, { flex: 1, color: colors.text, backgroundColor: colors.backgroundElement }]} />
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>%</Text>
        </View>
      </Card>

      {/* 身材维度 */}
      <Card>
        <ThemedText type="subtitle">身材维度（可选）</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.two }}>填写越多，AI 越懂你的体型</ThemedText>
        <View style={styles.row3}>
          <Fld label="胸围" value={chest} onChange={setChest} suffix="cm" numeric optional colors={colors} />
          <Fld label="肩宽" value={shoulder} onChange={setShoulder} suffix="cm" numeric optional colors={colors} />
          <Fld label="臂围" value={arm} onChange={setArm} suffix="cm" numeric optional colors={colors} />
        </View>
        <View style={styles.row3}>
          <Fld label="腰围" value={waist} onChange={setWaist} suffix="cm" numeric optional colors={colors} />
          <Fld label="臀围" value={hip} onChange={setHip} suffix="cm" numeric optional colors={colors} />
          <Fld label="大腿围" value={thigh} onChange={setThigh} suffix="cm" numeric optional colors={colors} />
        </View>
        <View style={styles.row3}>
          <Fld label="小腿围" value={calf} onChange={setCalf} suffix="cm" numeric optional colors={colors} />
          <Fld label="颈围" value={neck} onChange={setNeck} suffix="cm" numeric optional colors={colors} />
          <View style={{ flex: 1 }} />
        </View>
      </Card>

      <Button title={initial ? '保存修改' : '保存身体数据'} onPress={handleSave} loading={saving} size="large" />
    </ScrollView>
  );
}

function Fld({ label, value, onChange, suffix, numeric, optional, colors }: {
  label: string; value: string; onChange: (v: string) => void; suffix: string; numeric?: boolean; optional?: boolean; colors: any;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>{label}{optional ? ' (选)' : ''}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.backgroundElement, borderRadius: Radius.button, paddingHorizontal: 10 }}>
        <TextInput value={value} onChangeText={(t) => onChange(numeric ? t.replace(/[^\d.]/g, '') : t)}
          keyboardType={numeric ? 'numeric' : 'default'} placeholder="--" placeholderTextColor={colors.textSecondary}
          style={{ flex: 1, color: colors.text, fontSize: 14, paddingVertical: 9 }} />
        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{suffix}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three },
  row: { marginTop: Spacing.two },
  chipRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  chip: { flex: 1, paddingVertical: 11, borderRadius: Radius.chip, alignItems: 'center', borderWidth: 1 },
  row3: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  input: { borderRadius: Radius.button, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  bmi: { borderRadius: 12, padding: Spacing.two, alignItems: 'center', marginTop: Spacing.two },
});

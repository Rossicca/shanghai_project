import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { BodyData } from '@/types/workout';

type Props = {
  initial?: BodyData | null;
  onSave: (data: BodyData) => void;
  saving?: boolean;
  error?: string;
};

type RequiredField = 'age' | 'height' | 'weight';
type ValidationErrors = Partial<Record<RequiredField, string>>;

const OPTIONAL_FIELDS = [
  { key: 'bodyFat', label: '体脂率', unit: '%', min: 2, max: 70 },
  { key: 'chest', label: '胸围', unit: 'cm', min: 30, max: 220 },
  { key: 'waist', label: '腰围', unit: 'cm', min: 30, max: 220 },
  { key: 'hip', label: '臀围', unit: 'cm', min: 30, max: 220 },
  { key: 'upperArm', label: '上臂围', unit: 'cm', min: 10, max: 100 },
  { key: 'thigh', label: '大腿围', unit: 'cm', min: 20, max: 140 },
  { key: 'calf', label: '小腿围', unit: 'cm', min: 10, max: 100 },
] as const;

/** 基础信息优先、可选围度折叠的身体数据录入。 */
export function BodyDataForm({ initial, onSave, saving, error }: Props) {
  const colors = useTheme();
  const hasAdvancedData = OPTIONAL_FIELDS.some(({ key }) => initial?.[key] != null);
  const [gender, setGender] = useState<'男' | '女'>(initial?.gender ?? '男');
  const [age, setAge] = useState(initial?.age ? String(initial.age) : '22');
  const [height, setHeight] = useState(initial?.height ? String(initial.height) : '170');
  const [weight, setWeight] = useState(initial?.weight ? String(initial.weight) : '60');
  const [advancedOpen, setAdvancedOpen] = useState(hasAdvancedData);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [optionalValues, setOptionalValues] = useState<Record<(typeof OPTIONAL_FIELDS)[number]['key'], string>>({
    bodyFat: initial?.bodyFat ? String(initial.bodyFat) : '',
    chest: initial?.chest ? String(initial.chest) : '',
    waist: initial?.waist ? String(initial.waist) : '',
    hip: initial?.hip ? String(initial.hip) : '',
    upperArm: initial?.upperArm ? String(initial.upperArm) : '',
    thigh: initial?.thigh ? String(initial.thigh) : '',
    calf: initial?.calf ? String(initial.calf) : '',
  });

  const h = Number(height);
  const w = Number(weight);
  const bmi = h >= 80 && w >= 20 ? w / (h / 100) ** 2 : null;
  const bmiLabel = bmi == null ? '待计算' : bmi < 18.5 ? '偏低' : bmi < 24 ? '正常范围' : bmi < 28 ? '偏高' : '较高';

  function updateRequired(field: RequiredField, value: string, setter: (next: string) => void) {
    setter(value.replace(/[^\d.]/g, ''));
    if (validationErrors[field]) setValidationErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSave() {
    const numericAge = Number(age);
    const nextErrors: ValidationErrors = {};
    if (!Number.isFinite(numericAge) || numericAge < 12 || numericAge > 100) nextErrors.age = '请输入 12–100 岁';
    if (!Number.isFinite(h) || h < 80 || h > 250) nextErrors.height = '请输入 80–250 cm';
    if (!Number.isFinite(w) || w < 20 || w > 350) nextErrors.weight = '请输入 20–350 kg';
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const optional = Object.fromEntries(
      OPTIONAL_FIELDS.map(({ key, min, max }) => {
        const parsed = Number(optionalValues[key]);
        return [key, Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined];
      })
    );
    onSave({ gender, age: numericAge, height: h, weight: w, ...optional });
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.intro}>
        <ThemedText style={styles.title}>让计划更懂你</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.introText}>
          基础数据用于计算 BMI、训练强度和饮食范围；围度可以稍后再补。
        </ThemedText>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.sectionHeading}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="person-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold">基础信息</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">生成计划前需要完成</ThemedText>
          </View>
          <Text style={[styles.required, { color: colors.primary }]}>必填</Text>
        </View>

        <View style={[styles.genderControl, { backgroundColor: colors.backgroundElement }]}>
          {(['男', '女'] as const).map((value) => {
            const selected = gender === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setGender(value)}
                style={[styles.genderOption, selected && { backgroundColor: colors.primary }]}>
                <Ionicons name={value === '男' ? 'male' : 'female'} size={17} color={selected ? '#fff' : colors.textSecondary} />
                <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '700' }}>{value}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.inputGrid}>
          <View style={styles.inputHalf}>
            <Input label="年龄" value={age} error={validationErrors.age} onChangeText={(value) => updateRequired('age', value, setAge)} keyboardType="number-pad" placeholder="22" rightElement={<Text style={[styles.unit, { color: colors.textSecondary }]}>岁</Text>} />
          </View>
          <View style={styles.inputHalf}>
            <Input label="身高" value={height} error={validationErrors.height} onChangeText={(value) => updateRequired('height', value, setHeight)} keyboardType="numeric" placeholder="170" rightElement={<Text style={[styles.unit, { color: colors.textSecondary }]}>cm</Text>} />
          </View>
          <View style={styles.inputFull}>
            <Input label="当前体重" value={weight} error={validationErrors.weight} onChangeText={(value) => updateRequired('weight', value, setWeight)} keyboardType="numeric" placeholder="60" rightElement={<Text style={[styles.unit, { color: colors.textSecondary }]}>kg</Text>} />
          </View>
        </View>
      </View>

      <View style={[styles.bmiPanel, { backgroundColor: colors.primarySoft }]}>
        <View style={{ flex: 1 }}>
          <ThemedText type="small" themeColor="textSecondary">当前 BMI</ThemedText>
          <View style={styles.bmiValueRow}>
            <Text style={[styles.bmiValue, { color: colors.text }]}>{bmi?.toFixed(1) ?? '--'}</Text>
            <View style={[styles.bmiTag, { backgroundColor: colors.card }]}>
              <Text style={[styles.bmiTagText, { color: colors.primary }]}>{bmiLabel}</Text>
            </View>
          </View>
        </View>
        <Ionicons name="analytics-outline" size={30} color={colors.primary} />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.bmiNote}>
        BMI 只用于一般筛查，不能替代体脂和专业健康评估。
      </ThemedText>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: advancedOpen }} onPress={() => setAdvancedOpen((value) => !value)} style={styles.advancedToggle}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.blueSoft }]}>
            <Ionicons name="scan-outline" size={20} color="#557DB3" />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold">体脂与身体围度</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">可选，用于追踪线条变化</ThemedText>
          </View>
          <Ionicons name={advancedOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </Pressable>

        {advancedOpen ? (
          <View style={styles.optionalGrid}>
            {OPTIONAL_FIELDS.map((field) => (
              <View key={field.key} style={styles.inputHalf}>
                <Input
                  label={field.label}
                  value={optionalValues[field.key]}
                  onChangeText={(value) => setOptionalValues((current) => ({ ...current, [field.key]: value.replace(/[^\d.]/g, '') }))}
                  keyboardType="numeric"
                  placeholder="可选"
                  rightElement={<Text style={[styles.unit, { color: colors.textSecondary }]}>{field.unit}</Text>}
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: colors.pinkSoft }]}>
          <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
          <ThemedText type="small" themeColor="danger" style={{ flex: 1 }}>{error}</ThemedText>
        </View>
      ) : null}

      <Button title={initial ? '保存身体数据' : '完成并保存'} onPress={handleSave} loading={saving} size="large" icon="checkmark-circle-outline" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  intro: { gap: Spacing.one, paddingHorizontal: Spacing.one },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '800' },
  introText: { lineHeight: 20, maxWidth: 420 },
  section: { borderWidth: 1, borderRadius: Radius.card, padding: Spacing.three, gap: Spacing.three },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  required: { fontSize: 11, fontWeight: '800' },
  genderControl: { flexDirection: 'row', borderRadius: Radius.button, padding: 4, gap: 4 },
  genderOption: { flex: 1, minHeight: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  inputHalf: { width: '48%', flexGrow: 1, minWidth: 132 },
  inputFull: { width: '100%' },
  unit: { fontSize: 12, paddingLeft: Spacing.two },
  bmiPanel: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, borderRadius: Radius.card },
  bmiValueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 2 },
  bmiValue: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  bmiTag: { paddingHorizontal: Spacing.two, paddingVertical: 4, borderRadius: Radius.chip },
  bmiTagText: { fontSize: 11, fontWeight: '800' },
  bmiNote: { marginTop: -Spacing.two, paddingHorizontal: Spacing.one, lineHeight: 18 },
  advancedToggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  optionalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  errorBanner: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', padding: Spacing.three, borderRadius: Radius.button },
});

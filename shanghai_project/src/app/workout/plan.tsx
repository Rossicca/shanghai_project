import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import type { WorkoutPlan, WorkoutPlanInput } from '@/types/workout';
import { calcBMI } from '@/utils/nutrition';

const DURATIONS = [20, 30, 45, 60];
const LOCATIONS: { value: WorkoutPlanInput['workoutLocation']; label: string }[] = [
  { value: 'home', label: '居家' }, { value: 'gym', label: '健身房' }, { value: 'outdoor', label: '户外' },
];
const LEVELS: { value: WorkoutPlanInput['fitnessLevel']; label: string }[] = [
  { value: 'beginner', label: '入门' }, { value: 'intermediate', label: '进阶' }, { value: 'advanced', label: '有经验' },
];
const GOALS: { value: WorkoutPlanInput['goalType']; label: '减脂' | '增肌' | '塑形' | '保持健康'; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'lose_fat', label: '减脂', description: '降低体脂，保留肌肉与精力', icon: 'trending-down-outline' },
  { value: 'gain_muscle', label: '增肌', description: '提升力量与肌肉量', icon: 'barbell-outline' },
  { value: 'shape', label: '塑形', description: '改善体态、线条与稳定性', icon: 'body-outline' },
  { value: 'maintain', label: '保持健康', description: '建立稳定、可长期坚持的节奏', icon: 'heart-outline' },
];
const TRAINING_MODES: { value: WorkoutPlanInput['trainingMode']; label: string }[] = [
  { value: 'gentle', label: '温和适应' }, { value: 'balanced', label: '均衡训练' }, { value: 'progressive', label: '渐进挑战' },
];
const EQUIPMENT_GROUPS = [
  { title: '基础与恢复', items: ['瑜伽垫', '瑜伽砖', '泡沫轴', '按摩球', '跳绳', '台阶板'] },
  { title: '弹力与悬挂', items: ['弹力带', '弹力圈', '拉力绳', 'TRX 悬挂带'] },
  { title: '自由重量', items: ['哑铃', '壶铃', '杠铃', '杠铃片', '沙袋', '负重背心', '腕部负重（负重手环）'] },
  { title: '有氧与固定器械', items: ['跑步机', '动感单车', '划船机', '椭圆机', '拉力器', '史密斯机', '综合训练器'] },
] as const;
const TRAINING_PREFERENCES = ['力量训练', '低冲击有氧', 'HIIT', '瑜伽', '普拉提', '跑步', '骑行', '灵活性与拉伸'];
const DIETARY_PREFERENCES = ['家常中餐', '高蛋白', '简单快手', '清淡少油', '均衡饮食', '蛋奶素', '鱼素友好', '植物性食物优先', '低乳糖', '无乳糖', '无麸质', '低盐', '少精制糖', '地中海风格'];
const KITCHEN_TOOLS = ['炒锅', '蒸锅', '电饭煲', '空气炸锅', '烤箱', '微波炉', '料理机', '无明火条件'];
const FLAVOR_PREFERENCES = ['清淡', '家常咸鲜', '微辣', '酸甜', '咖喱风味', '不吃辣'];
const STAPLE_PREFERENCES = ['米饭', '杂粮饭', '面食', '薯类', '燕麦', '玉米', '不固定'];
const MEALS_PER_DAY = [3, 4, 5];

function goalCode(value?: string): WorkoutPlanInput['goalType'] {
  return ({ '\u51cf\u8102': 'lose_fat', '\u589e\u808c': 'gain_muscle', '\u5851\u5f62': 'shape' } as const)[value || ''] || 'maintain';
}

function goalLabel(value: WorkoutPlanInput['goalType']) {
  return GOALS.find((item) => item.value === value)?.label ?? '保持健康';
}

export default function WorkoutPlanPage() {
  const colors = useTheme();
  const goal = useUserStore((state) => state.goal);
  const bodyData = useUserStore((state) => state.bodyData);
  const setGoal = useUserStore((state) => state.setGoal);
  const [weeklyFrequency, setWeeklyFrequency] = useState(() => goal?.weeklyFrequency ?? 3);
  const [duration, setDuration] = useState(30);
  const [selectedGoals, setSelectedGoals] = useState<WorkoutPlanInput['goalType'][]>(() => {
    const saved = goal?.types?.map(goalCode).filter((item, index, list) => list.indexOf(item) === index);
    return saved?.length ? saved : [goalCode(goal?.type)];
  });
  const [location, setLocation] = useState<WorkoutPlanInput['workoutLocation']>('home');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [level, setLevel] = useState<WorkoutPlanInput['fitnessLevel']>('beginner');
  const [trainingMode, setTrainingMode] = useState<WorkoutPlanInput['trainingMode']>('balanced');
  const [preferredTraining, setPreferredTraining] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(['家常中餐', '简单快手']);
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [mealPrepTime, setMealPrepTime] = useState(30);
  const [foodBudget, setFoodBudget] = useState<WorkoutPlanInput['foodBudget']>('balanced');
  const [cookingFrequency, setCookingFrequency] = useState<WorkoutPlanInput['cookingFrequency']>('sometimes');
  const [kitchenTools, setKitchenTools] = useState<string[]>(['炒锅', '电饭煲']);
  const [flavorPreferences, setFlavorPreferences] = useState<string[]>(['家常咸鲜']);
  const [staplePreferences, setStaplePreferences] = useState<string[]>(['米饭', '薯类']);
  const [allergies, setAllergies] = useState('');
  const [limitations, setLimitations] = useState('');
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const profileBmi = calcBMI(bodyData);

  useEffect(() => {
    if (!getToken()) return;
    fetchLatestWorkoutPlan().then(setPlan).catch(() => {});
  }, []);

  async function runGenerate() {
    if (!getToken()) {
      setError('生成个性化计划需要登录账号，以便读取并保存身体数据。');
      return;
    }
    if (!bodyData) {
      setError('请先填写身高、体重、年龄和性别，AI 才能进行真正的个性化分析。');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await setGoal({
        type: goalLabel(selectedGoals[0]),
        types: selectedGoals.map(goalLabel),
        targetWeight: goal?.targetWeight,
        deadline: goal?.deadline,
        weeklyFrequency,
      });
      const result = await generateWorkoutPlan({
        goalType: selectedGoals[0],
        goalTypes: selectedGoals,
        weeklyFrequency,
        sessionDurationMinutes: duration,
        workoutLocation: location,
        hasEquipment: equipment.length > 0,
        equipment,
        fitnessLevel: level,
        trainingMode,
        limitations: limitations.split(/[，,；;\n]/).map((item) => item.trim()).filter(Boolean),
        preferredTraining,
        dietaryPreferences,
        allergies: allergies.split(/[，,；;\n]/).map((item) => item.trim()).filter(Boolean),
        mealsPerDay,
        mealPrepTime,
        foodBudget,
        cookingFrequency,
        kitchenTools,
        flavorPreferences,
        staplePreferences,
      });
      setPlan(result);
      router.push({ pathname: '/workout/plan-result', params: { planId: result.planId } });
    } catch (requestError) {
      setError((requestError as Error).message || '训练计划生成失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  function toggleEquipment(item: string) {
    setEquipment((current) => current.includes(item)
      ? current.filter((value) => value !== item)
      : [...current, item]);
  }

  function toggleGoal(value: WorkoutPlanInput['goalType']) {
    setSelectedGoals((current) => {
      if (value === 'maintain') return ['maintain'];
      const withoutMaintain = current.filter((item) => item !== 'maintain');
      if (withoutMaintain.includes(value)) {
        return withoutMaintain.length > 1 ? withoutMaintain.filter((item) => item !== value) : withoutMaintain;
      }
      return [...withoutMaintain, value];
    });
  }

  function toggleListValue(value: string, setter: Dispatch<SetStateAction<string[]>>) {
    setter((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="返回" onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">生成专属计划</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">身体数据、目标、训练与饮食一次配好</ThemedText>
          </View>
          {plan ? (
            <Pressable onPress={() => router.push({ pathname: '/workout/plan-result', params: { planId: plan.planId } })}>
              <ThemedText type="smallBold" themeColor="primary">最近计划</ThemedText>
            </Pressable>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.form}>
            <ThemedText type="subtitle">训练条件</ThemedText>

            <View style={[styles.profilePanel, { backgroundColor: colors.backgroundElement }]}>
              <View style={styles.profileHeader}>
                <View style={styles.profileTitleRow}>
                  <Ionicons name="body-outline" size={20} color={colors.primary} />
                  <View>
                    <ThemedText type="smallBold">个性化依据</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">AI 会按这些数据调整强度和饮食</ThemedText>
                  </View>
                </View>
                <Pressable onPress={() => router.push('/profile/body')} hitSlop={8}>
                  <ThemedText type="smallBold" themeColor="primary">{bodyData ? '修改' : '去填写'}</ThemedText>
                </Pressable>
              </View>
              {bodyData ? (
                <View style={styles.profileMetrics}>
                  <PlanBasisMetric label="身高" value={`${bodyData.height} cm`} />
                  <PlanBasisMetric label="体重" value={`${bodyData.weight} kg`} />
                  <PlanBasisMetric label="BMI" value={profileBmi ? profileBmi.toFixed(1) : '--'} />
                  <PlanBasisMetric label="体脂" value={bodyData.bodyFat ? `${bodyData.bodyFat}%` : '未填写'} />
                  <PlanBasisMetric label="年龄" value={`${bodyData.age} 岁`} />
                  <PlanBasisMetric label="目标" value={selectedGoals.map(goalLabel).join(' + ')} />
                </View>
              ) : (
                <View style={styles.profileEmpty}>
                  <Ionicons name="add-circle-outline" size={22} color={colors.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
                    填写身高、体重、年龄和体脂后，计划会更贴合你的身体情况。
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.optionGroup}>
              <View style={styles.optionHeading}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">想达到的效果（可多选）</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">第一个选择作为主要目标，AI 会协调多个方向</ThemedText>
                </View>
                <ThemedText type="smallBold" themeColor="primary">已选 {selectedGoals.length}</ThemedText>
              </View>
              <View style={styles.goalGrid}>
                {GOALS.map((item) => {
                  const selected = selectedGoals.includes(item.value);
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      key={item.value}
                      onPress={() => toggleGoal(item.value)}
                      style={[styles.goalOption, { backgroundColor: selected ? colors.primarySoft : colors.backgroundElement, borderColor: selected ? colors.primary : 'transparent' }]}>
                      <View style={[styles.goalIcon, { backgroundColor: selected ? colors.primary : colors.card }]}>
                        <Ionicons name={item.icon} size={19} color={selected ? '#fff' : colors.primary} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <ThemedText type="smallBold">{item.label}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">{item.description}</ThemedText>
                      </View>
                      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={selected ? colors.primary : colors.textSecondary} />
                    </Pressable>
                  );
                })}
              </View>
            </View>

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
            <OptionRow label="训练模式" options={TRAINING_MODES} value={trainingMode} onChange={setTrainingMode} />
            <OptionRow label="训练地点" options={LOCATIONS} value={location} onChange={setLocation} />
            <OptionRow label="训练基础" options={LEVELS} value={level} onChange={setLevel} />
            <View style={styles.optionGroup}>
              <View style={styles.optionHeading}>
                <ThemedText type="smallBold">现有器械（可多选）</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">{equipment.length ? `已选 ${equipment.length} 项` : '无器械训练'}</ThemedText>
              </View>
              {EQUIPMENT_GROUPS.map((group) => (
                <View key={group.title} style={styles.equipmentGroup}>
                  <ThemedText type="small" themeColor="textSecondary">{group.title}</ThemedText>
                  <View style={styles.options}>
                    {group.items.map((item) => {
                      const selected = equipment.includes(item);
                      return (
                        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} key={item} onPress={() => toggleEquipment(item)} style={[styles.option, { backgroundColor: selected ? colors.primary : colors.backgroundElement }]}>
                          <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '600' }}>{item}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>

            <MultiChoice
              label="偏好的训练方式（可多选）"
              hint="AI 会优先采用，但不会为了偏好牺牲安全和目标"
              options={TRAINING_PREFERENCES}
              values={preferredTraining}
              onToggle={(item) => toggleListValue(item, setPreferredTraining)}
            />

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

            <View style={styles.sectionDivider} />
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionTitleIcon, { backgroundColor: colors.yellowSoft }]}>
                <Ionicons name="restaurant-outline" size={20} color="#B07A26" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle">饮食计划条件</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">和训练计划一起生成，菜谱会继续关联现有食材</ThemedText>
              </View>
            </View>
            <MultiChoice
              label="饮食偏好（可多选）"
              options={DIETARY_PREFERENCES}
              values={dietaryPreferences}
              onToggle={(item) => toggleListValue(item, setDietaryPreferences)}
            />
            <OptionRow label="每日进餐次数" options={MEALS_PER_DAY.map((value) => ({ value, label: `${value} 餐` }))} value={mealsPerDay} onChange={setMealsPerDay} />
            <OptionRow label="单餐可用准备时间" options={[15, 30, 45, 60].map((value) => ({ value, label: `${value} 分钟` }))} value={mealPrepTime} onChange={setMealPrepTime} />
            <OptionRow
              label="日常食材预算"
              options={[{ value: 'economy' as const, label: '经济实用' }, { value: 'balanced' as const, label: '均衡适中' }, { value: 'flexible' as const, label: '食材灵活' }]}
              value={foodBudget}
              onChange={setFoodBudget}
            />
            <OptionRow
              label="下厨频率"
              options={[{ value: 'rare' as const, label: '很少下厨' }, { value: 'sometimes' as const, label: '每周几次' }, { value: 'often' as const, label: '经常备餐' }]}
              value={cookingFrequency}
              onChange={setCookingFrequency}
            />
            <MultiChoice label="可用厨具（可多选）" options={KITCHEN_TOOLS} values={kitchenTools} onToggle={(item) => toggleListValue(item, setKitchenTools)} />
            <MultiChoice label="口味偏好（可多选）" options={FLAVOR_PREFERENCES} values={flavorPreferences} onToggle={(item) => toggleListValue(item, setFlavorPreferences)} />
            <MultiChoice label="常吃主食（可多选）" options={STAPLE_PREFERENCES} values={staplePreferences} onToggle={(item) => toggleListValue(item, setStaplePreferences)} />
            <View style={styles.optionGroup}>
              <ThemedText type="smallBold">过敏或明确不吃的食物（可选）</ThemedText>
              <TextInput
                value={allergies}
                onChangeText={setAllergies}
                placeholder="例如：花生、虾、乳糖；用逗号分隔"
                placeholderTextColor={colors.textSecondary}
                maxLength={160}
                style={[styles.singleInput, { color: colors.text, backgroundColor: colors.backgroundElement }]}
              />
            </View>
            <View style={[styles.generateNote, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              <ThemedText type="small" style={{ flex: 1 }}>AI 会先分析你的数据，再生成热身、主训练、拉伸、每日营养目标和 7 天饮食安排。通常需要 10–30 秒。</ThemedText>
            </View>
            <Button title="生成训练 + 饮食计划" icon="sparkles-outline" loading={loading} onPress={runGenerate} size="large" />
            {error ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                <ThemedText type="small" themeColor="danger" style={{ flex: 1 }}>{error}</ThemedText>
                {!getToken() ? <Pressable onPress={() => router.push('/auth/login')}><ThemedText type="smallBold" themeColor="primary">去登录</ThemedText></Pressable> : !bodyData ? <Pressable onPress={() => router.push('/profile/body')}><ThemedText type="smallBold" themeColor="primary">填写数据</ThemedText></Pressable> : null}
              </View>
            ) : null}
          </Card>

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

function MultiChoice({ label, hint, options, values, onToggle }: {
  label: string;
  hint?: string;
  options: readonly string[];
  values: string[];
  onToggle: (value: string) => void;
}) {
  const colors = useTheme();
  return (
    <View style={styles.optionGroup}>
      <View>
        <ThemedText type="smallBold">{label}</ThemedText>
        {hint ? <ThemedText type="small" themeColor="textSecondary">{hint}</ThemedText> : null}
      </View>
      <View style={styles.options}>
        {options.map((option) => {
          const selected = values.includes(option);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={option}
              onPress={() => onToggle(option)}
              style={[styles.option, { backgroundColor: selected ? colors.primary : colors.backgroundElement }]}>
              {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
              <Text style={{ color: selected ? '#fff' : colors.text, fontWeight: '600' }}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function PlanBasisMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileMetric}>
      <ThemedText type="smallBold" numberOfLines={1}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.four },
  form: { gap: Spacing.three }, stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  profilePanel: { gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card },
  profileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  profileTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 },
  profileMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  profileMetric: { width: '31%', minWidth: 82, gap: 2 },
  profileEmpty: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  goalGrid: { gap: Spacing.two },
  goalOption: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three, borderRadius: 16, borderWidth: 1 },
  goalIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  generateNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, padding: Spacing.three, borderRadius: Radius.button },
  stepButton: { width: 38, height: 38, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
  optionGroup: { gap: Spacing.two }, optionHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  option: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.three, paddingVertical: 10, borderRadius: Radius.chip },
  equipmentGroup: { gap: Spacing.one, marginTop: Spacing.one },
  input: { minHeight: 76, borderRadius: Radius.button, padding: Spacing.three, fontSize: 16, textAlignVertical: 'top' },
  singleInput: { minHeight: 48, borderRadius: Radius.button, paddingHorizontal: Spacing.three, fontSize: 16 },
  sectionDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(128,128,128,0.28)', marginVertical: Spacing.one },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  sectionTitleIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, result: { gap: Spacing.three },
  summaryRow: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  summaryIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mealCard: { gap: Spacing.two }, mealHeader: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  mealType: { minWidth: 48, paddingHorizontal: Spacing.two, paddingVertical: 6, borderRadius: Radius.chip, alignItems: 'center' },
  dayCard: { gap: Spacing.two }, dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  reminders: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16 }, reminderRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
});

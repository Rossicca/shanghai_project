import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchSavedWorkoutPlans } from '@/services/workout';
import type { WorkoutPlan } from '@/types/workout';

export default function SavedWorkoutPlansPage() {
  const colors = useTheme();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedWorkoutPlans().then(setPlans).catch(() => setPlans([])).finally(() => setLoading(false));
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="返回" onPress={() => router.back()} hitSlop={10}><Ionicons name="arrow-back" size={24} color={colors.text} /></Pressable>
          <View style={{ flex: 1, minWidth: 0 }}><ThemedText style={styles.pageTitle} numberOfLines={1}>我的训练计划</ThemedText><ThemedText type="small" themeColor="textSecondary">保存和收藏的个性化方案</ThemedText></View>
        </View>
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
        ) : plans.length ? (
          <ScrollView contentContainerStyle={styles.content}>
            {plans.map((plan) => (
              <Pressable key={plan.planId} onPress={() => router.push({ pathname: '/workout/plan-result', params: { planId: plan.planId } })}>
                <Card style={styles.planCard}>
                  <View style={[styles.planIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="calendar" size={22} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <ThemedText type="smallBold">每周 {plan.planConditions?.weeklyFrequency ?? plan.weeklySchedule.length} 练</ThemedText>
                      {plan.isFavorite ? <Ionicons name="heart" size={16} color="#E85D75" /> : null}
                    </View>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>{plan.summary}</ThemedText>
                    <ThemedText type="small" themeColor="primary">训练 + 恢复 + {plan.mealSuggestions?.length ?? 0} 份餐食建议</ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Card>
              </Pressable>
            ))}
            <Button title="生成新计划" icon="add" onPress={() => router.push('/workout/plan')} />
          </ScrollView>
        ) : (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Ionicons name="calendar-outline" size={36} color={colors.primary} /></View>
            <ThemedText type="subtitle">还没有保存的计划</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>生成计划后，可以在详情页保存或收藏，之后随时回来查看。</ThemedText>
            <Button title="生成第一个计划" onPress={() => router.push('/workout/plan')} />
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, safeArea: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three }, pageTitle: { fontSize: 24, lineHeight: 30, fontWeight: '900' },
  content: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  planCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three }, planIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  emptyIcon: { width: 72, height: 72, borderRadius: Radius.circle, alignItems: 'center', justifyContent: 'center' },
});

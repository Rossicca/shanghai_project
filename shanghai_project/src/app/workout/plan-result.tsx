import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlanStore } from '@/store/planStore';

const WEEKDAY = ['一', '二', '三', '四', '五', '六', '日'];

export default function PlanResultPage() {
  const colors = useTheme();
  const plan = usePlanStore((s) => s.plan);

  const todayInfo = useMemo(() => {
    if (!plan) return null;
    const dow = new Date().getDay();
    const dayIndex = dow === 0 ? 6 : dow - 1;
    const today = plan.weeklySchedule.find((d) => d.day - 1 === dayIndex);
    return today ? { isTrainingDay: true as const, day: today } : { isTrainingDay: false as const };
  }, [plan]);

  function openBilibili(keyword: string) {
    Linking.openURL(`https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`).catch(() => {});
  }

  if (!plan) {
    return (
      <ThemedView style={styles.outer}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.empty}>
            <Ionicons name="fitness-outline" size={48} color={colors.backgroundSelected} />
            <ThemedText type="subtitle">还没有计划</ThemedText>
            <Pressable onPress={() => router.replace('/workout/plan')}>
              <ThemedText type="smallBold" themeColor="primary">去生成训练计划 ›</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.outer}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">我的训练计划</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{plan.summary}</ThemedText>
          </View>
          <Pressable onPress={() => router.push('/workout/plan')}>
            <ThemedText type="smallBold" themeColor="primary">调整</ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* 今日状态 */}
          {todayInfo && (
            <View style={[styles.today, {
              backgroundColor: todayInfo.isTrainingDay ? colors.primarySoft : colors.yellowSoft,
            }]}>
              <Ionicons name={todayInfo.isTrainingDay ? 'flame' : 'cafe'} size={22}
                color={todayInfo.isTrainingDay ? colors.primary : '#B07A26'} />
              <View style={{ flex: 1 }}>
                <ThemedText type="subtitle">
                  {todayInfo.isTrainingDay
                    ? `今天训练日 · ${todayInfo.day!.title}`
                    : '今天休息 · 肌肉在恢复中生长'}
                </ThemedText>
                {todayInfo.isTrainingDay && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {todayInfo.day!.durationMinutes}分钟 · {todayInfo.day!.exercises.length}个动作
                  </ThemedText>
                )}
              </View>
            </View>
          )}

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
                <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
                  <Text style={{ color: colors.primary, fontWeight: '700' }}>{day.durationMinutes}min</Text>
                </View>
              </View>

              {day.warmup?.length ? (
                <Phase color="#B07A26" bg={colors.yellowSoft} icon="sunny" title="热身" items={day.warmup.map((w: any) => ({ name: w.name, sub: `${w.duration} · ${w.notes}` }))} />
              ) : null}

              <Phase color={colors.primary} bg={colors.primarySoft} icon="barbell" title="训练"
                items={day.exercises.map((ex: any) => ({
                  name: ex.name,
                  sub: `${ex.sets}组×${ex.reps} · 休息${ex.restSeconds}s · ${ex.category || ''}`,
                  extra: ex.notes,
                  action: ex.searchKeyword ? (
                    <Pressable onPress={() => openBilibili(ex.searchKeyword!)} style={[styles.biliBtn, { backgroundColor: '#FB7299' }]}>
                      <Ionicons name="play-circle" size={15} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>跟练</Text>
                    </Pressable>
                  ) : undefined,
                }))}
              />

              {day.stretching?.length ? (
                <Phase color="#3E6FA8" bg="#E7F0FA" icon="leaf" title="拉伸" items={day.stretching.map((s: any) => ({ name: s.name, sub: `${s.duration} · ${s.notes}` }))} />
              ) : null}
            </Card>
          ))}

          {plan.reminders?.length ? (
            <View style={[styles.reminders, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold">训练提醒</ThemedText>
              {plan.reminders.map((item: string, i: number) => (
                <View key={i} style={styles.remRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                  <ThemedText type="small" style={{ flex: 1 }}>{item}</ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Phase({ color, bg, icon, title, items }: {
  color: string; bg: string; icon: string; title: string;
  items: { name: string; sub: string; extra?: string; action?: React.ReactNode }[];
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: bg, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' }}>
        <Ionicons name={icon as any} size={12} color={color} />
        <Text style={{ color, fontWeight: '700', fontSize: 11 }}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#16382E', fontWeight: '600', fontSize: 13 }}>{item.name}</Text>
            <Text style={{ color: '#5A7A6F', fontSize: 11 }}>{item.sub}</Text>
            {item.extra ? <Text style={{ color: '#5A7A6F', fontSize: 11 }}>{item.extra}</Text> : null}
          </View>
          {item.action}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  today: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.card },
  dayCard: { gap: Spacing.two },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  biliBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14 },
  reminders: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16 },
  remRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
});

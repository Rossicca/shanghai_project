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
    const dayIdx = dow === 0 ? 6 : dow - 1;
    const today = plan.weeklySchedule.find((d) => d.day - 1 === dayIdx);
    return today ? { training: true, day: today } : { training: false };
  }, [plan]);

  function openVideo(keyword: string) {
    Linking.openURL(`https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`).catch(() => {});
  }

  if (!plan) {
    return (
      <ThemedView style={S.outer}>
        <SafeAreaView style={S.safe}><View style={S.empty}>
          <Ionicons name="fitness-outline" size={48} color={colors.backgroundSelected} />
          <ThemedText type="subtitle">还没有计划</ThemedText>
          <Pressable onPress={() => router.replace('/workout/plan')}>
            <ThemedText type="smallBold" themeColor="primary">去生成训练计划 ›</ThemedText>
          </Pressable>
        </View></SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={S.outer}>
      <SafeAreaView style={S.safe} edges={['top']}>
        <View style={S.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">训练计划</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">周{WEEKDAY[0]}–周{WEEKDAY[plan.weeklySchedule.length - 1]} · {plan.summary}</ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={S.scroll}>
          {/* ====== 今日计划 ====== */}
          {todayInfo ? (
            <Card style={[S.todayBlock, { borderColor: todayInfo.training ? colors.primary : '#B07A26', borderWidth: 2 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two }}>
                <Ionicons name={todayInfo.training ? 'flame' : 'cafe'} size={22}
                  color={todayInfo.training ? colors.primary : '#B07A26'} />
                <ThemedText type="subtitle">
                  {todayInfo.training ? `今日训练 · ${todayInfo.day!.title}` : '今日休息'}
                </ThemedText>
              </View>
              {todayInfo.training && (
                <View style={{ gap: Spacing.two }}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {todayInfo.day!.durationMinutes}分钟 · {todayInfo.day!.exercises.length}个动作
                    {todayInfo.day!.focusDescription ? ` · ${todayInfo.day!.focusDescription}` : ''}
                  </ThemedText>
                  {todayInfo.day!.exercises.map((ex: any, j: number) => (
                    <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 4 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{ex.name}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{ex.sets}组×{ex.reps} · 休息{ex.restSeconds}s</Text>
                      </View>
                      {ex.searchKeyword ? (
                        <Pressable onPress={() => openVideo(ex.searchKeyword)} style={[S.vidBtn, { backgroundColor: '#FB7299' }]}>
                          <Ionicons name="play-circle" size={15} color="#fff" />
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>跟练</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}
            </Card>
          ) : null}

          {/* ====== 一周计划 ====== */}
          <ThemedText type="subtitle" style={{ marginTop: Spacing.one }}>一周训练计划</ThemedText>
          {plan.weeklySchedule.map((day) => (
            <Card key={day.day} style={S.dayCard}>
              <View style={S.dayHead}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">第{day.day}天 · 周{WEEKDAY[(day.day - 1) % 7]}</ThemedText>
                  <ThemedText type="subtitle">{day.title}</ThemedText>
                  {day.focusDescription ? <ThemedText type="small" themeColor="textSecondary">{day.focusDescription}</ThemedText> : null}
                </View>
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>{day.durationMinutes}min</Text>
              </View>
              {day.warmup?.length ? <PhaseTag icon="sunny" color="#B07A26" label="热身" count={day.warmup.length} /> : null}
              <View style={{ gap: 4 }}>
                {day.exercises.map((ex: any, j: number) => (
                  <View key={j} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{ex.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{ex.sets}组×{ex.reps} · 休息{ex.restSeconds}s · {ex.category || ''}</Text>
                    </View>
                    {ex.searchKeyword ? (
                      <Pressable onPress={() => openVideo(ex.searchKeyword)} style={[S.vidBtn, { backgroundColor: '#FB7299' }]}>
                        <Ionicons name="play-circle" size={14} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>跟练</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
              {day.stretching?.length ? <PhaseTag icon="leaf" color="#3E6FA8" label="拉伸" count={day.stretching.length} /> : null}
            </Card>
          ))}
          {plan.reminders?.length ? (
            <View style={[S.remBlock, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="smallBold">训练提醒</ThemedText>
              {plan.reminders.map((item: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={colors.primary} />
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

function PhaseTag({ icon, color, label, count }: { icon: string; color: string; label: string; count: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: `${color}15` }}>
      <Ionicons name={icon as any} size={11} color={color} />
      <Text style={{ color, fontWeight: '600', fontSize: 11 }}>{label} · {count}项</Text>
    </View>
  );
}

const S = StyleSheet.create({
  outer: { flex: 1 }, safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  scroll: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.six },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  todayBlock: { borderRadius: Radius.card, borderWidth: 2, padding: Spacing.three },
  dayCard: { gap: Spacing.two },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.two },
  vidBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  remBlock: { gap: Spacing.two, padding: Spacing.three, borderRadius: 16 },
});

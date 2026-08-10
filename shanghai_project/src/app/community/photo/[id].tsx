import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCommunityStore } from '@/store/communityStore';
import { alertDialog, confirmDialog } from '@/utils/dialog';
import { formatDate } from '@/utils/date';

/** 时光记忆详情：大图 + 完整日期 + 体重/体脂 + 完整备注 + 删除 */
export default function MemoryPhotoDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const { photos, load, loaded, removePhoto } = useCommunityStore();
  const entry = photos.find((p) => p.id === id);
  // 加载完成且记忆不存在才算「不存在」
  const notFound = loaded && !!id && !photos.some((p) => p.id === id);

  useFocusEffect(
    useCallback(() => {
      if (!loaded) load().catch(() => undefined);
    }, [load, loaded])
  );

  if (!entry && !notFound) {
    return <ThemedView style={styles.center} />;
  }
  if (notFound || !entry) {
    return (
      <ThemedView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
        <ThemedText type="subtitle" style={styles.centerText}>这条记忆不存在或已删除</ThemedText>
      </ThemedView>
    );
  }

  const handleDelete = () => {
    confirmDialog({
      title: '删除这条记忆',
      message: '删除后不可恢复，确定删除吗？',
      confirmText: '删除',
      cancelText: '取消',
      destructive: true,
      onConfirm: () => {
        removePhoto(entry.id)
          .then(() => router.back())
          .catch((error) => alertDialog('删除失败', (error as Error)?.message || '请稍后再试'));
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 大图 */}
        {entry.uri ? (
          <Image
            source={{ uri: entry.uri }}
            style={[styles.hero, { backgroundColor: colors.backgroundElement }]}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.hero, { backgroundColor: entry.color }]}>
            <Ionicons name="image-outline" size={56} color="#5A7A6F" />
          </View>
        )}

        {/* 完整日期 + 坚持天数 */}
        <View style={styles.headRow}>
          <Text style={[styles.date, { color: colors.text }]}>{formatDate(entry.date)}</Text>
          {entry.day != null ? (
            <View style={[styles.dayBadge, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.dayText, { color: colors.success }]}>坚持第 {entry.day} 天</Text>
            </View>
          ) : null}
        </View>

        {/* 体重 / 体脂 */}
        {entry.weight != null || entry.bodyFat != null ? (
          <View style={styles.metrics}>
            {entry.weight != null ? (
              <View style={[styles.metric, { backgroundColor: colors.backgroundElement }]}>
                <Ionicons name="scale-outline" size={18} color={colors.success} />
                <Text style={[styles.metricNum, { color: colors.text }]}>{entry.weight}kg</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>体重</Text>
              </View>
            ) : null}
            {entry.bodyFat != null ? (
              <View style={[styles.metric, { backgroundColor: colors.backgroundElement }]}>
                <Ionicons name="water-outline" size={18} color={colors.primary} />
                <Text style={[styles.metricNum, { color: colors.text }]}>{entry.bodyFat}%</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>体脂</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* 完整备注 */}
        {entry.note ? (
          <Card style={styles.noteCard}>
            <ThemedText type="smallBold">这一刻的备注</ThemedText>
            <Text style={[styles.noteText, { color: colors.text }]}>{entry.note}</Text>
          </Card>
        ) : null}

        {/* 删除（确认后返回列表） */}
        <Pressable onPress={handleDelete}>
          <Card style={[styles.deleteRow, { borderColor: colors.danger }]}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
            <ThemedText type="smallBold" themeColor="danger">删除这条记忆</ThemedText>
          </Card>
        </Pressable>

        <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
          时光阁用于记录自身锻炼足迹 · 演示数据
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  centerText: { marginTop: Spacing.one },
  hero: {
    height: 260,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  date: { fontSize: 20, fontWeight: '800' },
  dayBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.chip },
  dayText: { fontSize: 12, fontWeight: '700' },
  metrics: { flexDirection: 'row', gap: Spacing.two },
  metric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.card,
  },
  metricNum: { fontSize: 18, fontWeight: '800' },
  metricLabel: { fontSize: 12, marginLeft: 'auto' },
  noteCard: { gap: Spacing.two },
  noteText: { fontSize: 14, lineHeight: 22 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  tip: { textAlign: 'center' },
});

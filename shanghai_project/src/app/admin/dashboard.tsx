import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchAdminStats, type AdminStats } from '@/services/admin';

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  const colors = useTheme();
  return (
    <Card style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={20} color={color} />
        <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
      </View>
      <ThemedText type="title" style={{ color, fontSize: 28 }}>{value}</ThemedText>
    </Card>
  );
}

export default function AdminDashboard() {
  const colors = useTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText>加载中...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
        <ThemedText themeColor="danger">{error}</ThemedText>
        <Pressable onPress={loadStats}>
          <ThemedText type="smallBold" themeColor="primary">重试</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* 数据范围提示：后端是本机 SQLite，看板不含其他人电脑上的账号 */}
          <View style={[styles.notice, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
              仅统计本机后端（localhost:8787）的数据。每台电脑各有一份独立数据库，
              其他人在自己电脑上注册的账号不会出现在这里。
            </ThemedText>
          </View>

          {/* 用户数据 */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>用户数据</ThemedText>
          <View style={styles.statRow}>
            <StatCard icon="people" label="总用户" value={stats?.users.total ?? 0} color={colors.primary} />
            <StatCard icon="person-add" label="今日注册" value={stats?.users.todayRegistrations ?? 0} color={colors.success} />
          </View>
          <View style={styles.statRow}>
            <StatCard icon="shield-checkmark" label="管理员" value={stats?.users.admin ?? 0} color={colors.warning} />
            <StatCard icon="male-female" label="性别分布" value={`男${stats?.users.genderDistribution.male ?? 0}`} color={colors.textSecondary} />
          </View>

          {/* 内容数据 */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>内容数据</ThemedText>
          <View style={styles.statRow}>
            <StatCard icon="videocam" label="运动视频" value={stats?.workoutVideos.total ?? 0} color="#FF6B35" />
            <StatCard icon="restaurant" label="生成菜谱" value={stats?.recipes.total ?? 0} color="#2ECC71" />
          </View>
          <View style={styles.statRow}>
            <StatCard icon="camera" label="识别记录" value={stats?.recognition.total ?? 0} color="#9B59B6" />
            <StatCard icon="bookmark" label="收藏数" value={stats?.savedWorkouts.total ?? 0} color="#E74C3C" />
          </View>

          {/* 身体数据 */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>健康数据</ThemedText>
          <View style={styles.statRow}>
            <StatCard icon="fitness" label="身体记录" value={stats?.bodyData.total ?? 0} color="#1ABC9C" />
            <StatCard icon="flag" label="健身目标" value={stats?.goals.total ?? 0} color="#F39C12" />
          </View>

          {/* 快捷入口 */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>管理</ThemedText>
          <Pressable
            style={[styles.menuItem, { backgroundColor: colors.primarySoft }]}
            onPress={() => router.push('/admin/users')}>
            <View style={[styles.menuIcon, { backgroundColor: colors.primary }]}>
              <Ionicons name="people" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">用户管理</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">查看/管理所有用户账号</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.three, gap: Spacing.two, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  notice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one,
    padding: Spacing.two, borderRadius: Radius.button,
  },
  sectionTitle: { marginTop: Spacing.one, marginBottom: Spacing.one },
  statRow: { flexDirection: 'row', gap: Spacing.two },
  statCard: { flex: 1, padding: Spacing.three, gap: Spacing.one },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    padding: Spacing.three, borderRadius: 16,
  },
  menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
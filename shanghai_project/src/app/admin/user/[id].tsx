import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteUser, fetchAdminUserDetail, updateUserRole, type AdminUserDetail as AdminUserDetailData } from '@/services/admin';
import { alertDialog, confirmDialog } from '@/utils/dialog';

export default function AdminUserDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const [detail, setDetail] = useState<AdminUserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminUserDetail(id!);
      setDetail(data);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadDetail(); }, 0);
    return () => clearTimeout(timer);
  }, [loadDetail]);

  function handleToggleRole() {
    if (!detail) return;
    const newRole = detail.user.role === 'admin' ? 'user' : 'admin';
    confirmDialog({
      title: '修改角色',
      message: `将角色改为「${newRole === 'admin' ? '管理员' : '普通用户'}」？`,
      confirmText: '确认',
      onConfirm: async () => {
        try {
          await updateUserRole(detail.user.id, newRole);
          setDetail({ ...detail, user: { ...detail.user, role: newRole } });
        } catch (e: any) {
          alertDialog('错误', e.message);
        }
      },
    });
  }

  function handleDelete() {
    if (!detail) return;
    confirmDialog({
      title: '删除用户',
      message: `确定删除 ${detail.user.email} 的所有数据？`,
      confirmText: '删除',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteUser(detail.user.id);
          alertDialog('已删除', '用户已删除', () => history.back());
        } catch (e: any) {
          alertDialog('错误', e.message);
        }
      },
    });
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  if (error || !detail) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText themeColor="danger">{error || '用户不存在'}</ThemedText>
        <Pressable onPress={loadDetail}><ThemedText type="smallBold" themeColor="primary">重试</ThemedText></Pressable>
      </ThemedView>
    );
  }

  const { user } = detail;

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container}>
          {/* 基本信息 */}
          <Card style={{ gap: Spacing.two }}>
            <View style={styles.infoRow}>
              <ThemedText type="smallBold" style={{ width: 70 }}>邮箱</ThemedText>
              <ThemedText>{user.email}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText type="smallBold" style={{ width: 70 }}>昵称</ThemedText>
              <ThemedText>{user.nickname}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText type="smallBold" style={{ width: 70 }}>角色</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ThemedText>{user.role === 'admin' ? '管理员' : '普通用户'}</ThemedText>
                <Pressable onPress={handleToggleRole}>
                  <ThemedText type="small" themeColor="primary">切换</ThemedText>
                </Pressable>
              </View>
            </View>
            <View style={styles.infoRow}>
              <ThemedText type="smallBold" style={{ width: 70 }}>性别</ThemedText>
              <ThemedText>{user.gender === 'male' || user.gender === '男' ? '男' : '女'}</ThemedText>
            </View>
            <View style={styles.infoRow}>
              <ThemedText type="smallBold" style={{ width: 70 }}>注册</ThemedText>
              <ThemedText>{user.createdAt?.slice(0, 10)}</ThemedText>
            </View>
          </Card>

          {/* 身体数据 */}
          {detail.bodyData.length > 0 && (
            <>
              <ThemedText type="smallBold" style={styles.sectionTitle}>身体数据 ({detail.bodyData.length} 条)</ThemedText>
              {detail.bodyData.slice(0, 5).map((bd: any) => (
                <Card key={bd.id} style={{ gap: 4 }}>
                  <View style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
                    <ThemedText type="small">{bd.measuredAt || bd.createdAt?.slice(0, 10)}</ThemedText>
                  </View>
                  <ThemedText type="small">
                    身高 {bd.height}cm · 体重 {bd.weight}kg · 年龄 {bd.age}
                  </ThemedText>
                  {bd.bodyFat && <ThemedText type="small">体脂率 {bd.bodyFat}%</ThemedText>}
                  {bd.waist && <ThemedText type="small">腰围 {bd.waist}cm · 臀围 {bd.hip}cm</ThemedText>}
                </Card>
              ))}
            </>
          )}

          {/* 健身目标 */}
          {detail.goal && (
            <>
              <ThemedText type="smallBold" style={styles.sectionTitle}>健身目标</ThemedText>
              <Card>
                <ThemedText type="small">目标: {detail.goal.goalType}</ThemedText>
                <ThemedText type="small">频率: {detail.goal.weeklyFrequency} 次/周</ThemedText>
                {detail.goal.targetWeight && <ThemedText type="small">目标体重: {detail.goal.targetWeight}kg</ThemedText>}
              </Card>
            </>
          )}

          {/* 统计 */}
          <ThemedText type="smallBold" style={styles.sectionTitle}>统计</ThemedText>
          <Card>
            <ThemedText type="small">识别次数: {detail.recognitionHistory.length}</ThemedText>
            <ThemedText type="small">收藏视频: {detail.savedWorkoutCount}</ThemedText>
            <ThemedText type="small">生成菜谱: {detail.recipeCount}</ThemedText>
          </Card>

          {/* 操作按钮 */}
          <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
            <Pressable
              style={[styles.dangerBtn, { backgroundColor: colors.danger + '20' }]}
              onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <ThemedText style={{ color: colors.danger, fontWeight: '600' }}>删除此用户</ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.three, gap: Spacing.two, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  sectionTitle: { marginTop: Spacing.one },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two,
    padding: Spacing.three, borderRadius: 16,
  },
});

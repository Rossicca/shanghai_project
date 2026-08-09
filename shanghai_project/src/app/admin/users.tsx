import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteUser, fetchAdminUsers, updateUserRole, type AdminUser } from '@/services/admin';
import { alertDialog, confirmDialog } from '@/utils/dialog';

export default function AdminUsers() {
  const colors = useTheme();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async (p = 1, append = false) => {
    if (!append) setLoading(true);
    setError('');
    try {
      const result = await fetchAdminUsers({ page: p, pageSize: 20, search: search || undefined });
      setUsers(prev => append ? [...prev, ...result.items] : result.items);
      setHasMore(result.hasMore);
      setPage(p);
    } catch (e: any) {
      setError(e.message || '加载失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadUsers(1); }, 0);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  function handleRefresh() {
    setRefreshing(true);
    loadUsers(1);
  }

  function handleLoadMore() {
    if (!loading && hasMore) loadUsers(page + 1, true);
  }

  function handleToggleRole(user: AdminUser) {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    confirmDialog({
      title: '修改角色',
      message: `将 ${user.email} 的角色改为「${newRole === 'admin' ? '管理员' : '普通用户'}」？`,
      confirmText: '确认',
      onConfirm: async () => {
        try {
          await updateUserRole(user.id, newRole);
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
        } catch (e: any) {
          alertDialog('错误', e.message);
        }
      },
    });
  }

  function handleDelete(user: AdminUser) {
    confirmDialog({
      title: '删除用户',
      message: `确定删除 ${user.email} 的所有数据？此操作不可恢复。`,
      confirmText: '删除',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteUser(user.id);
          setUsers(prev => prev.filter(u => u.id !== user.id));
        } catch (e: any) {
          alertDialog('错误', e.message);
        }
      },
    });
  }

  function renderUser({ item }: { item: AdminUser }) {
    const isAdmin = item.role === 'admin';
    return (
      <Pressable
        style={[styles.userCard, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/admin/user/${item.id}`)}>
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: isAdmin ? colors.warning : colors.primarySoft }]}>
            <Ionicons name={isAdmin ? 'shield-checkmark' : 'person'} size={18} color={isAdmin ? colors.warning : colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ThemedText type="smallBold">{item.nickname}</ThemedText>
              {isAdmin && (
                <View style={[styles.adminBadge, { backgroundColor: colors.warning + '30' }]}>
                  <ThemedText type="small" style={{ fontSize: 10, color: colors.warning }}>管理员</ThemedText>
                </View>
              )}
            </View>
            <ThemedText type="small" themeColor="textSecondary">{item.email}</ThemedText>
          </View>
        </View>

        {item.lastBodyData && (
          <ThemedText type="small" themeColor="textSecondary">
            体重: {item.lastBodyData.weight}kg · 身高: {item.lastBodyData.height}cm
          </ThemedText>
        )}
        {item.goal && (
          <ThemedText type="small" themeColor="textSecondary">
            目标: {item.goal.goalType} · 频率: {item.goal.weeklyFrequency}次/周
          </ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary">
          识别 {item.recognitionCount} 次 · 注册于 {item.createdAt?.slice(0, 10)}
        </ThemedText>

        <View style={styles.userActions}>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: isAdmin ? colors.warning + '20' : colors.primarySoft }]}
            onPress={(e) => { e.stopPropagation(); handleToggleRole(item); }}>
            <Ionicons name="swap-horizontal" size={14} color={isAdmin ? colors.warning : colors.primary} />
            <ThemedText type="small" style={{ fontSize: 11, color: isAdmin ? colors.warning : colors.primary }}>
              {isAdmin ? '取消管理员' : '设为管理员'}
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.danger + '20' }]}
            onPress={(e) => { e.stopPropagation(); handleDelete(item); }}>
            <Ionicons name="trash-outline" size={14} color={colors.danger} />
            <ThemedText type="small" style={{ fontSize: 11, color: colors.danger }}>删除</ThemedText>
          </Pressable>
        </View>
      </Pressable>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
        {/* 搜索栏 */}
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="搜索邮箱或昵称..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => loadUsers(1)}
          />
          {search ? (
            <Pressable onPress={() => { setSearch(''); loadUsers(1); }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {loading && users.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
            <ThemedText themeColor="danger">{error}</ThemedText>
            <Pressable onPress={() => loadUsers(1)}>
              <ThemedText type="smallBold" themeColor="primary">重试</ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(u) => u.id}
            renderItem={renderUser}
            contentContainerStyle={{ padding: Spacing.three, gap: Spacing.two }}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={loading ? <ActivityIndicator color={colors.primary} /> : null}
            ListEmptyComponent={
              <View style={styles.center}>
                <ThemedText themeColor="textSecondary">暂无用户</ThemedText>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    margin: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    borderRadius: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },
  userCard: { padding: Spacing.three, borderRadius: 16, gap: Spacing.one },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  adminBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  userActions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
});

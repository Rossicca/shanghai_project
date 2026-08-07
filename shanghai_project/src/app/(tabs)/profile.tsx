import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatsCard } from '@/components/profile/StatsCard';
import { TrendChart } from '@/components/profile/TrendChart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getToken } from '@/services/api';
import { fetchAdminStats } from '@/services/admin';
import { fetchDashboard } from '@/services/workout';
import { useCommunityStore } from '@/store/communityStore';
import { useRecipeStore } from '@/store/recipeStore';
import { useUserStore } from '@/store/userStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { calcBMI } from '@/utils/nutrition';
import type { Recipe } from '@/types/recipe';
import type { WorkoutVideo } from '@/types/workout';

export default function ProfileTab() {
  const colors = useTheme();
  const { user, bodyData, goal, bodyHistory, load, logout } = useUserStore();
  const { savedRecipes, recipeHistory, loadLocal: loadRecipes, selectRecipe } = useRecipeStore();
  const {
    savedVideos,
    history: workoutHistory,
    loadLocal: loadWorkouts,
    selectVideo,
  } = useWorkoutStore();
  const { following, followers, load: loadCommunity } = useCommunityStore();
  const [dashboard, setDashboard] = useState<any>(null);
  const [dashboardError, setDashboardError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const friendCount = following.filter((n) => followers.includes(n)).length;

  useEffect(() => {
    load();
    loadRecipes();
    loadWorkouts();
    loadCommunity();
    if (getToken()) {
      fetchDashboard().then(setDashboard).catch((error) => setDashboardError(error.message));
      fetchAdminStats().then(() => setIsAdmin(true)).catch(() => setIsAdmin(false));
    }
  }, [load, loadRecipes, loadWorkouts, loadCommunity]);

  const bmi = calcBMI(bodyData);
  const bmiLabel = bmi ? (bmi < 18.5 ? '偏瘦' : bmi < 24 ? '正常' : bmi < 28 ? '偏胖' : '肥胖') : '';

  const totalWorkouts = Number(dashboard?.totalWorkouts ?? workoutHistory.length ?? 0);
  const totalCalories = workoutHistory.reduce((sum, v) => sum + (v.calories ?? 0), 0);
  const totalRecipes = Number(dashboard?.totalRecipes ?? recipeHistory.length ?? 0);
  const totalSaved = Number(
    dashboard
      ? (dashboard.totalSavedRecipes ?? 0) + (dashboard.totalSavedWorkouts ?? 0)
      : savedRecipes.length + savedVideos.length
  );
  // 游客也有本地 user，但只有持有 Token 才是已登录账号。
  const loggedIn = Boolean(user && getToken());

  function openRecipe(r: Recipe) {
    selectRecipe(r);
    router.push({ pathname: '/recipe/[id]', params: { id: r.id } });
  }
  function openVideo(v: WorkoutVideo) {
    selectVideo(v);
    router.push({ pathname: '/workout/[id]', params: { id: v.id } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* 用户头部 */}
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="person" size={36} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle">{user?.nickname ?? '未登录'}</ThemedText>
              {loggedIn ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {goal ? `目标：${goal.type}${goal.targetWeight ? ` · ${goal.targetWeight}kg` : ''}` : '还未设置健身目标'}
                </ThemedText>
              ) : (
                <Pressable onPress={() => router.push('/auth/login')}>
                  <ThemedText type="small" themeColor="primary">
                    登录 / 注册，保存你的数据 ›
                  </ThemedText>
                </Pressable>
              )}
              <ThemedText type="small" themeColor="textSecondary" style={styles.followCount}>
                关注 {following.length} · 好友 {friendCount}
              </ThemedText>
            </View>
          </View>

          {/* 数据统计看板 */}
          <View style={styles.statsRow}>
            <StatsCard icon="flame" label="训练次数" value={totalWorkouts} tint={colors.primary} />
            <StatsCard icon="fitness" label="消耗热量(千卡)" value={totalCalories} tint={colors.warning} />
            <StatsCard icon="restaurant" label="生成菜谱" value={totalRecipes} tint={colors.success} />
            <StatsCard icon="heart" label="收藏" value={totalSaved} tint="#E74C3C" />
          </View>
          {dashboardError ? (
            <ThemedText type="small" themeColor="textSecondary">
              在线统计暂时不可用，当前显示本机记录。
            </ThemedText>
          ) : null}

          {/* 身体数据 & 目标入口 */}
          <View style={styles.rows}>
            <Pressable onPress={() => router.push('/profile/body')}>
              <Card style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: colors.successSoft }]}>
                  <Ionicons name="body" size={22} color={colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">身体数据</ThemedText>
                  {bodyData ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {bodyData.height}cm / {bodyData.weight}kg
                      {bmi ? ` · BMI ${bmi.toFixed(1)}（${bmiLabel}）` : ''}
                    </ThemedText>
                  ) : (
                    <ThemedText type="small" themeColor="textSecondary">
                      填写后 AI 推荐更精准 ›
                    </ThemedText>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Card>
            </Pressable>
            <Pressable onPress={() => router.push('/profile/goal')}>
              <Card style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name="flag" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">健身目标</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {goal
                      ? `${goal.type}${goal.deadline ? ` · ${goal.deadline}` : ''}${goal.weeklyFrequency ? ` · 每周${goal.weeklyFrequency}次` : ''}`
                      : '设定目标，推荐更有针对性 ›'}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Card>
            </Pressable>
          </View>

          {/* 身体数据趋势 */}
          {bodyHistory.length >= 2 ? (
            <Card style={styles.trendCard}>
              <ThemedText type="smallBold">体重趋势</ThemedText>
              <TrendChart data={bodyHistory} field="weight" unit="kg" />
            </Card>
          ) : null}

          {/* 我的收藏 */}
          {(savedRecipes.length > 0 || savedVideos.length > 0) ? (
            <Card style={styles.section}>
              <ThemedText type="smallBold">我的收藏</ThemedText>
              {savedRecipes.length > 0 ? (
                <View style={styles.listSnippet}>
                  {savedRecipes.slice(0, 3).map((r) => (
                    <Pressable key={r.id} onPress={() => openRecipe(r)} style={styles.snippet}>
                      <Text style={styles.snippetEmoji}>{r.coverEmoji}</Text>
                      <ThemedText type="small" style={{ flex: 1 }} numberOfLines={1}>
                        {r.name}
                      </ThemedText>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {savedVideos.length > 0 ? (
                <View style={styles.listSnippet}>
                  {savedVideos.slice(0, 3).map((v) => (
                    <Pressable key={v.id} onPress={() => openVideo(v)} style={styles.snippet}>
                      <View style={[styles.snippetDot, { backgroundColor: v.coverColor }]} />
                      <ThemedText type="small" style={{ flex: 1 }} numberOfLines={1}>
                        {v.title}
                      </ThemedText>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </Card>
          ) : null}

          {/* 最近记录 */}
          {workoutHistory.length > 0 || recipeHistory.length > 0 ? (
            <Card style={styles.section}>
              <ThemedText type="smallBold">最近记录</ThemedText>
              {workoutHistory.slice(0, 3).map((v) => (
                <Pressable key={v.id} onPress={() => openVideo(v)} style={styles.snippet}>
                  <View style={[styles.snippetDot, { backgroundColor: v.coverColor }]} />
                  <ThemedText type="small" style={{ flex: 1 }} numberOfLines={1}>
                    {v.title}
                  </ThemedText>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {Math.round(v.duration / 60)}分钟
                  </Text>
                </Pressable>
              ))}
              {recipeHistory.slice(0, 3).map((r) => (
                <Pressable key={r.id} onPress={() => openRecipe(r)} style={styles.snippet}>
                  <Text style={styles.snippetEmoji}>{r.coverEmoji}</Text>
                  <ThemedText type="small" style={{ flex: 1 }} numberOfLines={1}>
                    {r.name}
                  </ThemedText>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{r.calories} 千卡</Text>
                </Pressable>
              ))}
            </Card>
          ) : null}

          {/* 管理员入口 */}
          {isAdmin ? (
            <Pressable onPress={() => router.push('/admin/dashboard')}>
              <Card style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: colors.warning + '30' }]}>
                  <Ionicons name="shield-checkmark" size={22} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">管理后台</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    用户管理 · 数据看板
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Card>
            </Pressable>
          ) : null}

          {/* 设置 */}
          {loggedIn ? (
            <Pressable
              onPress={async () => {
                await logout();
              }}>
              <Card style={[styles.row, { borderColor: colors.danger }]}>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                <ThemedText type="smallBold" themeColor="danger">
                  退出登录
                </ThemedText>
              </Card>
            </Pressable>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
            健康建议仅供参考，非医疗用途 · 演示数据
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  followCount: { marginTop: 2 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  rows: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowIcon: { width: 40, height: 40, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center' },
  trendCard: { gap: Spacing.three, alignItems: 'center' },
  section: { gap: Spacing.two },
  listSnippet: { gap: Spacing.one },
  snippet: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 6 },
  snippetEmoji: { fontSize: 18 },
  snippetDot: { width: 18, height: 18, borderRadius: 9 },
  tip: { textAlign: 'center', marginTop: Spacing.two },
});

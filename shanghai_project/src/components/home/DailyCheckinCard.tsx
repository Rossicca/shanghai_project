import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getToken } from '@/services/api';
import { useCheckinStore } from '@/store/checkinStore';
import { useUserStore } from '@/store/userStore';
import { alertDialog } from '@/utils/dialog';

/**
 * 首页「每日训练打卡」卡片 — 每天一次，打卡后同步到个人主页「训练次数」。
 * 游客点击引导登录；已打卡时按钮禁用并显示「已打卡」。
 */
export function DailyCheckinCard() {
  const colors = useTheme();
  const { checkedInToday, streak, loading, load, checkIn } = useCheckinStore();
  const user = useUserStore((s) => s.user);
  const loggedIn = Boolean(user && getToken());
  const checked = loggedIn && checkedInToday;

  // 首页重新聚焦时刷新状态（登录后 / 跨天自动恢复可打卡）
  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load])
  );

  async function handlePress() {
    if (!loggedIn) {
      router.push('/auth/login');
      return;
    }
    if (checkedInToday || loading) return;
    try {
      await checkIn();
    } catch (error) {
      alertDialog('打卡失败', (error as Error)?.message || '请稍后再试');
    }
  }

  const subtitle = !loggedIn
    ? '登录后开启每日打卡'
    : checked
      ? streak > 0
        ? `已连续打卡 ${streak} 天`
        : '今天已完成打卡'
      : '每天记录一次训练';

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={[styles.icon, { backgroundColor: checked ? colors.successSoft : colors.primarySoft }]}>
        <Ionicons
          name={checked ? 'checkmark-done' : 'calendar-outline'}
          size={20}
          color={checked ? colors.success : colors.primary}
        />
      </View>
      <View style={styles.body}>
        <ThemedText type="smallBold">每日训练打卡</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {subtitle}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={checked || loading}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: checked ? colors.successSoft : colors.primary },
          pressed && !checked ? { opacity: 0.8 } : null,
        ]}>
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={[styles.buttonText, { color: checked ? colors.success : '#fff' }]}>
            {checked ? '已打卡' : '打卡'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.three + 4,
    borderRadius: Radius.card,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0, gap: 2 },
  button: {
    minWidth: 76,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  buttonText: { fontSize: 13, fontWeight: '700' },
});

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Notice {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  time: string;
  read: boolean;
}

const SEED: Notice[] = [
  { id: 'n1', icon: 'camera', title: '检测到新食材，可以生成今天的菜谱了', time: '2 小时前', read: false },
  { id: 'n2', icon: 'barbell', title: '根据你的身体数据，为你推荐了 3 个新视频', time: '5 小时前', read: false },
  { id: 'n3', icon: 'restaurant', title: '你的减脂餐单「鸡胸肉沙拉」已收藏', time: '昨天', read: true },
  { id: 'n4', icon: 'chatbubble', title: '社区有新的回复，快去看看', time: '2 天前', read: true },
  { id: 'n5', icon: 'trophy', title: '连续记录 7 天，继续保持！', time: '3 天前', read: true },
];

/** 通知中心页（应用内独立页面，原为首页底部弹层） */
export default function NotificationsPage() {
  const colors = useTheme();
  const [notices, setNotices] = useState<Notice[]>(SEED);
  const unread = notices.filter((n) => !n.read).length;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 顶部：未读数 + 全部已读 */}
        <View style={styles.topBar}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            {unread > 0 ? `${unread} 条未读` : '全部已读'}
          </Text>
          <Pressable onPress={() => setNotices((list) => list.map((n) => ({ ...n, read: true })))} hitSlop={8}>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>全部已读</Text>
          </Pressable>
        </View>

        {notices.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={36} color={colors.backgroundSelected} />
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>暂无通知</Text>
          </View>
        ) : (
          notices.map((n) => (
            <Pressable
              key={n.id}
              style={[styles.item, { borderColor: colors.border }]}
              onPress={() => setNotices((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}>
              <View style={[styles.itemIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name={n.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.itemText, { color: n.read ? colors.textSecondary : colors.text }]}
                  numberOfLines={2}>
                  {n.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 3 }}>{n.time}</Text>
              </View>
              {!n.read ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
            </Pressable>
          ))
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
          通知为演示数据，仅供展示
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.one },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.one },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1,
  },
  itemIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 13, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  tip: { fontSize: 10, textAlign: 'center', marginTop: Spacing.three },
});

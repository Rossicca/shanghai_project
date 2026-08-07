import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

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

/** 通知中心（演示数据） */
export function NotificationSheet({ visible, onClose }: Props) {
  const colors = useTheme();
  const tabBarInset = useTabBarInset();
  const [notices, setNotices] = useState<Notice[]>(SEED);

  const unread = notices.filter((n) => !n.read).length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingBottom: tabBarInset }]}>
        <Pressable style={styles.dim} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.handle} />
          <View style={styles.head}>
            <View style={styles.headLeft}>
              <Ionicons name="notifications" size={20} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>通知</Text>
              {unread > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.badgeText}>{unread}</Text>
                </View>
              ) : null}
            </View>
            <Pressable onPress={() => setNotices((list) => list.map((n) => ({ ...n, read: true })))}>
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

          <Text style={[styles.tip, { color: colors.textSecondary }]}>通知为演示数据，仅供展示</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Web 端 Modal 渲染在 body 层，横向居中并限制为手机框宽度（#root max-width:480px）
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  dim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.one,
    maxHeight: '70%',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.3)', marginBottom: Spacing.two },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.one },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 17, fontWeight: '800' },
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
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

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  tint?: string;
  /** 传入后整张卡片变为可点击按钮（如收藏 / 生成菜谱入口） */
  onPress?: () => void;
};

/** 数据统计卡片；传 onPress 后变为可交互按钮 */
export function StatsCard({ icon, label, value, tint, onPress }: Props) {
  const colors = useTheme();
  const color = tint ?? colors.primary;

  const content = (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <ThemedText type="subtitle" style={styles.value}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Card>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && { opacity: 0.6 }]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { flex: 1 },
  card: { flex: 1, alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.three },
  iconWrap: { width: 36, height: 36, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 24, lineHeight: 28 },
});

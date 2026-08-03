import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  tint?: string;
};

/** 数据统计卡片 */
export function StatsCard({ icon, label, value, tint }: Props) {
  const colors = useTheme();
  const color = tint ?? colors.primary;

  return (
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
}

const styles = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.three },
  iconWrap: { width: 36, height: 36, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 24, lineHeight: 28 },
});

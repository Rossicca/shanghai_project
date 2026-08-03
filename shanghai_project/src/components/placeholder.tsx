import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 模块开发中的占位视图 */
export function Placeholder({ icon, title, description }: { icon: keyof typeof Ionicons.glyphMap; title: string; description?: string }) {
  const colors = useTheme();

  return (
    <ThemedView style={styles.container}>
      <Ionicons name={icon} size={56} color={colors.backgroundSelected} />
      <ThemedText type="subtitle">{title}</ThemedText>
      {description ? (
        <ThemedText themeColor="textSecondary" style={styles.desc}>
          {description}
        </ThemedText>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  desc: { textAlign: 'center', lineHeight: 22 },
});

import { Pressable, StyleSheet, Text } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  isSelected?: boolean;
  onPress?: () => void;
  dark?: boolean;
};

/** 分类标签芯片 */
export function CategoryChip({ label, isSelected, onPress, dark }: Props) {
  const colors = useTheme();

  return (
    <Pressable onPress={onPress}>
      <Text
        style={[
          styles.chip,
          dark
            ? {
                backgroundColor: isSelected ? colors.primary : 'rgba(255,255,255,0.12)',
                color: isSelected ? '#fff' : 'rgba(255,255,255,0.9)',
                borderColor: isSelected ? colors.primary : 'rgba(255,255,255,0.18)',
              }
            : {
                backgroundColor: isSelected ? colors.primary : colors.backgroundElement,
                color: isSelected ? '#fff' : colors.text,
                borderColor: isSelected ? colors.primary : colors.border,
              },
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.chip,
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    overflow: 'hidden',
  },
});

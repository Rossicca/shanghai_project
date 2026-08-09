import { Pressable, StyleSheet, Text, type GestureResponderEvent } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  isSelected?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  /** 悬浮在视频上时的暗色样式 */
  overlay?: boolean;
};

/** 分类标签芯片 */
export function CategoryChip({ label, isSelected, onPress, overlay }: Props) {
  const colors = useTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: Boolean(isSelected) }}
      accessibilityLabel={`${label}${isSelected ? '，当前分类；双击可换一组' : ''}`}
      onPress={onPress}
      style={styles.pressable}>
      <Text
        style={[
          styles.chip,
          overlay
            ? {
                backgroundColor: isSelected ? 'rgba(47,168,134,0.92)' : 'transparent',
                color: isSelected ? '#fff' : 'rgba(255,255,255,0.78)',
                borderColor: isSelected ? 'rgba(255,255,255,0.18)' : 'transparent',
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
  pressable: { minHeight: 44, justifyContent: 'center' },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.chip,
    fontSize: 13,
    fontWeight: '700',
    borderWidth: 1,
    overflow: 'hidden',
  },
});

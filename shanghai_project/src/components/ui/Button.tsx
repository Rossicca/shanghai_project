import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'large' | 'medium' | 'small';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
};

/** 主按钮/次按钮/描边/文字按钮，带 loading 态 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading,
  disabled,
  icon,
  style,
}: ButtonProps) {
  const colors = useTheme();
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  const bg = isPrimary
    ? colors.primary
    : variant === 'secondary'
      ? colors.backgroundElement
      : 'transparent';
  const fg = isPrimary
    ? '#FFFFFF'
    : variant === 'outline'
      ? colors.primary
      : variant === 'text'
        ? colors.primary
        : colors.text;

  const sizeStyle =
    size === 'large'
      ? { paddingVertical: 14, borderRadius: Radius.button, fontSize: 17 }
      : size === 'small'
        ? { paddingVertical: 8, borderRadius: Radius.button, fontSize: 13 }
        : { paddingVertical: 11, borderRadius: Radius.button, fontSize: 15 };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor: variant === 'outline' ? colors.primary : 'transparent' },
        sizeStyle,
        isPrimary && { shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
        pressed && !isDisabled && { opacity: 0.8 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'small' ? 16 : 18} color={fg} /> : null}
          <Text style={[styles.label, { color: fg, fontSize: sizeStyle.fontSize }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    minHeight: 40,
  },
  label: { fontWeight: '700' },
});

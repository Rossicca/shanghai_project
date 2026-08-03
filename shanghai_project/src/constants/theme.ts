/**
 * 主题色（V2 方向，2026-08-02 定）：薄荷绿低饱和 + 墨绿文字，健康管理 App 风
 * 浅色/深色模式跟随系统
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#16382E',
    background: '#F2F8F5',
    backgroundElement: '#EAF3EE',
    backgroundSelected: '#DCEBE4',
    textSecondary: '#5A7A6F',
    primary: '#2FA886',
    primarySoft: '#E4F3ED',
    success: '#2FA886',
    successSoft: '#E4F3ED',
    warning: '#F5B14C',
    danger: '#D9704F',
    card: '#FFFFFF',
    border: '#DFEBE5',
    tabBar: '#FFFFFF',
    yellowSoft: '#FDF0DC',
    pinkSoft: '#FCE9E4',
    blueSoft: '#E7F0FA',
  },
  dark: {
    text: '#E7F0EC',
    background: '#0D1A15',
    backgroundElement: '#17271F',
    backgroundSelected: '#21362C',
    textSecondary: '#8AA89C',
    primary: '#3BBF9A',
    primarySoft: '#173428',
    success: '#3BBF9A',
    successSoft: '#173428',
    warning: '#F5B14C',
    danger: '#E58266',
    card: '#15251E',
    border: '#244034',
    tabBar: '#101F18',
    yellowSoft: '#332A16',
    pinkSoft: '#33201C',
    blueSoft: '#1B2A3B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** SF Pro */
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    /** Noto Sans SC */
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** 圆角规范（V2 大圆角，健康感）：卡片 20 / 按钮 12 / 标签 18 */
export const Radius = {
  button: 12,
  card: 20,
  chip: 18,
  circle: 999,
} as const;

/** 间距：4px 基准，8/12/16/20/24/32 级 */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

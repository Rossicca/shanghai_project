import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useThemeStore } from '@/store/themeStore';

const emptySubscribe = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const preference = useThemeStore((s) => s.preference);
  const systemColorScheme = useRNColorScheme() ?? 'light';
  if (!hasHydrated) return 'light';
  return preference === 'system' ? systemColorScheme : preference;
}

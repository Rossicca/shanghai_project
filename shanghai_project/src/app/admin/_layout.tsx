import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export default function AdminLayout() {
  const colors = useTheme();

  // 直接访问/刷新深层页面时导航栈为空，router.back() 会失效，
  // 兜底跳回首页（tab 根路由 /）。
  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerTintColor: colors.primary,
        headerLeft: () => (
          <Pressable onPress={handleBack} hitSlop={10} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
        ),
      }}>
      <Stack.Screen name="dashboard" options={{ title: '管理后台' }} />
      <Stack.Screen name="users" options={{ title: '用户管理' }} />
      <Stack.Screen name="user/[id]" options={{ title: '用户详情' }} />
    </Stack>
  );
}
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export default function AdminLayout() {
  const colors = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerTintColor: colors.primary,
        headerLeft: () => (
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ marginRight: 12 }}>
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
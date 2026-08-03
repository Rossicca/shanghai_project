import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { useThemeStore } from '@/store/themeStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    useThemeStore.getState().load();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: '登录' }} />
        <Stack.Screen name="auth/register" options={{ title: '注册' }} />
        <Stack.Screen name="profile/body" options={{ title: '身体数据' }} />
        <Stack.Screen name="profile/goal" options={{ title: '健身目标' }} />
        <Stack.Screen name="camera/scan" options={{ title: '拍照识别', headerShown: false }} />
        <Stack.Screen name="recipe/generate" options={{ title: 'AI 生成菜谱' }} />
        <Stack.Screen name="recipe/[id]" options={{ title: '菜谱详情' }} />
        <Stack.Screen name="workout/[id]" options={{ title: '视频详情' }} />
        <Stack.Screen name="workout/category/[slug]" options={{ title: '分类视频' }} />
      </Stack>
    </ThemeProvider>
  );
}

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    useThemeStore.getState().load();
    useUserStore.getState().load();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: '登录' }} />
        <Stack.Screen name="auth/register" options={{ title: '注册' }} />
        <Stack.Screen name="profile/body" options={{ title: '身体数据' }} />
        <Stack.Screen name="profile/goal" options={{ title: '健身目标' }} />
        <Stack.Screen name="notifications" options={{ title: '通知' }} />
        <Stack.Screen name="favorites" options={{ title: '我的收藏' }} />
        <Stack.Screen name="more" options={{ title: '设置' }} />
        <Stack.Screen name="camera/scan" options={{ title: '拍照识别', headerShown: false }} />
        <Stack.Screen name="recipe/generate" options={{ title: 'AI 生成菜谱' }} />
        <Stack.Screen name="recipe/inspiration/[id]" options={{ title: '健康饮食灵感', headerShown: false }} />
        <Stack.Screen name="recipe/[id]" options={{ title: '菜谱详情' }} />
        <Stack.Screen name="community/[id]" options={{ title: '动态详情' }} />
        <Stack.Screen name="community/user/[name]" options={{ title: '个人主页' }} />
        <Stack.Screen name="workout/[id]" options={{ title: '视频详情' }} />
        <Stack.Screen name="workout/plan" options={{ headerShown: false }} />
        <Stack.Screen name="workout/plan-result" options={{ headerShown: false }} />
        <Stack.Screen name="workout/plans" options={{ title: '已保存的计划' }} />
        <Stack.Screen name="workout/category/[slug]" options={{ title: '分类视频' }} />
        {/* admin/ 有自己的 _layout，整段作为一个嵌套路由挂载 */}
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

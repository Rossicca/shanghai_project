import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mockLogin } from '@/services/user';
import { useUserStore } from '@/store/userStore';

export default function Login() {
  const colors = useTheme();
  const login = useUserStore((s) => s.login);
  const setUser = useUserStore((s) => s.setUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!email.trim()) {
      setError('请输入邮箱');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/profile');
    } catch (e: any) {
      setError(e?.message || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={[styles.logo, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="barbell" size={36} color={colors.primary} />
            </View>
            <ThemedText type="title" style={styles.title}>
              欢迎回来
            </ThemedText>
            <ThemedText themeColor="textSecondary">拍出健康，练出好状态</ThemedText>
          </View>

          <View style={styles.form}>
            <Input
              label="邮箱"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              placeholder="请输入邮箱"
              keyboardType="email-address"
              autoCapitalize="none"
              error={error}
            />
            <Input
              label="密码"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              placeholder="请输入密码"
              secureTextEntry
            />

            <Button title="登录" onPress={handleLogin} loading={loading} size="large" />

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <ThemedText type="small" themeColor="textSecondary">或</ThemedText>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            <View style={styles.links}>
              <Pressable onPress={() => router.push('/auth/register')}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>注册新账号</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await setUser(await mockLogin('健身新人'));
                  router.replace('/(tabs)/profile');
                }}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>游客进入 ›</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four },
  header: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.four },
  logo: {
    width: 72, height: 72, borderRadius: Radius.card,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two,
  },
  title: { fontSize: 28, lineHeight: 36 },
  form: { gap: Spacing.three, marginTop: Spacing.four },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginVertical: Spacing.one },
  line: { flex: 1, height: 1 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.two },
});
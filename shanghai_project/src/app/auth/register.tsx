import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { mockLogin } from '@/services/user';
import { useUserStore } from '@/store/userStore';

export default function Register() {
  const colors = useTheme();
  const register = useUserStore((s) => s.register);
  const setUser = useUserStore((s) => s.setUser);

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!nickname.trim()) { setError('请填写昵称'); return; }
    if (!email.trim()) { setError('请输入邮箱'); return; }
    if (!password || password.length < 6) { setError('密码至少6位'); return; }

    setLoading(true);
    setError('');
    try {
      await register(email.trim(), password, nickname.trim());
      router.replace('/(tabs)/profile');
    } catch (e: any) {
      setError(e?.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            创建账号
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            完善资料后，AI 就能按你的身体数据定制食谱和运动计划。
          </ThemedText>

          <View style={styles.form}>
            <Input label="昵称" value={nickname} onChangeText={setNickname} placeholder="怎么称呼你" maxLength={12} />
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
              placeholder="至少6位密码"
              secureTextEntry
            />
            <Button title="注册并进入" onPress={handleRegister} loading={loading} size="large" />
          </View>

          <View style={styles.links}>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.tip}
              onPress={() => router.back()}
            >
              已有账号？去登录 ›
            </ThemedText>
          </View>

          <View style={styles.guest}>
            <Button
              title="游客模式体验"
              variant="secondary"
              onPress={async () => {
                await setUser(await mockLogin(nickname.trim() || '健身新人'));
                router.replace('/(tabs)/profile');
              }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  title: { fontSize: 28, lineHeight: 36 },
  form: { gap: Spacing.three, marginTop: Spacing.four },
  tip: { marginTop: Spacing.two },
  links: { marginTop: Spacing.two, alignItems: 'center' },
  guest: { marginTop: Spacing.four },
});
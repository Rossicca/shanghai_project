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
  const setUser = useUserStore((s) => s.setUser);

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function sendCode() {
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setError('');
    setCode('123456'); // 演示：自动填充验证码
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleLogin() {
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    if (code.length < 4) {
      setError('请输入验证码（演示自动填充了 123456）');
      return;
    }
    setLoading(true);
    try {
      await setUser(await mockLogin(phone));
      router.replace('/(tabs)/profile');
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
              label="手机号"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^\d]/g, ''))}
              placeholder="请输入手机号"
              keyboardType="phone-pad"
              maxLength={11}
              error={error && !/^1\d{10}$/.test(phone) ? error : undefined}
            />
            <Input
              label="验证码"
              value={code}
              onChangeText={(t) => setCode(t.replace(/[^\d]/g, ''))}
              placeholder="6 位验证码（演示自动填 123456）"
              keyboardType="number-pad"
              maxLength={6}
              rightElement={
                <Pressable onPress={sendCode} disabled={countdown > 0}>
                  <Text style={{ color: countdown > 0 ? colors.textSecondary : colors.primary, fontSize: 13, fontWeight: '600' }}>
                    {countdown > 0 ? `${countdown}s` : '发送验证码'}
                  </Text>
                </Pressable>
              }
            />

            <Button title="登录" onPress={handleLogin} loading={loading} size="large" />

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <ThemedText type="small" themeColor="textSecondary">
                或
              </ThemedText>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            <Button
              title="微信一键登录"
              variant="secondary"
              icon="logo-wechat"
              onPress={() => {
                setPhone('13800000000');
                setCode('123456');
                handleLogin();
              }}
            />

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
    width: 72,
    height: 72,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  title: { fontSize: 28, lineHeight: 36 },
  form: { gap: Spacing.three, marginTop: Spacing.four },
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, marginVertical: Spacing.one },
  line: { flex: 1, height: 1 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.two },
});

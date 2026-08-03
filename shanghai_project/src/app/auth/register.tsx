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
  const setUser = useUserStore((s) => s.setUser);

  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!nickname.trim()) {
      setError('请填写昵称');
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    try {
      await setUser(await mockLogin(nickname.trim()));
      router.replace('/(tabs)/profile');
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
              label="手机号"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/[^\d]/g, ''))}
              placeholder="请输入手机号"
              keyboardType="phone-pad"
              maxLength={11}
              error={error}
            />
            <Button title="注册并进入" onPress={handleRegister} loading={loading} size="large" />
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
            演示版本：账号信息仅保存在本机，不涉及真实注册。
          </ThemedText>
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
});

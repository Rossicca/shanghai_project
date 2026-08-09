import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeStore, type ThemePreference } from '@/store/themeStore';

const OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: '跟随系统' },
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
];

/** 更多设置页（应用内独立页面，原为首页底部弹层） */
export default function MorePage() {
  const colors = useTheme();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>个性化</Text>
        <SettingLink icon="body-outline" title="身体数据" copy="身高、体重、BMI 与可选围度" onPress={() => router.push('/profile/body')} />
        <SettingLink icon="flag-outline" title="健身目标" copy="目标方向、每周频率与复盘周期" onPress={() => router.push('/profile/goal')} />
        <SettingLink icon="notifications-outline" title="通知" copy="查看训练、饮食和社区消息" onPress={() => router.push('/notifications')} />

        {/* 外观 */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>外观</Text>
        <View style={[styles.optionRow, { borderColor: colors.border }]}>
          <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="moon" size={18} color={colors.primary} />
          </View>
          <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>夜间模式</Text>
          <View style={[styles.segment, { backgroundColor: colors.backgroundElement }]}>
            {OPTIONS.map((o) => {
              const active = preference === o.key;
              return (
                <Pressable
                  key={o.key}
                  onPress={() => setPreference(o.key)}
                  style={[
                    styles.segItem,
                    active && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
                  ]}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: active ? colors.text : colors.textSecondary }}>
                    {o.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 关于 */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>关于</Text>
        <View style={[styles.optionRow, { borderColor: colors.border }]}>
          <View style={[styles.optionIcon, { backgroundColor: colors.pinkSoft }]}>
            <Ionicons name="information-circle" size={18} color="#C0664C" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 14 }}>版本与说明</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
              v1.0 · 演示版本 · 健康建议仅供参考，非医疗用途
            </Text>
          </View>
        </View>

        <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
          训练与饮食建议仅供健康管理参考，不替代医疗诊断
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function SettingLink({ icon, title, copy, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; copy: string; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.optionRow, { borderColor: colors.border }]}>
      <View style={[styles.optionIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{copy}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.one },
  sectionLabel: { fontSize: 11, marginTop: Spacing.three, marginBottom: Spacing.one },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1,
  },
  optionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', padding: 3, borderRadius: Radius.chip },
  segItem: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignItems: 'center' },
  tip: { fontSize: 10, textAlign: 'center', marginTop: Spacing.three },
});

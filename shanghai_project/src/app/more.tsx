import { Ionicons } from '@expo/vector-icons';
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
          <View style={[styles.optionIcon, { backgroundColor: colors.yellowSoft }]}>
            <Ionicons name="leaf" size={18} color="#B07A26" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 14 }}>芽芽健康</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
              拍照识别食物 · 按身体数据推送运动
            </Text>
          </View>
        </View>
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
          芽芽健康 · 星火计划超级个体挑战赛 demo
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.one },
  sectionLabel: { fontSize: 11, marginTop: Spacing.one },
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

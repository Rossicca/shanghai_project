import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import { useThemeStore, type ThemePreference } from '@/store/themeStore';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const OPTIONS: { key: ThemePreference; label: string }[] = [
  { key: 'system', label: '跟随系统' },
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' },
];

/** 更多菜单：夜间模式切换 + 关于 */
export function MoreSheet({ visible, onClose }: Props) {
  const colors = useTheme();
  const tabBarInset = useTabBarInset();
  const preference = useThemeStore((s) => s.preference);
  const setPreference = useThemeStore((s) => s.setPreference);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingBottom: tabBarInset }]}>
        <Pressable style={styles.dim} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.handle} />
          <Text style={[styles.title, { color: colors.text }]}>更多</Text>

          {/* 夜间模式 */}
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
              <Text style={{ color: colors.text, fontSize: 14 }}>核心功能</Text>
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

          <Text style={[styles.tip, { color: colors.textSecondary }]}>训练与饮食建议仅供健康管理参考，不替代医疗诊断</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Web 端 Modal 渲染在 body 层，横向居中并限制为手机框宽度（#root max-width:480px）
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  dim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    padding: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.3)' },
  title: { fontSize: 17, fontWeight: '800' },
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

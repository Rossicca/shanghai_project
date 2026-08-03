import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CommunityPost } from '@/types/community';

const CATEGORIES: { key: CommunityPost['category']; label: string }[] = [
  { key: '打卡', label: '💪 打卡' },
  { key: '食谱', label: '🥗 食谱' },
  { key: '晒变化', label: '📸 晒变化' },
  { key: '提问', label: '🙋 提问' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: { content: string; category: CommunityPost['category'] }) => void;
};

/** 发动态底部弹层 */
export function PostComposer({ visible, onClose, onSubmit }: Props) {
  const colors = useTheme();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CommunityPost['category']>('打卡');

  function reset() {
    setContent('');
    setCategory('打卡');
  }

  function submit() {
    const text = content.trim();
    if (!text) return;
    onSubmit({ content: text, category });
    reset();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.dim} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.handle} />
          <View style={[styles.avatarRow, { backgroundColor: colors.primarySoft }]}>
            <Text style={{ fontSize: 18 }}>🌱</Text>
            <Text style={[styles.selfName, { color: colors.text }]}>我</Text>
          </View>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="分享今天的打卡 / 减脂心得 / 提问…"
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={200}
            style={[styles.input, { color: colors.text }]}
          />
          <View style={styles.chips}>
            {CATEGORIES.map((c) => {
              const active = c.key === category;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => setCategory(c.key)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? colors.primary : colors.backgroundElement,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}>
                  <Text style={{ fontSize: 13, color: active ? '#fff' : colors.textSecondary }}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Button title="发布" onPress={submit} disabled={!content.trim()} size="large" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  dim: { flex: 1 },
  sheet: {
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.five,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(128,128,128,0.3)' },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  selfName: { fontSize: 13, fontWeight: '700' },
  input: { minHeight: 96, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.chip, borderWidth: 1 },
});

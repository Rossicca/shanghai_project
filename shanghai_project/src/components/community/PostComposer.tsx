import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Radius, Spacing } from '@/constants/theme';
import { useTabBarInset } from '@/hooks/use-tab-bar-inset';
import { useTheme } from '@/hooks/use-theme';
import type { CommunityPost } from '@/types/community';

const CATEGORIES: { key: CommunityPost['category']; label: string }[] = [
  { key: '打卡', label: '打卡' },
  { key: '食谱', label: '食谱' },
  { key: '晒变化', label: '晒变化' },
  { key: '提问', label: '提问' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (input: {
    content: string;
    category: CommunityPost['category'];
    image?: CommunityPost['image'];
  }) => Promise<void>;
};

/** 发动态底部弹层 */
export function PostComposer({ visible, onClose, onSubmit }: Props) {
  const colors = useTheme();
  const tabBarInset = useTabBarInset();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<CommunityPost['category']>('打卡');
  const [image, setImage] = useState<CommunityPost['image'] | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function reset() {
    setContent('');
    setCategory('打卡');
    setImage(undefined);
    setSubmitError('');
  }

  async function submit() {
    const text = content.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onSubmit({ content: text, category, image });
      reset();
      onClose();
    } catch (error) {
      setSubmitError((error as Error).message || '发布失败，请检查登录状态和网络后重试');
    } finally {
      setSubmitting(false);
    }
  }

  /** 从相册选一张配图（web 端为文件选择器） */
  async function pickPhoto() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.55,
        base64: true,
      });
      const asset = res.assets?.[0];
      if (res.canceled || !asset?.uri) return;
      const mimeType = asset.mimeType?.startsWith('image/') ? asset.mimeType : 'image/jpeg';
      const sharedUri = asset.base64 ? `data:${mimeType};base64,${asset.base64}` : asset.uri;
      setImage({ uri: sharedUri, emoji: '配图', color: '#E4F3ED' });
    } catch {
      Alert.alert('选择照片失败', '请换个方式试试');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { paddingBottom: tabBarInset }]}>
        <Pressable style={styles.dim} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.handle} />
          <View style={[styles.avatarRow, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="leaf" size={17} color={colors.primary} />
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

          {/* 配图区：点选相册 / 换图 / 删除 */}
          <Pressable onPress={pickPhoto} style={[styles.photoPick, { backgroundColor: colors.backgroundElement }]}>
            {image?.uri ? (
              <Image source={{ uri: image.uri }} style={styles.photoPreview} contentFit="cover" />
            ) : (
              <View style={{ alignItems: 'center', gap: Spacing.one }}>
                <Ionicons name="image-outline" size={26} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>添加照片（可选）</Text>
              </View>
            )}
            {image?.uri ? (
              <Pressable
                hitSlop={8}
                onPress={(e) => {
                  e.stopPropagation();
                  setImage(undefined);
                }}
                style={[styles.removeBtn, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            ) : null}
          </Pressable>

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
          {submitError ? <Text style={[styles.submitError, { color: colors.danger }]}>{submitError}</Text> : null}
          <Button title="发布" onPress={submit} disabled={!content.trim()} loading={submitting} size="large" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Web 端 Modal 渲染在 body 层，横向居中并限制为手机框宽度（#root max-width:480px）
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  dim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    width: '100%',
    maxWidth: 480,
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
  photoPick: {
    height: 140,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.chip, borderWidth: 1 },
  submitError: { fontSize: 12, lineHeight: 18 },
});

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCommunityStore } from '@/store/communityStore';
import { alertDialog, confirmDialog } from '@/utils/dialog';

const CATEGORY_COLORS: Record<string, string> = {
  打卡: '#2FA886',
  食谱: '#B07A26',
  提问: '#3E6FA8',
  晒变化: '#C0664C',
};

/** 动态详情：正文 + 下方评论区 + 底部输入栏 */
export default function CommunityPostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const { posts, commentsByPost, addComment, toggleLike, removePost, removeComment, load, syncFeed, loaded } =
    useCommunityStore();
  const post = posts.find((p) => p.id === id);
  const comments = commentsByPost[id ?? ''] ?? [];
  const [draft, setDraft] = useState('');
  // 加载完成且帖子不存在才算「不存在」
  const notFound = loaded && !!id && !posts.some((p) => p.id === id);

  useFocusEffect(
    useCallback(() => {
      if (!loaded) load().catch(() => undefined);
      const timer = setInterval(() => {
        syncFeed().catch(() => undefined);
      }, 6000);
      return () => clearInterval(timer);
    }, [load, loaded, syncFeed])
  );

  function submit() {
    if (!id) return;
    const text = draft.trim();
    if (!text) return;
    addComment(id, text);
    setDraft('');
  }

  /** 仅评论作者可删：确认后调后端（后端会再次校验作者身份） */
  function handleDeleteComment(commentId: string) {
    if (!id) return;
    confirmDialog({
      title: '删除评论',
      message: '确定删除这条评论吗？',
      confirmText: '删除',
      cancelText: '取消',
      destructive: true,
      onConfirm: () => {
        removeComment(id, commentId).catch((error) =>
          alertDialog('删除失败', (error as Error)?.message || '请稍后再试')
        );
      },
    });
  }

  /** 仅作者可删：删除后返回列表 */
  function handleDelete() {
    if (!id) return;
    confirmDialog({
      title: '删除动态',
      message: '删除后不可恢复，确定删除这条动态吗？',
      confirmText: '删除',
      cancelText: '取消',
      destructive: true,
      onConfirm: () => {
        removePost(id)
          .then(() => router.back())
          .catch((error) => alertDialog('删除失败', (error as Error)?.message || '请稍后再试'));
      },
    });
  }

  if (!post && !notFound) {
    return <ThemedView style={styles.center} />;
  }
  if (notFound || !post) {
    return (
      <ThemedView style={styles.center}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
        <ThemedText type="subtitle" style={styles.centerText}>动态不存在或已删除</ThemedText>
      </ThemedView>
    );
  }

  const catColor = CATEGORY_COLORS[post.category];

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* 动态正文 */}
          <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.head}>
              <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
                <Text style={styles.avatarEmoji}>{post.author.avatar}</Text>
              </View>
              <View style={styles.headMain}>
                <View style={styles.nameRow}>
                  <ThemedText type="smallBold">{post.author.name}</ThemedText>
                  {post.author.tag ? (
                    <Text style={[styles.tag, { color: catColor, backgroundColor: `${catColor}1A` }]}>
                      {post.author.tag}
                    </Text>
                  ) : null}
                </View>
                <ThemedText type="small" themeColor="textSecondary">{post.timeLabel}</ThemedText>
              </View>
              {/* 仅作者可删 */}
              {post.canDelete ? (
                <Pressable hitSlop={8} style={styles.deleteBtn} onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            <ThemedText style={styles.contentText}>{post.content}</ThemedText>

            {post.image ? (
              post.image.uri ? (
                <Image source={{ uri: post.image.uri }} style={styles.image} contentFit="cover" />
              ) : (
                <View style={[styles.image, { backgroundColor: post.image.color }]}>
                  <Text style={styles.imageEmoji}>{post.image.emoji}</Text>
                </View>
              )
            ) : null}

            {/* 点赞（可操作） */}
            <View style={styles.actions}>
              <Pressable hitSlop={8} style={styles.action} onPress={() => toggleLike(post.id)}>
                <Ionicons
                  name={post.liked ? 'heart' : 'heart-outline'}
                  size={18}
                  color={post.liked ? colors.danger : colors.textSecondary}
                />
                <Text style={[styles.actionText, { color: post.liked ? colors.danger : colors.textSecondary }]}>
                  {post.likes}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* 评论区 */}
          <View style={styles.sectionHead}>
            <ThemedText type="smallBold">评论 {comments.length}</ThemedText>
          </View>
          {comments.length > 0 ? (
            comments.map((c) => (
              <View key={c.id} style={[styles.commentRow, { borderColor: colors.border }]}>
                <View style={[styles.avatar, styles.commentAvatar, { backgroundColor: colors.primarySoft }]}>
                  <Text style={styles.avatarEmoji}>{c.author.avatar}</Text>
                </View>
                <View style={styles.commentMain}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.commentName, { color: colors.text }]}>{c.author.name}</Text>
                    <Text style={[styles.commentTime, { color: colors.textSecondary }]}>{c.timeLabel}</Text>
                  </View>
                  <Text style={[styles.commentBody, { color: colors.text }]}>{c.content}</Text>
                </View>
                {/* 仅评论作者可删 */}
                {c.canDelete ? (
                  <Pressable hitSlop={8} style={styles.commentDeleteBtn} onPress={() => handleDeleteComment(c.id)}>
                    <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
                  </Pressable>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={30} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>还没有评论，来说两句吧</Text>
            </View>
          )}
        </ScrollView>

        {/* 底部输入栏 */}
        <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.card }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="写下你的评论…"
            placeholderTextColor={colors.textSecondary}
            maxLength={200}
            style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundElement }]}
          />
          <Button title="发送" onPress={submit} disabled={!draft.trim()} size="medium" />
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  centerText: { marginTop: Spacing.one },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.five + 40 },
  postCard: { borderRadius: Radius.card, borderWidth: 1, padding: Spacing.three, gap: Spacing.two + 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headMain: { flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  deleteBtn: { marginLeft: 'auto', padding: 4 },
  tag: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.chip, overflow: 'hidden' },
  contentText: { fontSize: 14, lineHeight: 22 },
  image: { height: 120, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center' },
  imageEmoji: { fontSize: 44 },
  actions: { flexDirection: 'row', alignItems: 'center', paddingTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 13, fontWeight: '600' },
  sectionHead: { marginTop: Spacing.two },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  commentAvatar: { width: 28, height: 28, borderRadius: 14 },
  commentMain: { flex: 1 },
  commentName: { fontSize: 13, fontWeight: '700' },
  commentTime: { fontSize: 11 },
  commentBody: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  commentDeleteBtn: { padding: 4, marginLeft: 2 },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  emptyText: { fontSize: 13 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    paddingBottom: Spacing.two + 6,
  },
  input: {
    flex: 1,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.three,
    paddingVertical: 9,
    fontSize: 14,
  },
});

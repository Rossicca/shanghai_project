import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { FollowChip } from '@/components/community/FollowChip';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCommunityStore } from '@/store/communityStore';
import type { CommunityPost } from '@/types/community';
import { isSelfAuthor } from '@/utils/community';

const CATEGORY_COLORS: Record<CommunityPost['category'], string> = {
  打卡: '#2FA886',
  食谱: '#B07A26',
  提问: '#3E6FA8',
  晒变化: '#C0664C',
};

type Props = {
  post: CommunityPost;
  onToggleLike?: (id: string) => void;
  /** 是否显示关注按钮（用户主页复用卡片时传 false，避免重复按钮） */
  showFollow?: boolean;
};

/** 分享文案：作者(+标签) · 分类\n内容 */
function buildShareText(post: CommunityPost): string {
  const author = `${post.author.name}${post.author.tag ? `（${post.author.tag}）` : ''}`;
  return `${author} · ${post.category}\n${post.content}\n——来自芽芽健康社区`;
}

/** 社区动态卡片 */
export function PostCard({ post, onToggleLike, showFollow = true }: Props) {
  const colors = useTheme();
  const catColor = CATEGORY_COLORS[post.category];
  const { commentsByPost, following, followers } = useCommunityStore();
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commentCount = commentsByPost[post.id]?.length ?? post.comments;
  const isSelf = isSelfAuthor(post.author.name);
  const isFriend = !isSelf && following.includes(post.author.name) && followers.includes(post.author.name);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }

  async function handleShare() {
    const text = buildShareText(post);
    // 原生端：系统分享面板
    if (Platform.OS !== 'web') {
      try {
        await Share.share({ message: text });
      } catch {
        // 用户取消分享，静默
      }
      return;
    }
    // Web 端：优先 Web Share API，退而复制到剪贴板
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return; // 用户取消
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        showToast('已复制分享内容，去粘贴给朋友吧');
        return;
      }
    } catch {
      // 剪贴板不可用，落入兜底
    }
    showToast('当前浏览器不支持分享');
  }

  return (
    <Card style={styles.card}>
      {/* 作者行：点头像/名字进用户主页 */}
      <View style={styles.head}>
        <Pressable
          style={styles.authorMain}
          onPress={() =>
            router.push({ pathname: '/community/user/[name]', params: { name: post.author.name } })
          }>
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <Text style={styles.avatarEmoji}>{post.author.avatar}</Text>
            {/* 好友角标：绝对定位在头像右上，不改变推文排版 */}
            {isFriend ? (
              <View style={[styles.friendBadge, { backgroundColor: colors.warning }]}>
                <Ionicons name="star" size={9} color="#fff" />
              </View>
            ) : null}
          </View>
          <View style={styles.authorInfo}>
            <View style={styles.nameRow}>
              <ThemedText type="smallBold">{post.author.name}</ThemedText>
              {post.author.tag ? (
                <Text style={[styles.tag, { color: catColor, backgroundColor: `${catColor}1A` }]}>
                  {post.author.tag}
                </Text>
              ) : null}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {post.timeLabel}
            </ThemedText>
          </View>
        </Pressable>
        {!isSelf && showFollow ? <FollowChip name={post.author.name} /> : null}
      </View>

      {/* 正文 */}
      <ThemedText style={styles.content}>{post.content}</ThemedText>

      {/* 配图：真实图片优先，无 uri 时用演示占位 */}
      {post.image ? (
        post.image.uri ? (
          <Image source={{ uri: post.image.uri }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, { backgroundColor: post.image.color }]}>
            <Text style={styles.imageEmoji}>{post.image.emoji}</Text>
          </View>
        )
      ) : null}

      {/* 互动条 */}
      <View style={styles.actions}>
        <Pressable
          hitSlop={8}
          style={styles.action}
          onPress={() => onToggleLike?.(post.id)}>
          <Ionicons
            name={post.liked ? 'heart' : 'heart-outline'}
            size={19}
            color={post.liked ? colors.danger : colors.textSecondary}
          />
          <Text style={[styles.actionText, { color: post.liked ? colors.danger : colors.textSecondary }]}>
            {post.likes}
          </Text>
        </Pressable>
        <Pressable
          hitSlop={8}
          style={styles.action}
          onPress={() => router.push({ pathname: '/community/[id]', params: { id: post.id } })}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>{commentCount}</Text>
        </Pressable>
        <Pressable hitSlop={8} style={styles.action} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* 分享反馈 toast */}
      {toast ? (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={15} color="#fff" />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two + 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  authorMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  authorInfo: { flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 20 },
  friendBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: 2 },
  tag: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.chip, overflow: 'hidden' },
  content: { fontSize: 14, lineHeight: 22 },
  image: { height: 120, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center' },
  imageEmoji: { fontSize: 44 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, paddingTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 13, fontWeight: '600' },
  toast: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: Radius.chip,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 10,
  },
  toastText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

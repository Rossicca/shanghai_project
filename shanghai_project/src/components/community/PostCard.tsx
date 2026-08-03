import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CommunityPost } from '@/types/community';

const CATEGORY_COLORS: Record<CommunityPost['category'], string> = {
  打卡: '#2FA886',
  食谱: '#B07A26',
  提问: '#3E6FA8',
  晒变化: '#C0664C',
};

type Props = {
  post: CommunityPost;
  onToggleLike?: (id: string) => void;
};

/** 社区动态卡片 */
export function PostCard({ post, onToggleLike }: Props) {
  const colors = useTheme();
  const catColor = CATEGORY_COLORS[post.category];

  return (
    <Card style={styles.card}>
      {/* 作者行 */}
      <View style={styles.head}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Text style={styles.avatarEmoji}>{post.author.avatar}</Text>
        </View>
        <View style={{ flex: 1 }}>
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
      </View>

      {/* 正文 */}
      <ThemedText style={styles.content}>{post.content}</ThemedText>

      {/* 演示图片占位 */}
      {post.image ? (
        <View style={[styles.image, { backgroundColor: post.image.color }]}>
          <Text style={styles.imageEmoji}>{post.image.emoji}</Text>
        </View>
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
        <View style={styles.action}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.comments}</Text>
        </View>
        <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.two + 2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 20 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginBottom: 2 },
  tag: { fontSize: 10, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.chip, overflow: 'hidden' },
  content: { fontSize: 14, lineHeight: 22 },
  image: { height: 120, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center' },
  imageEmoji: { fontSize: 44 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, paddingTop: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 13, fontWeight: '600' },
});

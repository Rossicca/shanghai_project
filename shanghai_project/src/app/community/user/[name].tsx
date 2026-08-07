import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FollowChip } from '@/components/community/FollowChip';
import { PostCard } from '@/components/community/PostCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCommunityStore } from '@/store/communityStore';
import { isSelfAuthor } from '@/utils/community';

/** 用户主页：TA 的资料 + 全部动态 */
export default function CommunityUserProfile() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const colors = useTheme();
  const { posts, following, followers, toggleLike, load, loaded } = useCommunityStore();

  const authorPosts = posts.filter((p) => p.author.name === name);
  const author = authorPosts[0]?.author;
  // 加载完成且该作者不存在才算「不存在」
  const notFound = loaded && !!name && !posts.some((p) => p.author.name === name);
  const isSelf = isSelfAuthor(name ?? '');

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  if (!author && !notFound) {
    return <ThemedView style={styles.center} />;
  }
  if (notFound || !author) {
    return (
      <ThemedView style={styles.center}>
        <Ionicons name="person-remove-outline" size={40} color={colors.textSecondary} />
        <ThemedText type="subtitle" style={styles.centerText}>用户不存在或已离开</ThemedText>
      </ThemedView>
    );
  }

  const isFriend = !isSelf && following.includes(author.name) && followers.includes(author.name);
  const totalLikes = authorPosts.reduce((sum, p) => sum + p.likes, 0);

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: author.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* 用户头部 */}
        <Card style={styles.headerCard}>
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <Text style={styles.avatarEmoji}>{author.avatar}</Text>
            {/* 好友角标：绝对定位在头像右上，不改变排版 */}
            {isFriend ? (
              <View style={[styles.friendBadge, { backgroundColor: colors.warning }]}>
                <Ionicons name="star" size={10} color="#fff" />
              </View>
            ) : null}
          </View>
          <View style={styles.headerMain}>
            <View style={styles.nameRow}>
              <ThemedText type="subtitle">{author.name}</ThemedText>
            </View>
            {author.tag ? (
              <ThemedText type="small" themeColor="textSecondary">{author.tag}</ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              动态 {authorPosts.length} · 获赞 {totalLikes}
            </ThemedText>
          </View>
          {isSelf ? (
            <View style={[styles.meBadge, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.meBadgeText, { color: colors.textSecondary }]}>这是我</Text>
            </View>
          ) : (
            <FollowChip name={author.name} />
          )}
        </Card>

        {/* TA 的动态 */}
        <View style={styles.sectionHead}>
          <ThemedText type="smallBold">TA 的动态</ThemedText>
        </View>
        {authorPosts.length > 0 ? (
          authorPosts.map((post) => (
            <PostCard key={post.id} post={post} onToggleLike={toggleLike} showFollow={false} />
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons name="images-outline" size={30} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>TA 还没有发布动态</Text>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  centerText: { marginTop: Spacing.one },
  content: { padding: Spacing.three, gap: Spacing.three },
  headerCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 26 },
  friendBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMain: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  meBadge: { borderRadius: Radius.chip, paddingHorizontal: 10, paddingVertical: 5 },
  meBadgeText: { fontSize: 12, fontWeight: '700' },
  sectionHead: { marginTop: Spacing.one },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
});

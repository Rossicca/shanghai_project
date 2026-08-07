import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FollowChip } from '@/components/community/FollowChip';
import { PostCard } from '@/components/community/PostCard';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCommunityStore } from '@/store/communityStore';
import type { CommunityAuthor } from '@/types/community';
import { isSelfAuthor } from '@/utils/community';

/** 关注页签：推荐关注 + 关注的人的动态 */
export function FollowFeed() {
  const colors = useTheme();
  const { posts, following, followers, toggleLike } = useCommunityStore();

  // 从全部动态去重出社区作者（首次出现的资料为准）
  const authorMap = new Map<string, CommunityAuthor>();
  for (const p of posts) {
    if (!authorMap.has(p.author.name)) authorMap.set(p.author.name, p.author);
  }
  const authors = Array.from(authorMap.values());
  const recommend = authors.filter((a) => !following.includes(a.name) && !isSelfAuthor(a.name));

  const friendCount = following.filter((n) => followers.includes(n)).length;
  const followedPosts = posts.filter((p) => following.includes(p.author.name));

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* 概览 */}
      <View style={styles.summaryRow}>
        <ThemedText type="smallBold">关注动态</ThemedText>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
          已关注 {following.length} 人 · 好友 {friendCount}
        </Text>
      </View>

      {/* 推荐关注 */}
      {recommend.length > 0 ? (
        <Card style={styles.recommendCard}>
          <ThemedText type="smallBold">推荐关注</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            发现更多正在变好的朋友
          </ThemedText>
          {recommend.map((a) => (
            <View key={a.name} style={[styles.userRow, { borderColor: colors.border }]}>
              <Pressable
                style={styles.userMain}
                onPress={() =>
                  router.push({ pathname: '/community/user/[name]', params: { name: a.name } })
                }>
                <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
                  <Text style={styles.avatarEmoji}>{a.avatar}</Text>
                </View>
                <View style={styles.userInfo}>
                  <ThemedText type="smallBold">{a.name}</ThemedText>
                  {a.tag ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{a.tag}</Text>
                  ) : null}
                </View>
              </Pressable>
              <FollowChip name={a.name} />
            </View>
          ))}
        </Card>
      ) : null}

      {/* 关注动态流 */}
      {following.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={36} color={colors.backgroundSelected} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            还没有关注任何人，去上面发现新朋友吧
          </Text>
        </View>
      ) : followedPosts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="paper-plane-outline" size={36} color={colors.backgroundSelected} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            关注的人还没有新动态
          </Text>
        </View>
      ) : (
        followedPosts.map((post) => (
          <PostCard key={post.id} post={post} onToggleLike={toggleLike} />
        ))
      )}

      <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
        关注后在这里看 TA 的更新 · 演示数据
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.three },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recommendCard: { gap: Spacing.two },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  userMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  userInfo: { flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 20 },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  emptyText: { fontSize: 13 },
  tip: { textAlign: 'center', marginTop: Spacing.one },
});

import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchRecipeVideos } from '@/services/recipe';
import type { Recipe, RecipeVideoRecommendation } from '@/types/recipe';

function formatDuration(seconds: number) {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

const PLATFORM_ICONS = {
  bilibili: 'tv-outline',
  douyin: 'musical-notes-outline',
  xiaohongshu: 'book-outline',
  youtube: 'logo-youtube',
} as const;

export function RecipeVideoSection({ recipe }: { recipe: Recipe }) {
  const colors = useTheme();
  const [result, setResult] = useState<RecipeVideoRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchRecipeVideos(recipe)
      .then((data) => active && setResult(data))
      .catch((requestError) => {
        if (active) setError((requestError as Error).message || '制作视频加载失败');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [recipe]);

  async function openUrl(url: string) {
    setError('');
    try {
      await Linking.openURL(url);
    } catch {
      setError('无法打开视频链接，请稍后重试');
    }
  }

  const searchUrl = result?.searchUrl ||
    `https://search.bilibili.com/all?keyword=${encodeURIComponent(`${recipe.name} 做法 教程`)}`;

  return (
    <Card style={styles.section}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="play" size={18} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <ThemedText type="subtitle">跟着视频做</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            汇集多个视频平台，优先展示 AI 匹配结果
          </ThemedText>
        </View>
      </View>

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={colors.primary} />
          <ThemedText type="small" themeColor="textSecondary">正在寻找合适的制作教程…</ThemedText>
        </View>
      ) : null}

      {!loading && result?.videos.length ? (
        <View style={styles.list}>
          {result.videos.map((video) => (
            <Pressable
              key={video.id}
              accessibilityRole="link"
              accessibilityLabel={`打开视频：${video.title}`}
              onPress={() => openUrl(video.sourceUrl)}
              style={({ pressed }) => [styles.video, { opacity: pressed ? 0.72 : 1 }]}>
              <View style={[styles.thumbnail, { backgroundColor: colors.backgroundElement }]}>
                {video.coverUrl ? <Image source={{ uri: video.coverUrl }} style={styles.image} /> : null}
                <View style={styles.playBadge}>
                  <Ionicons name="play" size={16} color="#FFFFFF" />
                </View>
                {video.duration ? (
                  <Text style={styles.duration}>{formatDuration(video.duration)}</Text>
                ) : null}
              </View>
              <View style={styles.videoCopy}>
                <ThemedText type="smallBold" numberOfLines={2}>{video.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {video.author || 'B站创作者'}
                </ThemedText>
                <ThemedText type="small" themeColor="primary" numberOfLines={2}>
                  {video.reason}
                </ThemedText>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {!loading && !result?.videos.length ? (
        <View style={styles.status}>
          <Ionicons name="search-outline" size={24} color={colors.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            {result?.warning || error || '暂时没有找到合适的视频'}
          </ThemedText>
        </View>
      ) : null}

      {result?.warning && result.videos.length ? (
        <ThemedText type="small" themeColor="textSecondary">{result.warning}</ThemedText>
      ) : null}
      {error && result?.videos.length ? <ThemedText type="small" themeColor="danger">{error}</ThemedText> : null}

      {!loading ? (
        <View style={styles.moreSection}>
          <ThemedText type="smallBold">去更多平台搜索</ThemedText>
          <View style={styles.platforms}>
            {(result?.platformSearches || [
              { platform: 'bilibili' as const, label: 'B站', url: searchUrl, resultType: 'search' as const },
            ]).map((platform) => (
              <Pressable
                key={platform.platform}
                accessibilityRole="link"
                onPress={() => openUrl(platform.url)}
                style={({ pressed }) => [
                  styles.platform,
                  { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.7 : 1 },
                ]}>
                <Ionicons name={PLATFORM_ICONS[platform.platform]} size={17} color={colors.primary} />
                <ThemedText type="smallBold">{platform.label}</ThemedText>
                <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary">
        视频来自公开搜索结果，内容与版权归原作者及平台所有
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  headerIcon: { width: 40, height: 40, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0, gap: Spacing.one },
  status: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.four },
  centerText: { textAlign: 'center' },
  list: { gap: Spacing.two },
  video: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, minHeight: 92 },
  thumbnail: { width: 116, height: 72, borderRadius: Radius.button, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  playBadge: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center' },
  duration: { position: 'absolute', right: 5, bottom: 5, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, fontSize: 11, fontWeight: '700' },
  videoCopy: { flex: 1, minWidth: 0, gap: Spacing.one },
  moreSection: { gap: Spacing.two },
  platforms: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  platform: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: Radius.button },
});

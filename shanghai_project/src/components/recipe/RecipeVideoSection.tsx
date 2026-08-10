import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { recipeCoverUrl } from '@/services/media';
import { fetchRecipeVideos } from '@/services/recipe';
import type { Recipe, RecipeVideoRecommendation } from '@/types/recipe';
import { openExternalLink } from '@/utils/externalLink';

function formatDuration(seconds: number) {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

const PLATFORM_ICONS = {
  bilibili: 'tv-outline',
  douyin: 'musical-notes-outline',
} as const;

type RecipeVideoSectionProps = {
  recipe: Recipe;
  maxVideos?: number;
  title?: string;
  description?: string;
  hidePlatformSearches?: boolean;
};

export function RecipeVideoSection({
  recipe,
  maxVideos,
  title = '跟着视频做',
  description,
  hidePlatformSearches = false,
}: RecipeVideoSectionProps) {
  const colors = useTheme();
  const [fetchedResult, setFetchedResult] = useState<RecipeVideoRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const boundResult = useMemo<RecipeVideoRecommendation | null>(() => recipe.sourceVideo ? ({
    query: `${recipe.name} 做法 教程`,
    searchUrl: recipe.sourceVideo.sourceUrl,
    platformSearches: [],
    rankingMode: 'search',
    videos: [{
      ...recipe.sourceVideo,
      reason: `已核验：视频内容与“${recipe.name}”的制作步骤一致。`,
    }],
    warning: null,
  }) : null, [recipe.name, recipe.sourceVideo]);

  useEffect(() => {
    let active = true;
    if (recipe.sourceVideo) {
      return () => { active = false; };
    }
    fetchRecipeVideos(recipe)
      .then((data) => active && setFetchedResult(data))
      .catch((requestError) => {
        if (active) setError((requestError as Error).message || '制作视频加载失败');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [recipe]);

  const result = boundResult ?? fetchedResult;
  const isLoading = recipe.sourceVideo ? false : loading;

  async function openUrl(url: string) {
    setError('');
    try {
      await openExternalLink(url);
    } catch {
      setError('无法打开视频链接，请稍后重试');
    }
  }

  const searchUrl = result?.searchUrl ||
    `https://search.bilibili.com/all?keyword=${encodeURIComponent(`${recipe.name} 做法 教程`)}`;
  const videos = maxVideos ? result?.videos.slice(0, maxVideos) ?? [] : result?.videos ?? [];

  return (
    <Card style={styles.section}>
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="play" size={18} color={colors.primary} />
        </View>
        <View style={styles.headerCopy}>
          <ThemedText type="subtitle">{title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {description || (recipe.sourceVideo
              ? '首条是你选菜时参考的原教程，菜谱与视频保持一致'
              : '汇集多个视频平台，优先展示 AI 匹配结果')}
          </ThemedText>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.status}>
          <ActivityIndicator color={colors.primary} />
          <ThemedText type="small" themeColor="textSecondary">正在寻找合适的制作教程…</ThemedText>
        </View>
      ) : null}

      {!isLoading && videos.length ? (
        <View style={styles.list}>
          {videos.map((video) => (
            <Pressable
              key={video.id}
              accessibilityRole="link"
              accessibilityLabel={`打开视频：${video.title}`}
              onPress={() => openUrl(video.sourceUrl)}
              style={({ pressed }) => [styles.video, { opacity: pressed ? 0.72 : 1 }]}>
              <View style={[styles.thumbnail, { backgroundColor: colors.backgroundElement }]}>
                {recipeCoverUrl(video.coverUrl || recipe.sourceVideo?.coverUrl) ? <Image source={{ uri: recipeCoverUrl(video.coverUrl || recipe.sourceVideo?.coverUrl) }} style={styles.image} /> : (
                  <View style={styles.imageFallback}><Ionicons name="restaurant-outline" size={24} color={colors.primary} /></View>
                )}
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
                  {video.author || (video.platform === 'douyin' ? '抖音创作者' : 'B站创作者')}
                </ThemedText>
                <View style={styles.sourceRow}>
                  <Ionicons name={PLATFORM_ICONS[video.platform]} size={13} color={colors.textSecondary} />
                  <ThemedText type="small" themeColor="textSecondary">{video.platform === 'douyin' ? '抖音' : 'B站'}</ThemedText>
                </View>
                <ThemedText type="small" themeColor="primary" numberOfLines={2}>
                  {video.reason}
                </ThemedText>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {!isLoading && !videos.length ? (
        <View style={styles.status}>
          <Ionicons name="search-outline" size={24} color={colors.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            {result?.warning || error || '暂时没有找到合适的视频'}
          </ThemedText>
        </View>
      ) : null}

      {result?.warning && videos.length ? (
        <ThemedText type="small" themeColor="textSecondary">{result.warning}</ThemedText>
      ) : null}
      {error && videos.length ? <ThemedText type="small" themeColor="danger">{error}</ThemedText> : null}

      {!loading && !hidePlatformSearches ? (
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
        仅展示国内平台的公开教程索引，内容与版权归原作者及平台所有
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
  imageFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  playBadge: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.68)', alignItems: 'center', justifyContent: 'center' },
  duration: { position: 'absolute', right: 5, bottom: 5, color: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2, fontSize: 11, fontWeight: '700' },
  videoCopy: { flex: 1, minWidth: 0, gap: Spacing.one },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  moreSection: { gap: Spacing.two },
  platforms: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  platform: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: Radius.button },
});

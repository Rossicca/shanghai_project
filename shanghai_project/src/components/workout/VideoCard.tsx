import { useState } from 'react';

import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { API_BASE_URL } from '@/constants/config';
import { CATEGORY_ICON_NAMES } from '@/constants/fitness';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WorkoutVideo } from '@/types/workout';

type Props = {
  video: WorkoutVideo;
  onPress?: () => void;
};

function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`;
}

/** 视频卡片 */
export function VideoCard({ video, onPress }: Props) {
  const colors = useTheme();
  const [coverFailed, setCoverFailed] = useState(false);

  // 本地封面（/covers/）直接走静态目录；远程封面走 /api/cover 代理
  const coverUri = video.coverUrl
    ? video.coverUrl.startsWith('/covers/')
      ? `${API_BASE_URL}${video.coverUrl}`
      : `${API_BASE_URL}/api/cover?url=${encodeURIComponent(video.coverUrl)}`
    : null;
  const showCover = !!coverUri && !coverFailed;

  const isPortraitCover = video.coverOrientation === 'portrait';

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card} padded={false}>
        <View style={[styles.cover, { backgroundColor: video.coverColor }]}>
          {showCover ? (
            <View style={isPortraitCover ? styles.portraitCoverFrame : StyleSheet.absoluteFill}>
              <Image
                source={{ uri: coverUri! }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                onError={() => setCoverFailed(true)}
              />
            </View>
          ) : (
            <View style={styles.coverIcon}>
              <Ionicons
                name={(CATEGORY_ICON_NAMES[video.category] || 'barbell') as keyof typeof Ionicons.glyphMap}
                size={46}
                color="rgba(255,255,255,0.92)"
              />
            </View>
          )}
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{fmtDuration(video.duration)}</Text>
          </View>
        </View>
        <View style={styles.body}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {video.title}
          </ThemedText>
          <View style={styles.meta}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {video.coach} · {video.difficulty}
            </Text>
          </View>
          <View style={styles.bottom}>
            <View style={[styles.categoryTag, { backgroundColor: colors.successSoft }]}>
              <Text style={{ color: colors.success, fontSize: 11, fontWeight: '700' }}>{video.category}</Text>
            </View>
            <View style={styles.calRow}>
              <Ionicons name="flame" size={13} color={colors.danger} />
              <Text style={{ color: colors.danger, fontSize: 12, fontWeight: '800' }}>{video.calories} 千卡</Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  cover: { height: 120, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  portraitCoverFrame: { height: '100%', aspectRatio: 9 / 16, overflow: 'hidden' },
  coverIcon: { width: 76, height: 76, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' },
  durationBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body: { padding: Spacing.three, gap: Spacing.one },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.one },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.chip },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});

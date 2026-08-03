import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { CATEGORY_ICONS } from '@/constants/fitness';
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

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card} padded={false}>
        <View style={[styles.cover, { backgroundColor: video.coverColor }]}>
          <Text style={styles.coverEmoji}>{CATEGORY_ICONS[video.category] ?? '💪'}</Text>
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
  cover: { height: 120, alignItems: 'center', justifyContent: 'center' },
  coverEmoji: { fontSize: 52 },
  durationBadge: { position: 'absolute', bottom: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  body: { padding: Spacing.three, gap: Spacing.one },
  meta: { flexDirection: 'row', justifyContent: 'space-between' },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.one },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.chip },
  calRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { VideoPlayer } from '@/components/workout/VideoPlayer';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getToken } from '@/services/api';
import { fetchWorkoutDetail } from '@/services/workout';
import { useWorkoutStore } from '@/store/workoutStore';
import { openExternalLink } from '@/utils/externalLink';

export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const { selectedVideo, savedVideos, toggleSave, addHistory, selectVideo, error: storeError } = useWorkoutStore();
  const [playing, setPlaying] = useState(true);
  const [detailVideo, setDetailVideo] = useState(selectedVideo?.id === id ? selectedVideo : null);
  const [loading, setLoading] = useState(Boolean(id && selectedVideo?.id !== id && getToken()));
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!id || selectedVideo?.id === id || !getToken()) return;
    let active = true;
    fetchWorkoutDetail(id)
      .then((next) => {
        if (!active) return;
        setDetailVideo(next);
        selectVideo(next);
      })
      .catch((error) => active && setActionError((error as Error).message || '视频加载失败'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id, selectVideo, selectedVideo?.id]);

  const video = selectedVideo?.id === id ? selectedVideo : detailVideo?.id === id ? detailVideo : null;
  if (loading && !video) {
    return <ThemedView style={styles.container}><View style={styles.empty}><ActivityIndicator /></View></ThemedView>;
  }
  if (!video) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.empty}>
          <ThemedText>视频不存在，回“练”页挑选一个吧</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const saved = savedVideos.some((v) => v.id === video.id);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.player}>
        <VideoPlayer
          video={video}
          playing={playing}
          showControls
          onEnd={() => setPlaying(false)}
        />
        {/* 播放/暂停浮层 */}
        <View style={styles.playerOverlay}>
          <Button
            title={playing ? '暂停' : '继续跟练'}
            variant="secondary"
            icon={playing ? 'pause' : 'play'}
            onPress={() => setPlaying((p) => !p)}
            style={styles.playBtn}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <ThemedText type="title" style={styles.title}>
            {video.title}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            @{video.coach} · {video.difficulty} · {video.category}
          </ThemedText>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.metaItem, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <ThemedText type="small">{Math.round(video.duration / 60)} 分钟</ThemedText>
          </View>
          <View style={[styles.metaItem, { backgroundColor: colors.backgroundElement }]}>
            <Ionicons name="flame-outline" size={18} color={colors.danger} />
            <ThemedText type="small">约 {video.calories} 千卡</ThemedText>
          </View>
        </View>

        <Card style={styles.reasonCard}>
          <View style={styles.reasonHeader}>
            <Ionicons name="sparkles" size={18} color={colors.warning} />
            <ThemedText type="smallBold">为什么推荐给你</ThemedText>
          </View>
          <ThemedText type="small" style={styles.reasonText}>
            {video.reason}
          </ThemedText>
        </Card>

        {video.tags?.length ? (
          <View style={styles.tags}>
            {video.tags.map((t) => (
              <View key={t} style={[styles.tag, { backgroundColor: colors.successSoft }]}>
                <Text style={{ color: colors.success, fontSize: 12, fontWeight: '600' }}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Card>
          <ThemedText type="smallBold">跟练提示</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.tips}>
            · 运动前充分热身，根据自身情况量力而行。\n· 感到不适请立即停止。\n· 点击“去B站观看”跳转到真实视频页面。
          </ThemedText>
        </Card>

        <View style={styles.actions}>
          {video.sourceUrl ? (
            <Button
              title={video.platform === 'bilibili' ? '去B站观看' : '跳转观看'}
              variant="primary"
              icon="logo-youtube"
              onPress={() => {
                openExternalLink(video.sourceUrl!).catch(() => {
                  Alert.alert('提示', '无法打开链接');
                });
              }}
              style={{ flex: 1 }}
            />
          ) : null}
          {video.sourceUrl ? <View style={{ width: Spacing.two }} /> : null}
          <Button
            title={saved ? '已收藏' : '收藏'}
            variant="outline"
            icon={saved ? 'bookmark' : 'bookmark-outline'}
            onPress={() => toggleSave(video)}
          />
          <View style={{ width: Spacing.two }} />
          <Button
            title={playing ? '开始跟练' : '重新跟练'}
            icon="play"
            onPress={async () => {
              setActionError('');
              try {
                await addHistory(video);
                setPlaying(true);
              } catch (error) {
                setActionError((error as Error).message || '训练记录保存失败，请重试');
              }
            }}
            style={{ flex: 1 }}
          />
        </View>

        {actionError || storeError ? (
          <ThemedText type="small" themeColor="danger">{actionError || storeError}</ThemedText>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
          运动建议仅供参考，非医疗用途
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  player: { height: 320, position: 'relative' },
  playerOverlay: { position: 'absolute', top: 8, right: 12 },
  playBtn: { minWidth: 100 },
  content: { padding: Spacing.three, gap: Spacing.three },
  titleRow: { gap: Spacing.one },
  title: { fontSize: 24, lineHeight: 32 },
  metaRow: { flexDirection: 'row', gap: Spacing.two },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: 12 },
  reasonCard: { gap: Spacing.two },
  reasonHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  reasonText: { lineHeight: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  tips: { lineHeight: 20, marginTop: Spacing.two },
  actions: { flexDirection: 'row' },
  tip: { textAlign: 'center' },
});

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { VideoPlayer } from '@/components/workout/VideoPlayer';
import { Radius } from '@/constants/theme';
import type { WorkoutVideo } from '@/types/workout';
import { openExternalLink } from '@/utils/externalLink';

type Props = {
  video: WorkoutVideo;
  active: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
};

/** 抖音式信息流单条：全屏视频 + 右侧操作 + 底部信息 */
export function WorkoutFeedItem({ video, active, saved, onToggleSave, onOpen }: Props) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(128 + Math.abs(video.id.length * 37) % 800);

  function toggleLike() {
    setLiked((l) => !l);
    setLikes((n) => (liked ? n - 1 : n + 1));
  }

  async function share() {
    await Share.share({
      message: `${video.title}（${video.category} · ${video.duration} 秒）——来自 AI 健身推荐\n${video.sourceUrl || ''}`,
    });
  }

  async function handleOpen() {
    if (video.sourceUrl) {
      // Web：同步开新标签页，避免 await 后弹窗被拦 + 保持当前页面不被覆盖
      if (Platform.OS === 'web') {
        openExternalLink(video.sourceUrl);
        return;
      }
      const supported = await Linking.canOpenURL(video.sourceUrl).catch(() => false);
      if (supported) {
        await Linking.openURL(video.sourceUrl);
        return;
      }
      Alert.alert('视频暂时不可用', '已为你保留文字训练信息，可以继续查看。');
    }
    onOpen();
  }

  return (
    <View style={styles.item}>
      <VideoPlayer video={video} playing={active} />
      <View style={styles.gradient} />

      {/* 右侧操作栏 */}
      <View style={styles.actions}>
        <Pressable onPress={toggleLike} style={styles.actionBtn}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={34} color={liked ? '#FF4D6D' : '#fff'} />
          <Text style={styles.actionText}>{likes >= 1000 ? `${(likes / 1000).toFixed(1)}k` : likes}</Text>
        </Pressable>
        <Pressable onPress={onToggleSave} style={styles.actionBtn}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={32} color={saved ? '#FFC94D' : '#fff'} />
          <Text style={styles.actionText}>{saved ? '已存' : '收藏'}</Text>
        </Pressable>
        <Pressable onPress={share} style={styles.actionBtn}>
          <Ionicons name="share-social" size={30} color="#fff" />
          <Text style={styles.actionText}>分享</Text>
        </Pressable>
      </View>

      {/* 底部信息 */}
      <View style={styles.info}>
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
            <Text style={styles.tagText}>{video.category}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
            <Text style={styles.tagText}>{video.difficulty}</Text>
          </View>
        </View>
        <Pressable onPress={handleOpen}>
          <Text style={styles.title} numberOfLines={2}>
            {video.title}
          </Text>
          <Text style={styles.coach}>@{video.coach}</Text>
          {video.platform ? (
            <Text style={styles.platformTag}>
              {video.platform === 'bilibili' ? '📺 B站' : '▶️ YouTube'}
            </Text>
          ) : null}
          <View style={styles.reason}>
            <Ionicons name="sparkles" size={14} color="#FFC94D" />
            <Text style={styles.reasonText} numberOfLines={2}>
              {video.reason}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, position: 'relative' },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.15)' },
  actions: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    gap: 22,
    alignItems: 'center',
  },
  actionBtn: { alignItems: 'center', gap: 2 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  info: { position: 'absolute', left: 16, right: 76, bottom: 60 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tag: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.chip },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 24 },
  coach: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  platformTag: { color: '#FB7299', fontSize: 12, fontWeight: '700', marginTop: 2 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 8 },
  reasonText: { color: 'rgba(255,255,255,0.95)', fontSize: 12, lineHeight: 17, flex: 1 },
});

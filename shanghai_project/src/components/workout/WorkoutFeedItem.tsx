import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { VideoPlayer } from '@/components/workout/VideoPlayer';
import { Radius } from '@/constants/theme';
import type { WorkoutVideo } from '@/types/workout';

type Props = {
  video: WorkoutVideo;
  active: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
};

export function WorkoutFeedItem({ video, active, saved, onToggleSave, onOpen }: Props) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(128 + Math.abs(video.id.length * 37) % 800);

  function toggleLike() {
    setLiked((l) => !l);
    setLikes((n) => (liked ? n - 1 : n + 1));
  }

  async function share() {
    await Share.share({
      message: `${video.title}（${video.category} · ${video.duration} 秒）\n${video.sourceUrl || ''}`,
    });
  }

  async function handleOpen() {
    if (video.sourceUrl) {
      const supported = await Linking.canOpenURL(video.sourceUrl).catch(() => false);
      if (supported) { await Linking.openURL(video.sourceUrl); return; }
      Alert.alert('视频暂时不可用', '已为你保留文字训练信息。');
    }
    onOpen();
  }

  const minutes = Math.floor(video.duration / 60);
  const seconds = String(video.duration % 60).padStart(2, '0');

  return (
    <View style={styles.item}>
      <VideoPlayer video={video} playing={active} />

      {/* 底部渐变：仅底部 40% 渐变，保证文字可读 */}
      <View style={styles.bottomFade} />

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
      <Pressable onPress={handleOpen} style={styles.info}>
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{video.category}</Text>
          </View>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{video.difficulty}</Text>
          </View>
          <View style={styles.durationTag}>
            <Ionicons name="time-outline" size={11} color="#fff" />
            <Text style={styles.tagText}>{minutes}:{seconds}</Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
        <View style={styles.coachRow}>
          <Text style={styles.coach}>@{video.coach}</Text>
          {video.platform ? (
            <Text style={styles.platformTag}>{video.platform === 'bilibili' ? 'B站' : 'YouTube'}</Text>
          ) : null}
        </View>
        <View style={styles.reason}>
          <Ionicons name="sparkles" size={12} color="#FFC94D" />
          <Text style={styles.reasonText} numberOfLines={1}>{video.reason}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flex: 1, position: 'relative', backgroundColor: '#000' },

  // 底部渐变（仅底部 45% 从透明到半黑）
  bottomFade: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%',
    // RN 不支持 CSS linear-gradient，用两层 View 模拟
  },

  actions: {
    position: 'absolute', right: 14, bottom: 130, gap: 24, alignItems: 'center',
    zIndex: 10,
  },
  actionBtn: { alignItems: 'center', gap: 2 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },

  info: { position: 'absolute', left: 18, right: 80, bottom: 36, zIndex: 10 },
  tagRow: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  tag: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.chip },
  durationTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.chip },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },
  title: { color: '#fff', fontSize: 19, fontWeight: '800', lineHeight: 26, marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coach: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },
  platformTag: { color: '#FB7299', fontSize: 12, fontWeight: '700' },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  reasonText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, flex: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },
});

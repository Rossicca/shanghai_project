import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { VideoPlayer } from '@/components/workout/VideoPlayer';
import type { WorkoutVideo } from '@/types/workout';

type Props = {
  video: WorkoutVideo;
  active: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
};

const SHADOW = { textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } };

export function WorkoutFeedItem({ video, active, saved, onToggleSave, onOpen }: Props) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(128 + Math.abs(video.id.length * 37) % 800);

  function toggleLike() { setLiked((l) => !l); setLikes((n) => (liked ? n - 1 : n + 1)); }
  async function share() { await Share.share({ message: `${video.title}\n${video.sourceUrl || ''}` }); }
  async function handleOpen() {
    if (video.sourceUrl) {
      const ok = await Linking.canOpenURL(video.sourceUrl).catch(() => false);
      if (ok) { await Linking.openURL(video.sourceUrl); return; }
      Alert.alert('视频暂不可用', '已保留文字信息');
    }
    onOpen();
  }

  const mins = Math.floor(video.duration / 60);
  const secs = String(video.duration % 60).padStart(2, '0');

  return (
    <View style={styles.wrapper}>
      <VideoPlayer video={video} playing={active} />

      {/* 底部单层柔和渐变 —— 从透明到半黑，只在最底部60% */}
      <View style={styles.fade} />

      {/* 右侧操作 */}
      <View style={styles.actions}>
        <Pressable onPress={toggleLike} style={styles.btn}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={32} color={liked ? '#FF4D6D' : '#fff'} />
          <Text style={styles.btnLabel}>{likes >= 1000 ? `${(likes / 1000).toFixed(1)}k` : likes}</Text>
        </Pressable>
        <Pressable onPress={onToggleSave} style={styles.btn}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={30} color={saved ? '#FFC94D' : '#fff'} />
          <Text style={styles.btnLabel}>{saved ? '已存' : '收藏'}</Text>
        </Pressable>
        <Pressable onPress={share} style={styles.btn}>
          <Ionicons name="share-social" size={28} color="#fff" />
          <Text style={styles.btnLabel}>分享</Text>
        </Pressable>
      </View>

      {/* 底部信息 */}
      <Pressable onPress={handleOpen} style={styles.info}>
        {/* 标签行 */}
        <View style={styles.tags}>
          <View style={styles.tag}><Text style={styles.tagT}>{video.category}</Text></View>
          <View style={styles.tag}><Text style={styles.tagT}>{video.difficulty}</Text></View>
          <View style={styles.tag}><Text style={styles.tagT}>{mins}:{secs}</Text></View>
        </View>
        {/* 标题 */}
        <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
        {/* 作者 + 来源 */}
        <Text style={styles.coach}>
          @{video.coach}
          {video.platform === 'bilibili' ? '  ·  B站' : video.platform ? `  ·  ${video.platform}` : ''}
        </Text>
        {/* 推荐理由 */}
        <View style={styles.reasonRow}>
          <Ionicons name="sparkles" size={12} color="#FFC94D" />
          <Text style={styles.reason} numberOfLines={1}>{video.reason}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#000' },

  // 底部渐变：从底到顶 0→50% 渐暗
  fade: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%',
  },

  // 右侧操作栏 — 与底部文字对齐
  actions: { position: 'absolute', right: 12, bottom: 80, gap: 22, alignItems: 'center' },
  btn: { alignItems: 'center', gap: 2 },
  btnLabel: { color: '#fff', fontSize: 11, fontWeight: '600', ...SHADOW },

  // 底部信息 — 紧贴导航栏上方
  info: { position: 'absolute', left: 16, right: 72, bottom: 52 },

  tags: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  tag: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  tagT: { color: '#fff', fontSize: 11, fontWeight: '600', ...SHADOW },

  title: { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 5, ...SHADOW },
  coach: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 5, ...SHADOW },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  reason: { color: 'rgba(255,255,255,0.7)', fontSize: 12, flex: 1, ...SHADOW },
});

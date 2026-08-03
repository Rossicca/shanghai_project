import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { VideoPlayer } from '@/components/workout/VideoPlayer';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { WorkoutVideo } from '@/types/workout';

type Props = {
  video: WorkoutVideo;
  active: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
};

/** 抖音式信息流单条：全屏视频 + 右侧操作 + 底部信息 */
export function WorkoutFeedItem({ video, active, saved, onToggleSave, onOpen }: Props) {
  const colors = useTheme();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(128 + Math.abs(video.id.length * 37) % 800);

  function toggleLike() {
    setLiked((l) => !l);
    setLikes((n) => (liked ? n - 1 : n + 1));
  }

  async function share() {
    await Share.share({
      message: `${video.title}（${video.category} · ${video.duration} 秒）——来自 AI 健身推荐`,
    });
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
        <Pressable onPress={onOpen}>
          <Text style={styles.title} numberOfLines={2}>
            {video.title}
          </Text>
          <Text style={styles.coach}>@{video.coach}</Text>
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
  reason: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 8 },
  reasonText: { color: 'rgba(255,255,255,0.95)', fontSize: 12, lineHeight: 17, flex: 1 },
});

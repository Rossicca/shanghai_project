import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import { CATEGORY_ICONS } from '@/constants/fitness';
import type { WorkoutVideo } from '@/types/workout';

type Props = {
  video: WorkoutVideo;
  playing?: boolean;
  onEnd?: () => void;
  showControls?: boolean;
};

/**
 * 跟练视频播放器：
 * - 有真实 source → expo-video 播放
 * - 否则显示封面卡片（渐变色背景 + 分类 + 播放按钮 + 时长/难度/平台标签）
 */
export function VideoPlayer({ video, playing = true, onEnd, showControls }: Props) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (playing) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        ])
      );
      loop.start();
      timer.current = setInterval(() => {
        setProgress((p) => {
          const next = p + 1;
          if (next >= 100) {
            if (timer.current) clearInterval(timer.current);
            onEnd?.();
            return 100;
          }
          return next;
        });
      }, video.duration * 10);
    }
    return () => {
      loop?.stop();
      pulse.setValue(1);
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, video.duration, onEnd, pulse]);

  const minutes = Math.floor(video.duration / 60);
  const seconds = String(video.duration % 60).padStart(2, '0');
  const categoryEmoji = CATEGORY_ICONS[video.category] ?? '💪';

  function openExternal() {
    if (!video.sourceUrl) return;
    Linking.canOpenURL(video.sourceUrl)
      .then((supported) => supported ? Linking.openURL(video.sourceUrl!) : Promise.reject())
      .catch(() => Alert.alert('视频暂时不可用', '文字动作说明仍可正常使用。'));
  }

  // 真实视频源 → 直接播放
  if (video.source) {
    return <RealVideo source={video.source} playing={playing} />;
  }

  // 封面卡片
  return (
    <View style={[styles.cover, { backgroundColor: video.coverColor }]}>
      {/* B站真实封面图 */}
      {video.coverUrl ? (
        <Image
          source={{ uri: video.coverUrl }}
          style={styles.coverImage}
          contentFit="cover"
          transition={300}
        />
      ) : null}
      {/* 光影叠加层 — 模拟渐变 */}
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.12)' }]} />
      <View style={[styles.overlayTop, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />

      {/* 左上角：分类 */}
      <View style={styles.badgeTop}>
        <Text style={styles.badgeEmoji}>{categoryEmoji}</Text>
        <Text style={styles.badgeLabel}>{video.category}</Text>
      </View>

      {/* 中间：播放按钮 */}
      <Animated.View style={[styles.playWrap, { transform: [{ scale: pulse }] }]}>
        <View style={styles.playCircle}>
          <Ionicons name="play" size={30} color="#fff" style={{ marginLeft: 4 }} />
        </View>
      </Animated.View>

      {/* 底部信息条 */}
      <View style={styles.coverFooter}>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="time-outline" size={12} color="#fff" />
            <Text style={styles.metaText}>{minutes}:{seconds}</Text>
          </View>
          <View style={[styles.metaChip, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
            <Text style={styles.metaText}>{video.difficulty}</Text>
          </View>
          {video.platform === 'bilibili' ? (
            <View style={[styles.metaChip, { backgroundColor: '#FB7299' }]}>
              <Text style={styles.metaText}>B站</Text>
            </View>
          ) : video.platform ? (
            <View style={[styles.metaChip, { backgroundColor: '#FF0000' }]}>
              <Text style={styles.metaText}>YouTube</Text>
            </View>
          ) : null}
        </View>

        {/* 进度条 */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* 跳转按钮 */}
      {video.sourceUrl ? (
        <Pressable style={styles.jumpBtn} onPress={openExternal}>
          <Ionicons name="play-circle" size={18} color="#fff" />
          <Text style={styles.jumpText}>观看完整视频</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function RealVideo({ source, playing }: { source: string; playing: boolean }) {
  const player = useVideoPlayer(source, (p) => { p.loop = false; });
  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" />;
}

const styles = StyleSheet.create({
  cover: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' } as any,
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  overlayTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '40%',
    borderBottomLeftRadius: 999, borderBottomRightRadius: 999,
  },

  badgeTop: {
    position: 'absolute', top: 44, left: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  badgeEmoji: { fontSize: 15 },
  badgeLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },

  playWrap: {},
  playCircle: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.5)',
  },

  coverFooter: {
    position: 'absolute', bottom: 88, left: 20, right: 20, gap: 10,
  },
  metaRow: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 12,
  },
  metaText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  progressTrack: {
    height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#fff' },

  jumpBtn: {
    position: 'absolute', bottom: 44, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FB7299', paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 22,
  },
  jumpText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

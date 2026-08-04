import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

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
 * - 有 coverUrl → 展示B站真实封面图 + 播放按钮
 * - 纯演示 → 色块背景 + 播放按钮
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

  // 封面 + 播放按钮
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
      ) : (
        /* 无封面时：纯色背景 + 分类文字 */
        <View style={styles.noCover}>
          <Text style={styles.noCoverText}>{video.category}</Text>
        </View>
      )}

      {/* 底部暗色渐变 —— 仅底部20%，保证右侧操作栏的白色图标可见 */}
      <View style={styles.bottomGradient} />

      {/* 进度条 */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* 中间播放按钮 */}
      <Animated.View style={[styles.playWrap, { transform: [{ scale: pulse }] }]}>
        <View style={styles.playCircle}>
          <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 3 }} />
        </View>
      </Animated.View>

      {/* 跳转B站按钮 */}
      {video.sourceUrl ? (
        <Pressable style={styles.jumpBtn} onPress={openExternal}>
          <Ionicons name="logo-youtube" size={18} color="#fff" />
          <Text style={styles.jumpText}>
            {video.platform === 'bilibili' ? '在B站观看' : '观看'}
          </Text>
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
  cover: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' } as any,
  noCover: {
    ...StyleSheet.absoluteFill as any,
    alignItems: 'center', justifyContent: 'center',
    opacity: 0.6,
  },
  noCoverText: { color: '#fff', fontSize: 48, fontWeight: '800', opacity: 0.5 },

  // 底部渐变
  bottomGradient: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '30%',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // 进度条
  progressTrack: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressFill: { height: '100%', backgroundColor: 'rgba(255,255,255,0.7)' },

  // 播放按钮
  playWrap: { zIndex: 5 },
  playCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.6)',
  },

  // 跳转按钮
  jumpBtn: {
    position: 'absolute', bottom: 20, right: 18,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FB7299', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, zIndex: 10,
  },
  jumpText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});

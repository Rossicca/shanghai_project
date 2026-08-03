import { Ionicons } from '@expo/vector-icons';
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
 * - 有真实 source 用 expo-video 播放
 * - 无 source 但有 sourceUrl 显示"去B站观看"按钮
 * - 无 source（纯演示数据）用"示范动画"替代：脉冲图标 + 进度条模拟跟练
 * 动画用 RN 内置 Animated（不用 reanimated，避免 Expo Go 原生崩溃问题）。
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
          Animated.timing(pulse, { toValue: 1.15, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== 'web' }),
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

  const remain = Math.max(0, Math.round((video.duration * (100 - progress)) / 100));

  function openExternal() {
    if (!video.sourceUrl) return;
    if (Platform.OS === 'web') {
      window.open(video.sourceUrl, '_blank');
    } else {
      Linking.openURL(video.sourceUrl).catch(() => {
        Alert.alert('提示', '无法打开链接');
      });
    }
  }

  // 真实视频
  if (video.source) {
    return <RealVideo source={video.source} playing={playing} />;
  }

  // 有外部链接（B站/YouTube）的推荐视频
  if (video.sourceUrl) {
    return (
      <View style={[styles.container, { backgroundColor: video.coverColor }]}>
        <Animated.View style={[styles.emojiWrap, { transform: [{ scale: pulse }] }]}>
          <Text style={styles.emoji}>{CATEGORY_ICONS[video.category] ?? '💪'}</Text>
        </Animated.View>
        <View style={styles.bottomInfo}>
          <Text style={styles.playingText}>
            {playing ? '🔥 跟练中' : '⏸ 已暂停'} · {video.category}
          </Text>
          {showControls ? (
            <Text style={styles.remainText}>还剩 {Math.floor(remain / 60)}:{String(remain % 60).padStart(2, '0')}</Text>
          ) : null}
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        {showControls ? (
          <View style={styles.tip}>
            <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.tipText}>演示视频：以示范动画代替真实跟练视频</Text>
          </View>
        ) : null}
        <Pressable style={styles.watchBtn} onPress={openExternal}>
          <Ionicons name="logo-youtube" size={20} color="#fff" />
          <Text style={styles.watchBtnText}>
            {video.platform === 'bilibili' ? '去B站观看 ›' : '跳转观看 ›'}
          </Text>
        </Pressable>
      </View>
    );
  }

  // 纯演示动画（无任何链接）
  return (
    <View style={[styles.container, { backgroundColor: video.coverColor }]}>
      <Animated.View style={[styles.emojiWrap, { transform: [{ scale: pulse }] }]}>
        <Text style={styles.emoji}>{CATEGORY_ICONS[video.category] ?? '💪'}</Text>
      </Animated.View>
      <View style={styles.bottomInfo}>
        <Text style={styles.playingText}>
          {playing ? '🔥 跟练中' : '⏸ 已暂停'} · {video.category}
        </Text>
        {showControls ? (
          <Text style={styles.remainText}>还剩 {Math.floor(remain / 60)}:{String(remain % 60).padStart(2, '0')}</Text>
        ) : null}
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      {showControls ? (
        <View style={styles.tip}>
          <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.85)" />
          <Text style={styles.tipText}>演示视频：以示范动画代替真实跟练视频</Text>
        </View>
      ) : null}
    </View>
  );
}

function RealVideo({ source, playing }: { source: string; playing: boolean }) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
  });
  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" />;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emojiWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 72 },
  bottomInfo: { position: 'absolute', bottom: 44, alignItems: 'center', gap: 4 },
  playingText: { color: '#fff', fontWeight: '800', fontSize: 16, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  remainText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '700' },
  progressTrack: { position: 'absolute', top: 6, left: 8, right: 8, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff' },
  tip: { position: 'absolute', bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tipText: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  watchBtn: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FB7299',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  watchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

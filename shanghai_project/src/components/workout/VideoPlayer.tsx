import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import type { WorkoutVideo } from '@/types/workout';

type Props = { video: WorkoutVideo; playing?: boolean; onEnd?: () => void; showControls?: boolean };

export function VideoPlayer({ video, playing = true, onEnd, showControls }: Props) {
  const [pulse] = useState(() => new Animated.Value(1));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (playing && !video.source) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.05, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        ])
      );
      loop.start();
      if (showControls && onEnd) {
        timer.current = setInterval(() => {
          onEnd();
        }, video.duration * 1000);
      }
    }
    return () => {
      loop?.stop(); pulse.setValue(1);
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, video.source, video.duration, pulse, showControls, onEnd]);

  function openExternal() {
    if (!video.sourceUrl) return;
    Linking.canOpenURL(video.sourceUrl)
      .then((ok) => ok ? Linking.openURL(video.sourceUrl!) : Promise.reject())
      .catch(() => Alert.alert('暂不可用'));
  }

  // 真实视频源
  if (video.source) {
    return <RealVideo source={video.source} playing={playing} />;
  }

  // 封面
  return (
    <Pressable onPress={openExternal} style={[styles.fill, { backgroundColor: video.coverColor || '#1a1a2e' }]}>
      {/* B站封面图 —— contain 完整显示，不裁切 */}
      {video.coverUrl ? (
        <Image source={{ uri: video.coverUrl }} style={styles.img} contentFit="contain" transition={300} />
      ) : null}

      {/* 播放按钮 */}
      <Animated.View style={[styles.playWrap, { transform: [{ scale: pulse }] }]}>
        <View style={styles.playBtn}>
          <Ionicons name="play" size={26} color="#fff" style={{ marginLeft: 3 }} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function RealVideo({ source, playing }: { source: string; playing: boolean }) {
  const player = useVideoPlayer(source, (p) => { p.loop = false; });
  useEffect(() => { playing ? player.play() : player.pause(); }, [playing, player]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" />;
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' } as any,
  playWrap: {},
  playBtn: {
    width: 66, height: 66, borderRadius: 33,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
});

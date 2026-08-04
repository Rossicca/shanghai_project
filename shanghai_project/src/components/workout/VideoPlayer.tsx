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
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);

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
        timer.current = setInterval(() => onEnd(), video.duration * 1000);
      }
    }
    return () => { loop?.stop(); pulse.setValue(1); if (timer.current) clearInterval(timer.current); };
  }, [playing, video.source, video.duration, pulse, showControls, onEnd]);

  function openExternal() {
    if (!video.sourceUrl) return;
    Linking.canOpenURL(video.sourceUrl)
      .then((ok) => ok ? Linking.openURL(video.sourceUrl!) : Promise.reject())
      .catch(() => Alert.alert('暂不可用'));
  }

  // 预加载封面图获取尺寸，判断横/竖屏
  useEffect(() => {
    if (!video.coverUrl) return;
    if (Platform.OS === 'web') {
      const img = new window.Image();
      img.onload = () => setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = video.coverUrl;
    } else {
      const { Image: RNImage } = require('react-native');
      RNImage.getSize(video.coverUrl,
        (w: number, h: number) => setImgDims({ w, h }),
        () => {}
      );
    }
  }, [video.coverUrl]);

  // 判断封面是横屏(宽>高)还是竖屏
  const isLandscape = imgDims ? imgDims.w > imgDims.h : true; // B站默认横屏

  if (video.source) {
    return <RealVideo source={video.source} playing={playing} />;
  }

  return (
    <Pressable onPress={openExternal} style={[styles.fill, { backgroundColor: video.coverColor || '#0f0f1a' }]}>
      {video.coverUrl ? (
        <Image
          source={{ uri: video.coverUrl }}
          style={styles.fill}
          contentFit={isLandscape ? 'contain' : 'cover'}
          transition={200}
        />
      ) : null}

      {/* 播放按钮 */}
      <Animated.View style={[styles.playWrap, { transform: [{ scale: pulse }] }]}>
        <View style={styles.playBtn}>
          <Ionicons name="play" size={24} color="#fff" style={{ marginLeft: 3 }} />
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
  playWrap: { zIndex: 5 },
  playBtn: {
    width: 62, height: 62, borderRadius: 31,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
  },
});

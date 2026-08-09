import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import { CATEGORY_ICON_NAMES } from '@/constants/fitness';
import { API_BASE_URL } from '@/constants/config';
import type { WorkoutVideo } from '@/types/workout';
import { openExternalLink } from '@/utils/externalLink';

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
  const [measuredCover, setMeasuredCover] = useState<{
    uri: string;
    aspect: number | null;
    failed: boolean;
  } | null>(null);
  const [failedPrimaryCover, setFailedPrimaryCover] = useState<string | null>(null);
  const orientation = video.coverOrientation || (video.platform === 'douyin' ? 'portrait' : 'landscape');
  const coverMeta = `title=${encodeURIComponent(video.title)}&category=${encodeURIComponent(video.category)}&platform=${encodeURIComponent(video.platform === 'douyin' ? '抖音精选' : 'B站精选')}&orientation=${orientation}`;
  const fallbackCoverUri = `${API_BASE_URL}/api/video-cover?${coverMeta}`;
  const primaryCoverUri = video.coverUrl
    ? video.coverUrl.startsWith('/')
      ? `${API_BASE_URL}${video.coverUrl}`
      : `${API_BASE_URL}/api/cover?url=${encodeURIComponent(video.coverUrl)}&${coverMeta}`
    : null;
  const coverUri = primaryCoverUri && failedPrimaryCover !== primaryCoverUri
    ? primaryCoverUri
    : fallbackCoverUri;
  const coverAspect = measuredCover?.uri === coverUri ? measuredCover.aspect : null;
  const coverFailed = measuredCover?.uri === coverUri ? measuredCover.failed : false;

  useEffect(() => {
    if (!coverUri) return;
    let active = true;
    Image.getSize(
      coverUri,
      (width, height) => {
        if (active && width > 0 && height > 0) {
          setMeasuredCover({ uri: coverUri, aspect: width / height, failed: false });
        }
      },
      () => {
        if (!active) return;
        if (coverUri === primaryCoverUri) setFailedPrimaryCover(primaryCoverUri);
        else setMeasuredCover({ uri: coverUri, aspect: null, failed: true });
      }
    );
    return () => { active = false; };
  }, [coverUri, primaryCoverUri]);

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
    // Web：同步开新标签页（保持当前页不被覆盖 + 避免 await 后弹窗被拦）
    if (Platform.OS === 'web') {
      openExternalLink(video.sourceUrl);
      return;
    }
    Linking.canOpenURL(video.sourceUrl)
      .then((supported) => supported ? Linking.openURL(video.sourceUrl!) : Promise.reject())
      .catch(() => Alert.alert('视频暂时不可用', '文字动作说明仍可正常使用。'));
  }

  // 真实视频
  if (video.source) {
    return <RealVideo source={video.source} playing={playing} />;
  }

  // 有外部链接（B站/抖音/YouTube）的推荐视频
  if (video.sourceUrl) {
    // 封面分两类：
    // - 本地封面（抖音 seed 下载到 server/data/covers，coverUrl 以 /covers/ 开头）→ 直接走静态目录
    // - 远程封面（B站图床按 Referer 防盗链）→ 走后端 /api/cover 代理，绕开直连 403
    const showCover = !!coverUri && !coverFailed;
    const isLandscape = coverAspect != null
      ? coverAspect > 1.15
      : video.coverOrientation === 'landscape' || (video.platform !== 'douyin' && video.coverOrientation !== 'portrait');
    return (
      <View style={[styles.container, { backgroundColor: video.coverColor }]}>
        {showCover && isLandscape ? (
          <>
            <Image source={{ uri: coverUri! }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={22} />
            <View style={styles.landscapeBackdrop} />
            <Image
              source={{ uri: coverUri! }}
              style={[styles.landscapeCover, { aspectRatio: coverAspect || 16 / 9 }]}
              resizeMode="contain"
              onError={() => coverUri === primaryCoverUri
                ? setFailedPrimaryCover(primaryCoverUri)
                : setMeasuredCover({ uri: coverUri, aspect: coverAspect, failed: true })}
            />
          </>
        ) : showCover ? (
          <Image
            source={{ uri: coverUri! }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            onError={() => coverUri === primaryCoverUri
              ? setFailedPrimaryCover(primaryCoverUri)
              : setMeasuredCover({ uri: coverUri, aspect: coverAspect, failed: true })}
          />
        ) : (
          <Animated.View style={[styles.emojiWrap, { transform: [{ scale: pulse }] }]}>
            <Ionicons
              name={(CATEGORY_ICON_NAMES[video.category] || 'barbell') as keyof typeof Ionicons.glyphMap}
              size={70}
              color="rgba(255,255,255,0.94)"
            />
          </Animated.View>
        )}
        {showCover ? <View pointerEvents="none" style={styles.coverShade} /> : null}
        {showControls ? (
          <View style={styles.bottomInfo}>
            <View style={styles.playingRow}>
              <Ionicons name={playing ? 'flame' : 'pause-circle'} size={17} color="#FFFFFF" />
              <Text style={styles.playingText}>{playing ? '跟练中' : '已暂停'} · {video.category}</Text>
            </View>
            <Text style={styles.remainText}>还剩 {Math.floor(remain / 60)}:{String(remain % 60).padStart(2, '0')}</Text>
          </View>
        ) : null}
        {showControls ? <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View> : null}
        {showControls ? (
          <View style={styles.tip}>
            <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={styles.tipText}>演示视频：以示范动画代替真实跟练视频</Text>
          </View>
        ) : null}
        {showControls ? (
          <Pressable style={[styles.watchBtn, video.platform === 'douyin' && styles.douyinWatchBtn]} onPress={openExternal}>
            <Ionicons name={video.platform === 'douyin' ? 'musical-notes' : 'logo-youtube'} size={20} color="#fff" />
            <Text style={styles.watchBtnText}>
              {video.platform === 'bilibili' ? '去B站观看 ›' : video.platform === 'douyin' ? '去抖音观看 ›' : '跳转观看 ›'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`打开${video.title}`}
            accessibilityHint="前往视频原平台观看"
            style={({ pressed }) => [styles.feedPlayButton, pressed && styles.feedPlayButtonPressed]}
            onPress={openExternal}>
            <Ionicons name="play" size={24} color="#fff" />
          </Pressable>
        )}
      </View>
    );
  }

  // 纯演示动画（无任何链接）
  return (
    <View style={[styles.container, { backgroundColor: video.coverColor }]}>
      <Animated.View style={[styles.emojiWrap, { transform: [{ scale: pulse }] }]}>
        <Ionicons
          name={(CATEGORY_ICON_NAMES[video.category] || 'barbell') as keyof typeof Ionicons.glyphMap}
          size={70}
          color="rgba(255,255,255,0.94)"
        />
      </Animated.View>
      <View style={styles.bottomInfo}>
        <View style={styles.playingRow}>
          <Ionicons name={playing ? 'flame' : 'pause-circle'} size={17} color="#FFFFFF" />
          <Text style={styles.playingText}>{playing ? '跟练中' : '已暂停'} · {video.category}</Text>
        </View>
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
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  emojiWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  coverShade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  landscapeBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  landscapeCover: { width: '100%', maxHeight: '72%' },
  bottomInfo: { position: 'absolute', bottom: 44, alignItems: 'center', gap: 4 },
  playingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
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
  douyinWatchBtn: { backgroundColor: '#161823' },
  feedPlayButton: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(0,0,0,0.42)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.52)', alignItems: 'center', justifyContent: 'center', paddingLeft: 3, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  feedPlayButtonPressed: { transform: [{ scale: 0.94 }], opacity: 0.88 },
});

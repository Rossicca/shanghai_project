import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PostCard } from '@/components/community/PostCard';
import { PostComposer } from '@/components/community/PostComposer';
import { TimelineWall } from '@/components/community/TimelineWall';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCommunityStore } from '@/store/communityStore';
import { useUserStore } from '@/store/userStore';
import type { TimelineEntry } from '@/types/community';

type TabKey = 'feed' | 'wall';

const DEMO_COLORS = ['#FDF0DC', '#E7F0FA', '#E4F3ED', '#FCE9E4', '#F0EDFA'];
const DEMO_EMOJIS = ['🌱', '🏃', '🧘', '💪', '✨', '🏋️', '🥗'];

export default function CommunityTab() {
  const colors = useTheme();
  const { posts, photos, load, addPost, toggleLike, addPhoto, removePhoto } =
    useCommunityStore();
  const { bodyData } = useUserStore();
  const [tab, setTab] = useState<TabKey>('feed');
  const [composerOpen, setComposerOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);

  // 添加记忆表单
  const [memoryUri, setMemoryUri] = useState<string | undefined>();
  const [memoryWeight, setMemoryWeight] = useState('');
  const [memoryNote, setMemoryNote] = useState('');

  useEffect(() => {
    load();
  }, [load]);

  function openMemory() {
    setMemoryWeight(bodyData?.weight != null ? String(bodyData.weight) : '');
    setMemoryNote('');
    setMemoryUri(undefined);
    setMemoryOpen(true);
  }

  async function pickMemoryPhoto() {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
      });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      setMemoryUri(res.assets[0].uri);
    } catch {
      Alert.alert('选择照片失败', '请换个方式试试');
    }
  }

  async function submitMemory() {
    const entry: TimelineEntry = {
      id: 'ph_' + Date.now(),
      date: new Date().toISOString().slice(0, 10),
      weight: memoryWeight ? Number(memoryWeight) : undefined,
      note: memoryNote.trim() || undefined,
      uri: memoryUri,
      emoji: DEMO_EMOJIS[photos.length % DEMO_EMOJIS.length],
      color: DEMO_COLORS[photos.length % DEMO_COLORS.length],
    };
    await addPhoto(entry);
    setMemoryOpen(false);
  }

  const dayCount = photos[0]?.day ?? photos.length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* 顶部品牌 + 切换 */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>社区</ThemedText>
          <View style={[styles.segment, { backgroundColor: colors.backgroundElement }]}>
            {(
              [
                { key: 'feed', label: '动态' },
                { key: 'wall', label: '照片墙' },
              ] as { key: TabKey; label: string }[]
            ).map((s) => {
              const active = tab === s.key;
              return (
                <Pressable
                  key={s.key}
                  onPress={() => setTab(s.key)}
                  style={[
                    styles.segItem,
                    active && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
                  ]}>
                  <Text style={[styles.segText, { color: active ? colors.text : colors.textSecondary }]}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {tab === 'feed' ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* 发动态入口 */}
            <Pressable
              onPress={() => setComposerOpen(true)}
              style={[styles.compose, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.composeText}>分享今天的打卡或心得…</Text>
            </Pressable>

            {posts.map((post) => (
              <PostCard key={post.id} post={post} onToggleLike={toggleLike} />
            ))}
            <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
              社区内容为演示数据，仅供展示
            </ThemedText>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {photos.length > 0 ? (
              <TimelineWall entries={photos} onAdd={openMemory} onRemove={removePhoto} />
            ) : (
              <Card style={styles.empty}>
                <Ionicons name="images-outline" size={44} color={colors.backgroundSelected} />
                <ThemedText type="subtitle">时光阁还是空的</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDesc}>
                  收一张今天的记忆，见证自己的变化
                </ThemedText>
              </Card>
            )}
            <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
              时光阁用于记录自身锻炼足迹 · 演示数据
            </ThemedText>
          </ScrollView>
        )}
      </SafeAreaView>

      <PostComposer
        visible={composerOpen}
        onClose={() => setComposerOpen(false)}
        onSubmit={(input) => addPost(input)}
      />

      {/* 添加记忆弹层 */}
      <Modal visible={memoryOpen} transparent animationType="fade" onRequestClose={() => setMemoryOpen(false)}>
        <View style={styles.memBackdrop}>
          <Pressable style={styles.dim} onPress={() => setMemoryOpen(false)} />
          <View style={[styles.memSheet, { backgroundColor: colors.card }]}>
            <ThemedText type="smallBold">收一张记忆</ThemedText>

            {/* 照片区 */}
            <Pressable onPress={pickMemoryPhoto} style={[styles.memPhotoPick, { backgroundColor: colors.backgroundElement }]}>
              {memoryUri ? (
                <Image source={{ uri: memoryUri }} style={styles.memPhoto} contentFit="cover" />
              ) : (
                <View style={{ alignItems: 'center', gap: Spacing.one }}>
                  <Ionicons name="image-outline" size={28} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>选一张照片（可选）</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.memRow}>
              <TextInput
                value={memoryWeight}
                onChangeText={setMemoryWeight}
                placeholder="体重 kg"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                style={[styles.memInput, { color: colors.text, backgroundColor: colors.backgroundElement }]}
              />
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>今天第 {dayCount} 天</Text>
            </View>

            <TextInput
              value={memoryNote}
              onChangeText={setMemoryNote}
              placeholder="此刻想说的话…"
              placeholderTextColor={colors.textSecondary}
              multiline
              style={[styles.memNote, { color: colors.text, backgroundColor: colors.backgroundElement }]}
            />

            <View style={styles.memActions}>
              <Button title="取消" variant="outline" onPress={() => setMemoryOpen(false)} />
              <Button title="收进时光阁" onPress={submitMemory} disabled={!memoryUri && !memoryNote.trim()} />
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.two },
  title: { fontSize: 24, fontWeight: '800' },
  segment: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.chip,
  },
  segItem: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 14,
    alignItems: 'center',
  },
  segText: { fontSize: 13, fontWeight: '700' },
  content: { padding: Spacing.three, gap: Spacing.three },
  compose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.button,
    borderWidth: 1,
  },
  composeText: { color: '#fff', fontSize: 14, fontWeight: '600', opacity: 0.9 },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  emptyDesc: { textAlign: 'center' },
  tip: { textAlign: 'center', marginTop: Spacing.two },
  // 添加记忆弹层（Web 端横向居中并限制为手机框宽度）
  memBackdrop: { flex: 1, justifyContent: 'center', padding: Spacing.four, alignItems: 'center' },
  dim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  memSheet: {
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: 480,
  },
  memPhotoPick: {
    height: 150,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memPhoto: { width: '100%', height: '100%' },
  memRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  memInput: {
    flex: 1,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 15,
  },
  memNote: {
    minHeight: 72,
    borderRadius: Radius.button,
    padding: Spacing.three,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  memActions: { flexDirection: 'row', gap: Spacing.two },
});

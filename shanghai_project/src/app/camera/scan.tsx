import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IngredientResult } from '@/components/camera/IngredientResult';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { recognizeFoodForFlow } from '@/services/recognition';
import { addIngredientHistory, loadIngredientHistory } from '@/services/ingredientHistory';
import type { Ingredient } from '@/types/recipe';

type Mode = 'idle' | 'camera' | 'preview' | 'recognizing' | 'result';

export default function Scan() {
  const colors = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [mode, setMode] = useState<Mode>('idle');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [imageId, setImageId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState('');

  async function loadHistory() {
    setHistory(await loadIngredientHistory());
  }

  function enterIdle() {
    setMode('idle');
    setPreviewUri(null);
    setBase64(null);
    setIngredients([]);
    setImageId(null);
    setError('');
    loadHistory();
  }

  async function openCamera() {
    const nextPermission = permission?.granted ? permission : await requestPermission();
    if (!nextPermission.granted) {
      setError('未获得相机权限，请在系统设置中允许相机访问，或改用相册选图');
      setMode('idle');
      return;
    }
    setError('');
    setMode('camera');
    if (!history.length) loadHistory();
  }

  async function takePhoto() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
    if (photo) {
      setPreviewUri(photo.uri);
      setBase64(photo.base64 ?? null);
      setMode('preview');
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPreviewUri(result.assets[0].uri);
      setBase64(result.assets[0].base64 ?? null);
      setMode('preview');
    }
  }

  async function runRecognition() {
    if (!base64) return;
    setMode('recognizing');
    setError('');
    try {
      const result = await recognizeFoodForFlow(base64);
      setImageId(result.imageId);
      setIngredients(result.ingredients);
      await addIngredientHistory(result.ingredients.map((i) => i.name));
      setMode('result');
    } catch (e: any) {
      if (e?.response?.data?.error?.code === 'NO_INGREDIENTS_FOUND') {
        setIngredients([]);
        setImageId(null);
        setError('没有识别到食材。你可以重拍，或直接手动添加食材。');
        setMode('result');
        return;
      }
      setError((e as Error).message || '识别失败，请重试');
      setMode('preview');
    }
  }

  function handleHistoryItem(name: string) {
    const existing = ingredients.find((i) => i.name === name);
    if (existing) return;
    setIngredients((prev) => [...prev, { name, amount: '适量', confidence: 1 }]);
    setMode('result');
  }

  // 相机模式：全屏取景
  if (mode === 'camera') {
    return (
      <ThemedView style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          onMountError={() => setError('相机打开失败，请检查权限')}
        />
        <SafeAreaView style={styles.cameraOverlay} edges={['top']}>
          <View style={styles.cameraTopBar}>
            <Pressable onPress={enterIdle} hitSlop={10}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>对准食材拍照</ThemedText>
            <View style={{ width: 28 }} />
          </View>
          {error ? <Text style={styles.cameraError}>{error}</Text> : null}
          <View style={styles.cameraBottom}>
            <Pressable style={styles.galleryBtn} onPress={pickFromGallery}>
              <Ionicons name="images" size={26} color="#fff" />
              <Text style={styles.cameraHintText}>相册</Text>
            </Pressable>
            <Pressable style={styles.shutter} onPress={takePhoto}>
              <View style={styles.shutterInner} />
            </Pressable>
            <View style={styles.galleryBtn} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // 预览模式
  if (mode === 'preview' || mode === 'recognizing') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {previewUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="contain" />
            </View>
          ) : null}
          {mode === 'recognizing' ? (
            <View style={styles.recognizing}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText>AI 正在识别食材...</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                初次识别可能稍慢，请稍候
              </ThemedText>
            </View>
          ) : (
            <View style={styles.previewActions}>
              <Button title="重拍/重选" variant="outline" icon="refresh" onPress={enterIdle} />
              <Button title="识别食材" icon="scan" onPress={runRecognition} size="large" style={{ flex: 1 }} />
            </View>
          )}
        </SafeAreaView>
      </ThemedView>
    );
  }

  // 结果模式
  if (mode === 'result') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.resultNav}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.resultNavButton}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
              <ThemedText type="smallBold">返回</ThemedText>
            </Pressable>
          </View>
          <IngredientResult
            ingredients={ingredients}
            imageId={imageId}
            notice={error}
            onChange={setIngredients}
            onRetake={enterIdle}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  // 空闲模式：入口
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="camera" size={40} color={colors.primary} />
          </View>
          <ThemedText type="title">拍一拍，识别食材</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.heroDesc}>
            拍下手头的食物，AI 识别后为你生成一份健康菜谱
          </ThemedText>
        </View>

        <Button title="打开相机拍照" icon="camera" onPress={openCamera} size="large" />
        <Button title="从相册选择图片" variant="secondary" icon="images" onPress={pickFromGallery} size="large" />
        {error ? (
          <ThemedText type="small" themeColor="danger" style={styles.errorText}>
            {error}
          </ThemedText>
        ) : null}

        {history.length > 0 ? (
          <Card style={styles.historyCard}>
            <ThemedText type="smallBold">最近识别的食材</ThemedText>
            <View style={styles.chips}>
              {history.slice(0, 8).map((name) => (
                <Pressable key={name} onPress={() => handleHistoryItem(name)}>
                  <View style={[styles.chip, { backgroundColor: colors.successSoft }]}>
                    <Text style={{ color: colors.success, fontSize: 13, fontWeight: '600' }}>{name}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary" style={styles.tip}>
          * 演示模式下识别结果由内置数据生成
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.three, gap: Spacing.three },
  hero: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.four },
  heroIcon: { width: 80, height: 80, borderRadius: Radius.card, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
  heroDesc: { textAlign: 'center', lineHeight: 22 },
  historyCard: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.chip },
  tip: { textAlign: 'center', marginTop: Spacing.one },
  errorText: { textAlign: 'center' },
  resultNav: { flexDirection: 'row', alignItems: 'center' },
  resultNavButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingVertical: Spacing.two },

  // camera
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  cameraTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  cameraError: { color: '#FFB3B3', textAlign: 'center', marginTop: Spacing.two },
  cameraBottom: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: Spacing.six },
  galleryBtn: { width: 60, alignItems: 'center', gap: Spacing.one },
  cameraHintText: { color: '#fff', fontSize: 12 },
  shutter: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },

  // preview
  previewWrap: { flex: 1, backgroundColor: '#000', borderRadius: Radius.card, overflow: 'hidden' },
  preview: { width: '100%', height: '100%' },
  previewActions: { flexDirection: 'row', gap: Spacing.two },
  recognizing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
});

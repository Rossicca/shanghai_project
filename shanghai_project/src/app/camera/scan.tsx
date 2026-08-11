import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IngredientResult } from '@/components/camera/IngredientResult';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { normalizeImageBase64, recognizeFoodForFlow } from '@/services/recognition';
import { addIngredientHistory, loadIngredientHistory } from '@/services/ingredientHistory';
import type { Ingredient } from '@/types/recipe';

type Mode = 'idle' | 'camera' | 'preview' | 'recognizing' | 'result';

async function readImageBase64(uri: string, provided?: string | null): Promise<string> {
  const direct = normalizeImageBase64(provided || '');
  if (direct) return direct;
  if (uri.startsWith('data:image/')) return normalizeImageBase64(uri);

  const response = await fetch(uri);
  if (!response.ok) throw new Error('照片读取失败');
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('照片读取失败'));
    reader.onload = () => resolve(normalizeImageBase64(String(reader.result || '')));
    reader.readAsDataURL(blob);
  });
}

type ImageEntry = { uri: string; base64: string };

export default function Scan() {
  const colors = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [mode, setMode] = useState<Mode>('idle');
  const [selectedImages, setSelectedImages] = useState<ImageEntry[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [imageId, setImageId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [manualInput, setManualInput] = useState('');

  async function loadHistory() {
    setHistory(await loadIngredientHistory());
  }

  function enterIdle() {
    setMode('idle');
    setSelectedImages([]);
    setIngredients([]);
    setImageId(null);
    setError('');
    setCameraReady(false);
    setCapturing(false);
    loadHistory();
  }

  async function openCamera() {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      !window.isSecureContext &&
      !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ) {
      setError('当前网页使用 HTTP，手机浏览器会禁止直接打开相机。请先从相册选择照片识别；部署 HTTPS 后即可直接拍照。');
      setMode('idle');
      return;
    }
    const nextPermission = permission?.granted ? permission : await requestPermission();
    if (!nextPermission.granted) {
      setError('未获得相机权限，请在系统设置中允许相机访问，或改用相册选图');
      setMode('idle');
      return;
    }
    setError('');
    setCameraReady(false);
    setMode('camera');
    if (!history.length) loadHistory();
  }

  async function takePhoto() {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    setError('');
    try {
      // 视觉模型需要保留食材纹理与边缘细节，过低画质容易把肉类、豆制品和蔬菜识别混淆。
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.72 });
      if (!photo) throw new Error('相机没有返回照片');
      const encoded = await readImageBase64(photo.uri, photo.base64);
      if (!encoded) throw new Error('照片数据为空');
      setSelectedImages((prev) => [...prev, { uri: photo.uri, base64: encoded }]);
      setMode('preview');
    } catch (captureError) {
      setError((captureError as Error).message || '拍照失败，请重试或改用相册');
    } finally {
      setCapturing(false);
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets.length > 0) {
      try {
        const newImages: ImageEntry[] = [];
        for (const asset of result.assets) {
          const encoded = await readImageBase64(asset.uri, asset.base64);
          newImages.push({ uri: asset.uri, base64: encoded });
        }
        setSelectedImages((prev) => [...prev, ...newImages]);
        setMode('preview');
      } catch (pickError) {
        setError((pickError as Error).message || '图片读取失败，请重新选择');
      }
    }
  }

  function removeImage(index: number) {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  }

  function addManualIngredients(text: string) {
    const names = text.split(/[,，、\s]+/).filter(Boolean).slice(0, 20);
    if (names.length === 0) return;
    setIngredients(names.map((name) => ({ name: name.trim(), amount: '适量', confidence: 1 })));
    setImageId(null);
    setMode('result');
  }

  async function runRecognition() {
    if (selectedImages.length === 0) {
      setError('请先拍照或从相册选择图片');
      return;
    }
    setMode('recognizing');
    setError('');
    try {
      const allBase64 = selectedImages.map((img) => img.base64);
      const result = await recognizeFoodForFlow(allBase64);
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
          onCameraReady={() => setCameraReady(true)}
          onMountError={(event) => {
            setCameraReady(false);
            setError(event.message || '相机打开失败，请检查权限');
          }}
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={cameraReady ? '拍照' : '相机准备中'}
              disabled={!cameraReady || capturing}
              style={[styles.shutter, (!cameraReady || capturing) && styles.shutterDisabled]}
              onPress={takePhoto}>
              {capturing ? <ActivityIndicator color="#FFFFFF" /> : <View style={styles.shutterInner} />}
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
          <View style={styles.resultNav}>
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.resultNavButton}>
              <Ionicons name="arrow-back" size={20} color={colors.text} />
              <ThemedText type="smallBold">返回</ThemedText>
            </Pressable>
          </View>
          {selectedImages.length > 0 ? (
            <View style={styles.multiPreview}>
              {selectedImages.map((img, i) => (
                <View key={i} style={styles.thumbWrap}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} resizeMode="cover" />
                  <Pressable style={styles.removeBtn} onPress={() => removeImage(i)}>
                    <Ionicons name="close-circle" size={22} color="#ff4444" />
                  </Pressable>
                </View>
              ))}
              <Pressable style={styles.addMoreBtn} onPress={openCamera}>
                <Ionicons name="camera" size={24} color={colors.primary} />
                <ThemedText type="small">拍照</ThemedText>
              </Pressable>
              <Pressable style={styles.addMoreBtn} onPress={pickFromGallery}>
                <Ionicons name="images" size={24} color={colors.primary} />
                <ThemedText type="small">相册</ThemedText>
              </Pressable>
            </View>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            已选 {selectedImages.length} 张 · 可继续添加更多
          </ThemedText>
          {mode === 'recognizing' ? (
            <View style={styles.recognizing}>
              <ActivityIndicator size="large" color={colors.primary} />
              <ThemedText>AI 正在识别食材...</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                多图识别可能稍慢，请稍候
              </ThemedText>
            </View>
          ) : (
            <View style={styles.previewActions}>
              <Button title="清空重来" variant="outline" icon="refresh" onPress={enterIdle} />
              <Button title="开始识别" icon="scan" onPress={runRecognition} size="large" style={{ flex: 1 }} />
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
        <View style={styles.resultNav}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.resultNavButton}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
            <ThemedText type="smallBold">返回</ThemedText>
          </Pressable>
        </View>
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="camera" size={40} color={colors.primary} />
          </View>
          <ThemedText type="title">拍一拍，识别食材</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.heroDesc}>
            拍下手头的食物，AI 识别后推荐多种正餐、甜品或加餐做法{'\n'}支持多张图片一起上传
          </ThemedText>
        </View>

        <Button title="打开相机拍照" icon="camera" onPress={openCamera} size="large" />
        <Button title="从相册选择图片（可多选）" variant="secondary" icon="images" onPress={pickFromGallery} size="large" />

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <ThemedText type="small" themeColor="textSecondary">或者直接输入食材名</ThemedText>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.manualRow}>
          <TextInput
            placeholder="输入食材名，用逗号或空格分隔，如：鸡蛋 番茄 猪肉"
            value={manualInput}
            onChangeText={setManualInput}
            onSubmitEditing={() => { addManualIngredients(manualInput); setManualInput(''); }}
            style={styles.manualInput}
          />
          <Button title="确定" size="small" onPress={() => { addManualIngredients(manualInput); setManualInput(''); }} />
        </View>

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
          * 拍照和相册图片会发送给 AI 视觉模型识别，也可直接输入食材名跳过识别
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
  shutterDisabled: { opacity: 0.5 },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },

  // preview - multi image
  multiPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  thumbWrap: { position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 12 },
  addMoreBtn: { width: 80, height: 80, borderRadius: 8, borderWidth: 1.5, borderColor: '#ccc', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
  previewActions: { flexDirection: 'row', gap: Spacing.two },
  recognizing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  // divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dividerLine: { flex: 1, height: 1 },
  manualRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  manualInput: { flex: 1, padding: Spacing.two, borderRadius: Radius.chip, borderWidth: 1, borderColor: '#ccc', fontSize: 14 },
});

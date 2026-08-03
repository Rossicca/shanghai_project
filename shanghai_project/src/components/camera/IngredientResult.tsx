import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRecipeStore } from '@/store/recipeStore';
import { confirmIngredients } from '@/services/recognition';
import type { Ingredient } from '@/types/recipe';

type Props = {
  ingredients: Ingredient[];
  imageId?: string | null;
  notice?: string;
  onChange: (list: Ingredient[]) => void;
  onRetake: () => void;
};

/** 识别结果展示：食材列表 + 置信度，支持删除/手动添加 */
export function IngredientResult({ ingredients, imageId, notice, onChange, onRetake }: Props) {
  const colors = useTheme();
  const setIngredients = useRecipeStore((s) => s.setIngredients);
  const setRecognitionSessionId = useRecipeStore((s) => s.setRecognitionSessionId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  function removeAt(index: number) {
    onChange(ingredients.filter((_, i) => i !== index));
  }

  function updateAt(index: number, updates: Partial<Ingredient>) {
    onChange(ingredients.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  }

  function addIngredient() {
    if (!name.trim()) return;
    const item: Ingredient = { name: name.trim(), amount: amount.trim() || '适量', confidence: 1 };
    onChange([...ingredients, item]);
    setName('');
    setAmount('');
    setAdding(false);
  }

  async function goGenerate() {
    const validIngredients = ingredients.filter((item) => item.name.trim());
    setConfirming(true);
    setConfirmError('');
    try {
      if (imageId) {
        const confirmation = await confirmIngredients(imageId, validIngredients);
        setRecognitionSessionId(confirmation.sessionId);
      } else {
        setRecognitionSessionId(null);
      }
      setIngredients(validIngredients);
      router.push('/recipe/generate');
    } catch (error) {
      setConfirmError((error as Error).message || '食材确认失败，请重试');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold">
              {ingredients.length > 0 ? `识别到 ${ingredients.length} 种食材` : '没有识别到食材'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {ingredients.length > 0
                ? '可删除误识别，或手动补充漏掉的食材'
                : '请返回重新选择图片，或直接手动添加食材'}
            </ThemedText>
          </View>
        </View>
      </Card>

      {notice ? (
        <Card style={styles.noticeCard}>
          <Ionicons name="information-circle" size={20} color={colors.warning} />
          <ThemedText type="small" style={{ flex: 1 }}>{notice}</ThemedText>
        </Card>
      ) : null}

      {ingredients.some((item) => item.confidence < 0.6) ? (
        <ThemedText type="small" themeColor="warning" style={styles.inlineNotice}>
          部分食材置信度较低，请核对名称和用量；不确定时建议重拍。
        </ThemedText>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list}>
        {ingredients.map((item, i) => (
          <Card key={`${item.name}-${i}`} style={styles.item}>
            <View style={{ flex: 1 }}>
              <View style={styles.editRow}>
                <TextInput
                  value={item.name}
                  onChangeText={(value) => updateAt(i, { name: value })}
                  placeholder="食材名"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.itemInput, styles.nameInput, { color: colors.text, borderColor: colors.border }]}
                />
                <TextInput
                  value={item.amount}
                  onChangeText={(value) => updateAt(i, { amount: value })}
                  placeholder="用量"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.itemInput, styles.amountInput, { color: colors.text, borderColor: colors.border }]}
                />
              </View>
              <View style={styles.confRow}>
                <View style={[styles.confBar, { backgroundColor: colors.backgroundElement }]}>
                  <View
                    style={[
                      styles.confFill,
                      {
                        width: `${Math.round(item.confidence * 100)}%`,
                        backgroundColor: item.confidence > 0.6 ? colors.success : colors.warning,
                      },
                    ]}
                  />
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {Math.round(item.confidence * 100)}%
                </ThemedText>
              </View>
            </View>
            <Pressable onPress={() => removeAt(i)} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
            </Pressable>
          </Card>
        ))}

        {adding ? (
          <Card style={styles.addCard}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="食材名"
              placeholderTextColor={colors.textSecondary}
              style={[styles.addInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            />
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="用量（如 200g）"
              placeholderTextColor={colors.textSecondary}
              style={[styles.addInput, { backgroundColor: colors.backgroundElement, color: colors.text }]}
            />
            <View style={styles.addActions}>
              <Button title="取消" variant="text" onPress={() => setAdding(false)} />
              <Button title="添加" onPress={addIngredient} disabled={!name.trim()} />
            </View>
          </Card>
        ) : (
          <Pressable onPress={() => setAdding(true)}>
            <Card style={styles.addBtn} padded={false}>
              <Ionicons name="add" size={22} color={colors.primary} />
              <ThemedText type="smallBold" themeColor="primary">
                手动添加食材
              </ThemedText>
            </Card>
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {confirmError ? (
          <ThemedText type="small" themeColor="danger" style={styles.confirmError}>{confirmError}</ThemedText>
        ) : null}
        <Button title="重拍" variant="outline" icon="camera-reverse" onPress={onRetake} />
        <View style={{ width: Spacing.two }} />
        <Button
          title={`用 ${ingredients.length} 种食材生成菜谱`}
          onPress={goGenerate}
          icon="sparkles"
          size="large"
          style={{ flex: 1 }}
          disabled={!ingredients.some((item) => item.name.trim())}
          loading={confirming}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: { marginBottom: Spacing.three },
  headerRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  noticeCard: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center', marginBottom: Spacing.two },
  inlineNotice: { marginBottom: Spacing.two },
  list: { gap: Spacing.two, paddingBottom: Spacing.three },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  editRow: { flexDirection: 'row', gap: Spacing.two },
  itemInput: { borderBottomWidth: 1, paddingVertical: 4, fontSize: 14 },
  nameInput: { flex: 1, fontWeight: '700' },
  amountInput: { width: 90, textAlign: 'right' },
  confRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: Spacing.one },
  confBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  confFill: { height: '100%', borderRadius: 2 },
  addCard: { gap: Spacing.two },
  addInput: { borderRadius: Radius.button, paddingHorizontal: Spacing.three, paddingVertical: 10, fontSize: 14 },
  addActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderStyle: 'dashed',
    borderWidth: 1,
  },
  footer: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: Spacing.two },
  confirmError: { width: '100%', marginBottom: Spacing.two },
});

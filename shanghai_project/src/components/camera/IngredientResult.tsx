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
import type { Ingredient } from '@/types/recipe';

type Props = {
  ingredients: Ingredient[];
  onChange: (list: Ingredient[]) => void;
  onRetake: () => void;
};

/** 识别结果展示：食材列表 + 置信度，支持删除/手动添加 */
export function IngredientResult({ ingredients, onChange, onRetake }: Props) {
  const colors = useTheme();
  const setIngredients = useRecipeStore((s) => s.setIngredients);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');

  function removeAt(index: number) {
    onChange(ingredients.filter((_, i) => i !== index));
  }

  function addIngredient() {
    if (!name.trim()) return;
    const item: Ingredient = { name: name.trim(), amount: amount.trim() || '适量', confidence: 1 };
    onChange([...ingredients, item]);
    setName('');
    setAmount('');
    setAdding(false);
  }

  function goGenerate() {
    setIngredients(ingredients);
    router.push('/recipe/generate');
  }

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          <View style={{ flex: 1 }}>
            <ThemedText type="smallBold">识别到 {ingredients.length} 种食材</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              可删除误识别，或手动补充漏掉的食材
            </ThemedText>
          </View>
        </View>
      </Card>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list}>
        {ingredients.map((item, i) => (
          <Card key={`${item.name}-${i}`} style={styles.item}>
            <View style={{ flex: 1 }}>
              <ThemedText type="smallBold">
                {item.name}
                <ThemedText type="small" themeColor="textSecondary">
                  {' '}
                  {item.amount}
                </ThemedText>
              </ThemedText>
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
        <Button title="重拍" variant="outline" icon="camera-reverse" onPress={onRetake} />
        <View style={{ width: Spacing.two }} />
        <Button
          title={`用 ${ingredients.length} 种食材生成菜谱`}
          onPress={goGenerate}
          icon="sparkles"
          size="large"
          style={{ flex: 1 }}
          disabled={ingredients.length === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: { marginBottom: Spacing.three },
  headerRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  list: { gap: Spacing.two, paddingBottom: Spacing.three },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
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
  footer: { flexDirection: 'row', paddingTop: Spacing.two },
});

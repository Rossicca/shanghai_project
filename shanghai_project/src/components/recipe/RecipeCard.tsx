import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { recipeCoverUrl } from '@/services/media';
import type { Recipe } from '@/types/recipe';

type Props = {
  recipe: Recipe;
  onPress?: () => void;
  onSave?: () => void;
  saved?: boolean;
};

/** 菜谱卡片（列表用） */
export function RecipeCard({ recipe, onPress, onSave, saved }: Props) {
  const colors = useTheme();

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.card} padded={false}>
        <View style={[styles.artwork, { backgroundColor: colors.primarySoft }]}>
          {recipeCoverUrl(recipe.sourceVideo?.coverUrl) ? (
            <Image source={{ uri: recipeCoverUrl(recipe.sourceVideo?.coverUrl)! }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name="restaurant-outline" size={27} color={colors.primary} />
          )}
        </View>
        <View style={styles.body}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {recipe.name}
          </ThemedText>
          <View style={styles.meta}>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.cookTime} 分钟</Text>
            <Text style={[styles.dot, { color: colors.textSecondary }]}>·</Text>
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{recipe.difficulty}</Text>
            <Text style={[styles.dot, { color: colors.textSecondary }]}>·</Text>
            <Text style={[styles.cal, { color: colors.primary }]}>{recipe.calories} 千卡</Text>
          </View>
        </View>
        {onSave ? (
          <Pressable onPress={onSave} hitSlop={8} style={styles.saveBtn}>
            <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? colors.danger : colors.textSecondary} />
          </Pressable>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  artwork: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  body: { flex: 1, gap: Spacing.one, padding: Spacing.two + 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  metaText: { fontSize: 12 },
  dot: { fontSize: 12 },
  cal: { fontSize: 13, fontWeight: '800' },
  saveBtn: { paddingHorizontal: Spacing.three },
});

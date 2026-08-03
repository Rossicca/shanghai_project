import { View, type ViewStyle } from 'react-native';

import { RecipeCard } from '@/components/recipe/RecipeCard';
import { Spacing } from '@/constants/theme';
import type { Recipe } from '@/types/recipe';

type Props = {
  recipes: Recipe[];
  onPress: (recipe: Recipe) => void;
  onSave?: (recipe: Recipe) => void;
  savedIds?: Set<string>;
  style?: ViewStyle;
};

/** 菜谱列表 */
export function RecipeList({ recipes, onPress, onSave, savedIds, style }: Props) {
  return (
    <View style={[{ gap: Spacing.two }, style]}>
      {recipes.map((r) => (
        <RecipeCard
          key={r.id}
          recipe={r}
          onPress={() => onPress(r)}
          onSave={onSave ? () => onSave(r) : undefined}
          saved={savedIds?.has(r.id)}
        />
      ))}
    </View>
  );
}

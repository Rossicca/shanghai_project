import { Pressable, StyleSheet, Text } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCommunityStore } from '@/store/communityStore';

type Props = {
  name: string;
};

/** 关注按钮三态：+ 关注 / 已关注 / ⭐ 好友（互关） */
export function FollowChip({ name }: Props) {
  const colors = useTheme();
  const following = useCommunityStore((s) => s.following);
  const followers = useCommunityStore((s) => s.followers);
  const toggleFollow = useCommunityStore((s) => s.toggleFollow);

  const isF = following.includes(name);
  const isFriend = isF && followers.includes(name);

  return (
    <Pressable
      hitSlop={8}
      onPress={() => toggleFollow(name)}
      style={[
        styles.chip,
        isF
          ? isFriend
            ? { backgroundColor: colors.primarySoft }
            : { backgroundColor: colors.backgroundElement }
          : { backgroundColor: colors.primary },
      ]}>
      <Text
        style={[
          styles.text,
          { color: isF ? (isFriend ? colors.primary : colors.textSecondary) : '#fff' },
        ]}>
        {isFriend ? '⭐ 好友' : isF ? '已关注' : '+ 关注'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: Radius.chip, paddingHorizontal: 10, paddingVertical: 5 },
  text: { fontSize: 12, fontWeight: '700' },
});

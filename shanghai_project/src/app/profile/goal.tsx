import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { GoalSelector } from '@/components/GoalSelector';
import { Spacing } from '@/constants/theme';
import { useUserStore } from '@/store/userStore';

export default function GoalPage() {
  const goal = useUserStore((s) => s.goal);
  const setGoal = useUserStore((s) => s.setGoal);
  const [saving, setSaving] = useState(false);

  async function handleSave(g: Parameters<typeof setGoal>[0]) {
    setSaving(true);
    try {
      await setGoal(g);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.three }}>
        <GoalSelector initial={goal} onSave={handleSave} saving={saving} />
      </ScrollView>
    </ThemedView>
  );
}

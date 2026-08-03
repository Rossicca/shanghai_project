import { router } from 'expo-router';
import { useState } from 'react';

import { ThemedView } from '@/components/themed-view';
import { BodyDataForm } from '@/components/BodyDataForm';
import { useUserStore } from '@/store/userStore';

export default function BodyDataPage() {
  const bodyData = useUserStore((s) => s.bodyData);
  const setBodyData = useUserStore((s) => s.setBodyData);
  const [saving, setSaving] = useState(false);

  async function handleSave(data: Parameters<typeof setBodyData>[0]) {
    setSaving(true);
    try {
      await setBodyData(data);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <BodyDataForm initial={bodyData} onSave={handleSave} saving={saving} />
    </ThemedView>
  );
}

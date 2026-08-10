import { create } from 'zustand';

import { getScopedItem, setScopedItem } from '@/services/scopedStorage';

const KEY_SAVED_INSPIRATIONS = 'recipe:inspirations:saved';

interface InspirationState {
  savedIds: string[];
  loaded: boolean;
  loadLocal: () => Promise<void>;
  toggleSaved: (id: string) => Promise<void>;
  clearLocalData: () => void;
}

export const useInspirationStore = create<InspirationState>((set, get) => ({
  savedIds: [],
  loaded: false,

  loadLocal: async () => {
    try {
      const saved = await getScopedItem(KEY_SAVED_INSPIRATIONS);
      set({ savedIds: saved ? JSON.parse(saved) : [], loaded: true });
    } catch {
      set({ savedIds: [], loaded: true });
    }
  },

  toggleSaved: async (id) => {
    const savedIds = get().savedIds.includes(id)
      ? get().savedIds.filter((savedId) => savedId !== id)
      : [id, ...get().savedIds];
    set({ savedIds });
    await setScopedItem(KEY_SAVED_INSPIRATIONS, JSON.stringify(savedIds));
  },

  clearLocalData: () => set({ savedIds: [], loaded: false }),
}));

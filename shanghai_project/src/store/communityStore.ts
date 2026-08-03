import { create } from 'zustand';

import * as communityService from '@/services/community';
import type { CommunityPost, TimelineEntry } from '@/types/community';

interface CommunityState {
  posts: CommunityPost[];
  photos: TimelineEntry[];
  loaded: boolean;
  load: () => Promise<void>;
  addPost: (input: { content: string; category: CommunityPost['category'] }) => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
  addPhoto: (photo: TimelineEntry) => Promise<void>;
  removePhoto: (id: string) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  posts: [],
  photos: [],
  loaded: false,

  load: async () => {
    const [posts, photos] = await Promise.all([
      communityService.loadPosts(),
      communityService.loadPhotos(),
    ]);
    set({ posts, photos, loaded: true });
  },

  addPost: async ({ content, category }) => {
    const post: CommunityPost = {
      id: 'p_' + Date.now(),
      author: {
        name: '我',
        avatar: '🌱',
        tag: '芽芽健康',
      },
      timeLabel: '刚刚',
      category,
      content,
      likes: 0,
      liked: false,
      comments: 0,
    };
    const next = [post, ...get().posts];
    set({ posts: next });
    await communityService.savePosts(next);
  },

  toggleLike: async (id) => {
    const next = get().posts.map((p) =>
      p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p
    );
    set({ posts: next });
    await communityService.savePosts(next);
  },

  addPhoto: async (photo) => {
    const next = [photo, ...get().photos];
    set({ photos: next });
    await communityService.savePhotos(next);
  },

  removePhoto: async (id) => {
    const next = get().photos.filter((p) => p.id !== id);
    set({ photos: next });
    await communityService.savePhotos(next);
  },
}));

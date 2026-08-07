import { create } from 'zustand';

import * as communityService from '@/services/community';
import type { Comment, CommunityPost, TimelineEntry } from '@/types/community';
import { useUserStore } from '@/store/userStore';

interface CommunityState {
  posts: CommunityPost[];
  photos: TimelineEntry[];
  commentsByPost: Record<string, Comment[]>;
  loaded: boolean;
  load: () => Promise<void>;
  addPost: (input: { content: string; category: CommunityPost['category'] }) => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  addPhoto: (photo: TimelineEntry) => Promise<void>;
  removePhoto: (id: string) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  posts: [],
  photos: [],
  commentsByPost: {},
  loaded: false,

  load: async () => {
    const [posts, photos, commentsByPost] = await Promise.all([
      communityService.loadPosts(),
      communityService.loadPhotos(),
      communityService.loadComments(),
    ]);
    // 帖子计数以评论数组实际长度为准
    const syncedPosts = posts.map((p) => ({
      ...p,
      comments: commentsByPost[p.id]?.length ?? p.comments,
    }));
    set({ posts: syncedPosts, photos, commentsByPost, loaded: true });
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

  addComment: async (postId, content) => {
    const text = content.trim();
    if (!text) return;
    const user = useUserStore.getState().user;
    const comment: Comment = {
      id: 'c_' + Date.now(),
      postId,
      author: {
        name: user?.nickname ?? '健身新人',
        avatar: user?.avatar ?? '🌱',
      },
      timeLabel: '刚刚',
      content: text,
    };
    const nextComments = {
      ...get().commentsByPost,
      [postId]: [...(get().commentsByPost[postId] ?? []), comment],
    };
    const nextPosts = get().posts.map((p) =>
      p.id === postId ? { ...p, comments: nextComments[postId].length } : p
    );
    set({ commentsByPost: nextComments, posts: nextPosts });
    await Promise.all([
      communityService.saveComments(nextComments),
      communityService.savePosts(nextPosts),
    ]);
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

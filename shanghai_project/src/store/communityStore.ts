import { create } from 'zustand';

import * as communityService from '@/services/community';
import type { Comment, CommunityPost, TimelineEntry } from '@/types/community';

/**
 * 社区 store — 数据源为共享后端（见 services/community.ts）。
 * 所有写操作以服务端返回值为准（真实 id、真实作者），失败时不改动本地状态，
 * 由服务端负责校验登录（未登录写操作会被引导去登录）。
 */
interface CommunityState {
  posts: CommunityPost[];
  photos: TimelineEntry[];
  commentsByPost: Record<string, Comment[]>;
  /** 我关注的作者名 */
  following: string[];
  /** 关注我的作者名（演示种子数据，用于互关好友） */
  followers: string[];
  loaded: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  load: () => Promise<void>;
  syncFeed: () => Promise<void>;
  addPost: (input: {
    content: string;
    category: CommunityPost['category'];
    image?: CommunityPost['image'];
  }) => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
  removePost: (id: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  toggleFollow: (name: string) => Promise<void>;
  addPhoto: (photo: TimelineEntry) => Promise<void>;
  removePhoto: (id: string) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  posts: [],
  photos: [],
  commentsByPost: {},
  following: [],
  followers: [],
  loaded: false,
  isSyncing: false,
  lastSyncedAt: null,

  load: async () => {
    const [posts, photos, commentsByPost, following] = await Promise.all([
      communityService.loadPosts(),
      communityService.loadPhotos(),
      communityService.loadComments(),
      communityService.loadFollowing(),
    ]);
    // 帖子计数以评论数组实际长度为准
    const syncedPosts = posts.map((p) => ({
      ...p,
      comments: commentsByPost[p.id]?.length ?? p.comments,
    }));
    set({
      posts: syncedPosts,
      photos,
      commentsByPost,
      following,
      followers: communityService.SEED_FOLLOWERS,
      loaded: true,
      lastSyncedAt: Date.now(),
    });
  },

  syncFeed: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });
    try {
      const [posts, commentsByPost] = await Promise.all([
        communityService.loadPosts(),
        communityService.loadComments(),
      ]);
      set({
        posts: posts.map((post) => ({
          ...post,
          comments: commentsByPost[post.id]?.length ?? post.comments,
        })),
        commentsByPost,
        lastSyncedAt: Date.now(),
      });
    } finally {
      set({ isSyncing: false });
    }
  },

  addPost: async ({ content, category, image }) => {
    try {
      // 作者身份由后端从登录用户取出，返回的帖子带真实 id；配图一并上传
      const post = await communityService.createPost({ content, category, image });
      set((s) => ({ posts: [post, ...s.posts], lastSyncedAt: Date.now() }));
    } catch (error) {
      console.warn('[community] 发布失败:', error);
      throw error;
    }
  },

  toggleLike: async (id) => {
    try {
      const result = await communityService.toggleLike(id);
      if (!result) return;
      set((s) => ({
        posts: s.posts.map((p) => (p.id === id ? { ...p, liked: result.liked, likes: result.likes } : p)),
      }));
    } catch (error) {
      console.warn('[community] 点赞失败:', error);
    }
  },

  removePost: async (id) => {
    try {
      // 后端校验作者身份；删除后本地同步移除该帖及其评论
      await communityService.deletePost(id);
      set((s) => {
        const commentsByPost = { ...s.commentsByPost };
        delete commentsByPost[id];
        return { posts: s.posts.filter((p) => p.id !== id), commentsByPost };
      });
    } catch (error) {
      console.warn('[community] 删除动态失败:', error);
      throw error;
    }
  },

  addComment: async (postId, content) => {
    const text = content.trim();
    if (!text) return;
    try {
      const comment = await communityService.createComment(postId, text);
      const nextComments = [...(get().commentsByPost[postId] ?? []), comment];
      set({
        commentsByPost: { ...get().commentsByPost, [postId]: nextComments },
        posts: get().posts.map((p) =>
          p.id === postId ? { ...p, comments: nextComments.length } : p
        ),
      });
    } catch (error) {
      console.warn('[community] 评论失败:', error);
    }
  },

  toggleFollow: async (name) => {
    try {
      const following = await communityService.toggleFollow(name);
      set({ following });
    } catch (error) {
      console.warn('[community] 关注失败:', error);
    }
  },

  addPhoto: async (photo) => {
    try {
      // 服务端生成 id，以服务端返回为准
      const created = await communityService.createPhoto(photo);
      set((s) => ({ photos: [created, ...s.photos] }));
    } catch (error) {
      console.warn('[community] 添加记忆失败:', error);
    }
  },

  removePhoto: async (id) => {
    try {
      await communityService.deletePhoto(id);
      set((s) => ({ photos: s.photos.filter((p) => p.id !== id) }));
    } catch (error) {
      console.warn('[community] 删除记忆失败:', error);
    }
  },
}));

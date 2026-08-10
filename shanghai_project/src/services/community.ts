import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL } from '@/constants/config';
import { api } from '@/services/api';
import type { Comment, CommunityPost, TimelineEntry } from '@/types/community';

/**
 * 社区/照片墙数据服务 — 共享后端优先，失败降级本地 AsyncStorage。
 *
 * 背景：社区数据原来只存在各设备本地 AsyncStorage，帖子互不互通（每个账号各存各的）。
 * 现在默认走后端 /api/v1/community（所有用户读写同一份共享数据）；
 * 仅在后端不可达（离线 / 后端未启动）时降级到本地缓存，保证不崩、本地开发照常。
 *
 * 所有写操作以服务端返回值为准（真实 id、真实作者），不沿用旧「先改本地再整体 save」。
 */

const KEY_POSTS = 'community:posts';
const KEY_PHOTOS = 'community:photos';
const KEY_COMMENTS = 'community:comments';
const KEY_FOLLOWING = 'community:following';

/** 评论表：postId -> 评论数组 */
export type CommentMap = Record<string, Comment[]>;

/** 关注我的用户（演示种子数据，用于计算互关好友：following ∩ followers） */
export const SEED_FOLLOWERS: string[] = ['晓雯', '沐沐', 'Kevin'];

function sharedMediaUrl(uri?: string): string | undefined {
  if (!uri) return undefined;
  return uri.startsWith('/') ? `${API_BASE_URL}${uri}` : uri;
}

function normalizePostMedia(post: CommunityPost): CommunityPost {
  return post.image?.uri
    ? { ...post, image: { ...post.image, uri: sharedMediaUrl(post.image.uri) } }
    : post;
}

function normalizePhotoMedia(photo: TimelineEntry): TimelineEntry {
  return photo.uri ? { ...photo, uri: sharedMediaUrl(photo.uri) } : photo;
}

async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** 后端优先：成功则缓存到本地；失败则回退本地缓存 */
async function withLocalFallback<T>(request: () => Promise<T>, localKey: string, fallback: T): Promise<T> {
  try {
    const data = await request();
    await setJSON(localKey, data);
    return data;
  } catch {
    const cached = await getJSON<T>(localKey);
    return cached ?? fallback;
  }
}

// ─── 读取（后端优先，失败降级本地） ───

export async function loadPosts(): Promise<CommunityPost[]> {
  return withLocalFallback(
    async () => {
      const res = await api.get('/api/v1/community/posts');
      const posts = res.data?.data?.posts as CommunityPost[];
      if (!Array.isArray(posts)) throw new Error('bad posts response');
      return posts.map(normalizePostMedia);
    },
    KEY_POSTS,
    []
  );
}

export async function loadPhotos(): Promise<TimelineEntry[]> {
  return withLocalFallback(
    async () => {
      const res = await api.get('/api/v1/community/photos');
      const photos = res.data?.data?.photos as TimelineEntry[];
      if (!Array.isArray(photos)) throw new Error('bad photos response');
      return photos.map(normalizePhotoMedia);
    },
    KEY_PHOTOS,
    []
  );
}

export async function loadComments(): Promise<CommentMap> {
  return withLocalFallback(
    async () => {
      const res = await api.get('/api/v1/community/comments');
      const comments = res.data?.data?.comments as CommentMap;
      if (!comments || typeof comments !== 'object') throw new Error('bad comments response');
      return comments;
    },
    KEY_COMMENTS,
    {}
  );
}

export async function loadFollowing(): Promise<string[]> {
  return withLocalFallback(
    async () => {
      const res = await api.get('/api/v1/community/following');
      const following = res.data?.data?.following as string[];
      if (!Array.isArray(following)) throw new Error('bad following response');
      return following;
    },
    KEY_FOLLOWING,
    []
  );
}

// ─── 写入（以服务端返回值为准） ───

/** 发布动态：作者身份由后端从登录用户取出，返回带真实 id 的帖子 */
export async function createPost(input: {
  content: string;
  category: CommunityPost['category'];
  /** 可选配图（上传的真实图片 uri 或 emoji+色块占位） */
  image?: CommunityPost['image'];
}): Promise<CommunityPost> {
  const res = await api.post('/api/v1/community/posts', input);
  const post = res.data?.data as CommunityPost;
  if (!post?.id) throw new Error('create post failed');
  return normalizePostMedia(post);
}

/** 切换点赞：返回最新 { likes, liked } */
export async function toggleLike(postId: string): Promise<{ id: string; likes: number; liked: boolean }> {
  const res = await api.post(`/api/v1/community/posts/${encodeURIComponent(postId)}/like`);
  return res.data?.data;
}

/** 删除自己的动态（仅作者可删，后端校验权限） */
export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/api/v1/community/posts/${encodeURIComponent(postId)}`);
}

/** 发表评论：作者身份由后端从登录用户取出，返回创建的评论 */
export async function createComment(postId: string, content: string): Promise<Comment> {
  const res = await api.post(`/api/v1/community/posts/${encodeURIComponent(postId)}/comments`, { content });
  const comment = res.data?.data as Comment;
  if (!comment?.id) throw new Error('create comment failed');
  return comment;
}

/** 切换关注：返回最新关注列表 */
export async function toggleFollow(name: string): Promise<string[]> {
  const res = await api.post('/api/v1/community/following/toggle', { name });
  return res.data?.data?.following ?? [];
}

/** 新增时光记忆：返回服务端生成 id 的记忆 */
export async function createPhoto(photo: Omit<TimelineEntry, 'id'>): Promise<TimelineEntry> {
  const res = await api.post('/api/v1/community/photos', photo);
  const created = res.data?.data as TimelineEntry;
  if (!created?.id) throw new Error('create photo failed');
  return normalizePhotoMedia(created);
}

/** 删除时光记忆 */
export async function deletePhoto(id: string): Promise<void> {
  await api.delete(`/api/v1/community/photos/${encodeURIComponent(id)}`);
}

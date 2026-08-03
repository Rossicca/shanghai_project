import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CommunityPost, TimelineEntry } from '@/types/community';

/**
 * 社区/照片墙本地存取（demo 阶段，无真实后端）。
 * 首次加载注入演示种子数据，用户发帖/点赞/加照片后持久化。
 */

const KEY_POSTS = 'community:posts';
const KEY_PHOTOS = 'community:photos';

/** 演示种子动态 */
const SEED_POSTS: CommunityPost[] = [
  {
    id: 'p_seed_1',
    author: { name: '晓雯', avatar: '🦩', tag: '减脂第 21 天' },
    timeLabel: '2小时前',
    category: '打卡',
    content: '今天午餐吃了拍照识别的鸡胸肉沙拉，环形进度刚好达标！坚持真的会看到变化 🌿',
    image: { emoji: '🥗', color: '#E4F3ED' },
    likes: 128,
    liked: false,
    comments: 16,
  },
  {
    id: 'p_seed_2',
    author: { name: '阿哲', avatar: '🦁', tag: '增肌第 45 天' },
    timeLabel: '5小时前',
    category: '晒变化',
    content: '同一个角度，第 1 天和今天对比。体脂从 21% 降到 17%，照片墙比体重秤更直观！',
    image: { emoji: '💪', color: '#FDF0DC' },
    likes: 342,
    liked: false,
    comments: 38,
  },
  {
    id: 'p_seed_3',
    author: { name: '小满', avatar: '🐰', tag: '保持健康' },
    timeLabel: '昨天',
    category: '食谱',
    content: '求推荐适合宿舍党（只有小煮锅）的低脂晚餐，最近晚上总忍不住点外卖 😭',
    likes: 56,
    liked: false,
    comments: 21,
  },
  {
    id: 'p_seed_4',
    author: { name: 'Kevin', avatar: '🐻', tag: '减脂第 7 天' },
    timeLabel: '昨天',
    category: '提问',
    content: '深蹲后大腿前侧酸，是不是动作不对？视频里教练说膝盖不要内扣，但我总控制不住。',
    likes: 89,
    liked: false,
    comments: 12,
  },
  {
    id: 'p_seed_5',
    author: { name: '沐沐', avatar: '🐬', tag: '塑形中' },
    timeLabel: '2天前',
    category: '打卡',
    content: '坚持一周每晚饭后 20 分钟跟练，睡眠变好了，早上也不赖床了，记录一下 🧘',
    image: { emoji: '🧘', color: '#E7F0FA' },
    likes: 203,
    liked: false,
    comments: 25,
  },
];

/** 演示种子时光阁（按时间排列的记忆） */
const SEED_PHOTOS: TimelineEntry[] = [
  {
    id: 'ph_seed_1',
    date: '2026-06-01',
    day: 1,
    weight: 72,
    bodyFat: 24,
    note: '第 1 天，拍下现在的自己，给未来的一个承诺',
    emoji: '🌱',
    color: '#FDF0DC',
  },
  {
    id: 'ph_seed_2',
    date: '2026-06-15',
    day: 15,
    weight: 70.5,
    bodyFat: 23.2,
    note: '两周了，皮带多扣了一格 ✌️',
    emoji: '🏃',
    color: '#E7F0FA',
  },
  {
    id: 'ph_seed_3',
    date: '2026-07-01',
    day: 30,
    weight: 69,
    bodyFat: 22,
    note: '满月打卡，习惯开始长在身上',
    emoji: '🧘',
    color: '#E4F3ED',
  },
  {
    id: 'ph_seed_4',
    date: '2026-07-20',
    day: 50,
    weight: 67.5,
    bodyFat: 21,
    note: '能明显摸到锁骨了，坚持有回报',
    emoji: '💪',
    color: '#FCE9E4',
  },
  {
    id: 'ph_seed_5',
    date: '2026-08-01',
    day: 62,
    weight: 66,
    bodyFat: 20,
    note: '第 62 天。谢谢你，两个月前的自己',
    emoji: '✨',
    color: '#E4F3ED',
  },
];

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

export async function loadPosts(): Promise<CommunityPost[]> {
  const stored = await getJSON<CommunityPost[]>(KEY_POSTS);
  if (stored) return stored;
  // 首次：注入种子
  await setJSON(KEY_POSTS, SEED_POSTS);
  return SEED_POSTS;
}

export async function savePosts(posts: CommunityPost[]): Promise<void> {
  await setJSON(KEY_POSTS, posts);
}

export async function loadPhotos(): Promise<TimelineEntry[]> {
  const stored = await getJSON<TimelineEntry[]>(KEY_PHOTOS);
  if (stored) return stored;
  await setJSON(KEY_PHOTOS, SEED_PHOTOS);
  return SEED_PHOTOS;
}

export async function savePhotos(photos: TimelineEntry[]): Promise<void> {
  await setJSON(KEY_PHOTOS, photos);
}

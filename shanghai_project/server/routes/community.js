/**
 * 社区路由 — 动态 / 评论 / 点赞 / 照片墙 / 关注
 *
 * 背景：社区数据原存在各设备 AsyncStorage 里，互不互通。本路由把社区数据落到
 * 共享 SQLite，所有用户读写同一份数据（帖子、评论、点赞全局共享；照片墙与关注
 * 按用户隔离）。
 *
 * 访问策略：
 * - 读接口（GET）对游客开放，不要求登录；
 * - 写接口（POST / DELETE）要求登录，作者身份取自 token 对应用户。
 *
 * 种子数据（SEED_*）仅作为「还没有用户数据时的默认视图」，不是 DB 行；
 * 一旦用户首次写入，就把当前视图实体化落库，之后以 DB 行为准。
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../db');
const { verifyToken } = require('../auth');

const COMMUNITY_UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads', 'community');
const MAX_COMMUNITY_IMAGE_BYTES = 3 * 1024 * 1024;
fs.mkdirSync(COMMUNITY_UPLOAD_DIR, { recursive: true });

// ---- 种子数据（与客户端 src/services/community.ts 保持一致） ----

/** 种子动态（拍平为与 DB 行同构，方便统一序列化） */
const SEED_POSTS = [
  {
    id: 'p_seed_1', authorName: '晓雯', authorAvatar: '🦩', authorTag: '减脂第 21 天',
    timeLabel: '2小时前', category: '打卡',
    content: '今天午餐吃了拍照识别的鸡胸肉沙拉，环形进度刚好达标！坚持真的会看到变化 🌿',
    imageEmoji: '🥗', imageColor: '#E4F3ED', likes: 128,
  },
  {
    id: 'p_seed_2', authorName: '阿哲', authorAvatar: '🦁', authorTag: '增肌第 45 天',
    timeLabel: '5小时前', category: '晒变化',
    content: '同一个角度，第 1 天和今天对比。体脂从 21% 降到 17%，照片墙比体重秤更直观！',
    imageEmoji: '💪', imageColor: '#FDF0DC', likes: 342,
  },
  {
    id: 'p_seed_3', authorName: '小满', authorAvatar: '🐰', authorTag: '保持健康',
    timeLabel: '昨天', category: '食谱',
    content: '求推荐适合宿舍党（只有小煮锅）的低脂晚餐，最近晚上总忍不住点外卖 😭',
    likes: 56,
  },
  {
    id: 'p_seed_4', authorName: 'Kevin', authorAvatar: '🐻', authorTag: '减脂第 7 天',
    timeLabel: '昨天', category: '提问',
    content: '深蹲后大腿前侧酸，是不是动作不对？视频里教练说膝盖不要内扣，但我总控制不住。',
    likes: 89,
  },
  {
    id: 'p_seed_5', authorName: '沐沐', authorAvatar: '🐬', authorTag: '塑形中',
    timeLabel: '2天前', category: '打卡',
    content: '坚持一周每晚饭后 20 分钟跟练，睡眠变好了，早上也不赖床了，记录一下 🧘',
    imageEmoji: '🧘', imageColor: '#E7F0FA', likes: 203,
  },
];

/** 种子评论（postId -> 评论数组，评论数以其长度为准） */
const SEED_COMMENTS = {
  p_seed_1: [
    { id: 'c_seed_1a', postId: 'p_seed_1', author: { name: '阿哲', avatar: '🦁' }, timeLabel: '1小时前', content: '环形进度达标太有成就感了，继续加油！' },
    { id: 'c_seed_1b', postId: 'p_seed_1', author: { name: '小满', avatar: '🐰' }, timeLabel: '40分钟前', content: '沙拉里加个溏心蛋，蛋白质更够～' },
    { id: 'c_seed_1c', postId: 'p_seed_1', author: { name: 'Kevin', avatar: '🐻' }, timeLabel: '20分钟前', content: '求沙拉酱的配方，我用的都是油醋汁' },
  ],
  p_seed_2: [
    { id: 'c_seed_2a', postId: 'p_seed_2', author: { name: '晓雯', avatar: '🦩' }, timeLabel: '4小时前', content: '这也太明显了！锁骨都出来了' },
    { id: 'c_seed_2b', postId: 'p_seed_2', author: { name: '沐沐', avatar: '🐬' }, timeLabel: '3小时前', content: '照片墙这个坚持方式太适合我了，已用上' },
    { id: 'c_seed_2c', postId: 'p_seed_2', author: { name: '小满', avatar: '🐰' }, timeLabel: '2小时前', content: '体脂 17%！求问增肌期怎么兼顾有氧' },
    { id: 'c_seed_2d', postId: 'p_seed_2', author: { name: 'Kevin', avatar: '🐻' }, timeLabel: '1小时前', content: '同一个角度拍真的能看出差别，学到了' },
  ],
  p_seed_3: [
    { id: 'c_seed_3a', postId: 'p_seed_3', author: { name: '晓雯', avatar: '🦩' }, timeLabel: '昨天', content: '宿舍党来答：番茄鸡蛋汤 + 玉米，热量低又顶饱' },
    { id: 'c_seed_3b', postId: 'p_seed_3', author: { name: '阿哲', avatar: '🦁' }, timeLabel: '昨天', content: '小煮锅可以煮荞麦面，配上水煮虾仁，绝了' },
    { id: 'c_seed_3c', postId: 'p_seed_3', author: { name: '沐沐', avatar: '🐬' }, timeLabel: '昨天', content: '提前备好食材，晚上饿了就不想点外卖了' },
  ],
  p_seed_4: [
    { id: 'c_seed_4a', postId: 'p_seed_4', author: { name: '小满', avatar: '🐰' }, timeLabel: '昨天', content: '我之前也一样，把重量降一档，先找对膝盖位置' },
    { id: 'c_seed_4b', postId: 'p_seed_4', author: { name: '沐沐', avatar: '🐬' }, timeLabel: '昨天', content: '对着镜子做，脚趾朝前，想象屁股往后坐' },
    { id: 'c_seed_4c', postId: 'p_seed_4', author: { name: '晓雯', avatar: '🦩' }, timeLabel: '昨天', content: '热身开髋+踝，深蹲前一定要做' },
  ],
  p_seed_5: [
    { id: 'c_seed_5a', postId: 'p_seed_5', author: { name: '阿哲', avatar: '🦁' }, timeLabel: '昨天', content: '跟着练睡眠真的变好了，睡前拉伸太香' },
    { id: 'c_seed_5b', postId: 'p_seed_5', author: { name: '小满', avatar: '🐰' }, timeLabel: '昨天', content: '我也坚持一周了，现在到点就困 😂' },
    { id: 'c_seed_5c', postId: 'p_seed_5', author: { name: 'Kevin', avatar: '🐻' }, timeLabel: '昨天', content: '晚饭后跟练会不会太兴奋影响入睡？' },
    { id: 'c_seed_5d', postId: 'p_seed_5', author: { name: '晓雯', avatar: '🦩' }, timeLabel: '昨天', content: '控制在睡前 1 小时结束，亲测有效' },
  ],
};

/** 种子时光阁（按时间排列的记忆） */
const SEED_PHOTOS = [
  { id: 'ph_seed_1', date: '2026-06-01', day: 1, weight: 72, bodyFat: 24, note: '第 1 天，拍下现在的自己，给未来的一个承诺', emoji: '🌱', color: '#FDF0DC' },
  { id: 'ph_seed_2', date: '2026-06-15', day: 15, weight: 70.5, bodyFat: 23.2, note: '两周了，皮带多扣了一格 ✌️', emoji: '🏃', color: '#E7F0FA' },
  { id: 'ph_seed_3', date: '2026-07-01', day: 30, weight: 69, bodyFat: 22, note: '满月打卡，习惯开始长在身上', emoji: '🧘', color: '#E4F3ED' },
  { id: 'ph_seed_4', date: '2026-07-20', day: 50, weight: 67.5, bodyFat: 21, note: '能明显摸到锁骨了，坚持有回报', emoji: '💪', color: '#FCE9E4' },
  { id: 'ph_seed_5', date: '2026-08-01', day: 62, weight: 66, bodyFat: 20, note: '第 62 天。谢谢你，两个月前的自己', emoji: '✨', color: '#E4F3ED' },
];

/** 种子关注（首屏关注页签有内容） */
const SEED_FOLLOWING = ['晓雯', '阿哲'];

/** 关注我的种子作者（用于互关好友角标；演示数据，无需持久化） */
const SEED_FOLLOWERS = ['晓雯', '沐沐', 'Kevin'];

const CATEGORIES = new Set(['打卡', '食谱', '提问', '晒变化']);

// ---- 认证（可选）：解析到 req.user，未登录则 req.user 为 null，不拦读接口 ----

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const decoded = verifyToken(header.slice(7), 'access');
    if (decoded) req.user = decoded;
  }
  next();
}

/** 写接口要求登录；未登录时回 401 并返回 false */
function requireLogin(req, res) {
  if (!req.user) {
    res.status(401).json({ error: { code: 'TOKEN_MISSING', message: '请先登录后再操作' } });
    return false;
  }
  return true;
}

// ---- 序列化与视图 ----

/** 帖子行/种子 → CommunityPost（与客户端类型对齐） */
function toPostView(row, { comments, likes, liked, canDelete = false }) {
  const post = {
    id: row.id,
    author: { name: row.authorName, avatar: row.authorAvatar, tag: row.authorTag },
    timeLabel: row.timeLabel,
    category: row.category,
    content: row.content,
    likes,
    liked,
    comments,
    // 仅发帖人本人可删帖（种子帖无归属，不可删）
    canDelete,
  };
  if (row.imageEmoji) {
    post.image = { emoji: row.imageEmoji, color: row.imageColor };
    if (row.imageUri) post.image.uri = row.imageUri;
  }
  return post;
}

/** 登录用户的健身目标标签（如「减脂」），没有则省略 */
function authorTagFor(userId) {
  try {
    const goals = db.find('fitness_goals', { userId });
    const goalType = goals[0]?.goalType;
    if (!goalType) return undefined;
    const map = { lose_fat: '减脂', gain_muscle: '增肌', shape: '塑形', maintain: '保持健康' };
    return map[goalType] || goalType;
  } catch {
    return undefined;
  }
}

/** 登录用户的昵称/头像；缺省兜底 */
function authorIdentity(userId) {
  try {
    const user = db.findById('users', userId);
    return {
      name: user?.nickname || '健身新人',
      avatar: user?.avatarUrl || '🌱',
      tag: authorTagFor(userId),
    };
  } catch {
    return { name: '健身新人', avatar: '🌱', tag: undefined };
  }
}

/** 帖子视图：用户新帖（新→旧）+ 种子帖（垫底），附评论数/点赞数/当前用户是否已赞 */
function postsView(userId) {
  const rows = db.find('community_posts').sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const ordered = [...rows, ...SEED_POSTS];

  // 评论计数：DB 评论 + 种子评论
  const commentCounts = {};
  for (const c of db.find('community_comments')) {
    commentCounts[c.postId] = (commentCounts[c.postId] || 0) + 1;
  }
  for (const [postId, list] of Object.entries(SEED_COMMENTS)) {
    commentCounts[postId] = (commentCounts[postId] || 0) + list.length;
  }

  // 点赞：base(帖子 likes 字段) + 按用户点赞行
  const likeCounts = {};
  const likeRows = db.find('community_post_likes');
  const myLiked = new Set();
  for (const like of likeRows) {
    likeCounts[like.postId] = (likeCounts[like.postId] || 0) + 1;
    if (userId && like.userId === userId) myLiked.add(like.postId);
  }

  return ordered.map((row) =>
    toPostView(row, {
      comments: commentCounts[row.id] ?? 0,
      likes: (row.likes || 0) + (likeCounts[row.id] || 0),
      liked: myLiked.has(row.id),
      // 仅作者本人可删；种子帖 userId 为空，任何人都删不了
      canDelete: Boolean(userId && row.userId && row.userId === userId),
    })
  );
}

/** 评论视图：种子评论 + 用户评论，按 postId 分组 */
function commentsView() {
  const map = {};
  for (const [postId, list] of Object.entries(SEED_COMMENTS)) {
    map[postId] = list.map((c) => ({ ...c }));
  }
  for (const row of db.find('community_comments')) {
    const comment = {
      id: row.id,
      postId: row.postId,
      author: { name: row.authorName, avatar: row.authorAvatar },
      timeLabel: row.timeLabel,
      content: row.content,
    };
    (map[row.postId] ||= []).push(comment);
  }
  return map;
}

/** 当前用户的照片墙视图：有 DB 记录用记录，否则用种子 */
function photosView(userId) {
  if (!userId) return SEED_PHOTOS;
  const rows = db.find('community_photos', { userId });
  return rows.length > 0 ? rows : SEED_PHOTOS;
}

/** 当前用户关注列表：有 DB 记录用记录，否则用种子 */
function followingView(userId) {
  if (!userId) return SEED_FOLLOWING;
  const rows = db.find('community_following', { userId });
  return rows.length > 0 ? rows.map((r) => r.followName) : SEED_FOLLOWING;
}

/** 把照片列表整体替换为用户自己的 DB 记录（首次写入时实体化种子） */
function replaceUserPhotos(userId, photos) {
  db.removeMany('community_photos', { userId });
  for (const p of photos) {
    db.insert('community_photos', {
      id: p.id,
      userId,
      date: p.date,
      // sql.js 不允许绑定 undefined，可选字段统一兜底为 null
      day: p.day ?? null,
      weight: p.weight ?? null,
      bodyFat: p.bodyFat ?? null,
      note: p.note ?? null,
      uri: p.uri ?? null,
      emoji: p.emoji ?? null,
      color: p.color ?? null,
    });
  }
}

/** 把关注列表整体替换为用户自己的 DB 记录（首次写入时实体化种子） */
function replaceUserFollowing(userId, names) {
  db.removeMany('community_following', { userId });
  for (const name of names) {
    db.insert('community_following', { userId, followName: name });
  }
}

/** 帖子是否存在（含种子帖） */
function postExists(id) {
  return Boolean(db.findById('community_posts', id) || SEED_POSTS.some((p) => p.id === id));
}

/** 将浏览器临时图片持久化到服务器磁盘，避免其他测试账号看不到 blob 地址。 */
function persistCommunityImage(uri) {
  if (!uri || typeof uri !== 'string') return null;
  if (uri.startsWith('/uploads/community/')) return uri;
  const matched = uri.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!matched) return null;
  const buffer = Buffer.from(matched[2], 'base64');
  if (!buffer.length || buffer.length > MAX_COMMUNITY_IMAGE_BYTES) {
    const error = new Error('COMMUNITY_IMAGE_TOO_LARGE');
    error.code = 'COMMUNITY_IMAGE_TOO_LARGE';
    throw error;
  }
  const extension = matched[1] === 'jpg' ? 'jpeg' : matched[1];
  const filename = `${Date.now()}-${db.generateId().replace(/[^a-zA-Z0-9_-]/g, '')}.${extension}`;
  fs.writeFileSync(path.join(COMMUNITY_UPLOAD_DIR, filename), buffer);
  return `/uploads/community/${filename}`;
}

// ---- 路由 ----

router.use(optionalAuth);

// 动态列表
router.get('/posts', (req, res) => {
  res.json({ data: { posts: postsView(req.user?.userId) } });
});

// 发布动态（需登录；作者取 token 对应用户）
router.post('/posts', (req, res) => {
  if (!requireLogin(req, res)) return;
  const content = String(req.body.content || '').trim();
  if (!content) {
    return res.status(400).json({ error: { code: 'INVALID_PARAMS', message: '动态内容不能为空' } });
  }
  const category = CATEGORIES.has(req.body.category) ? req.body.category : '打卡';
  const image = req.body.image && typeof req.body.image === 'object' ? req.body.image : undefined;
  const author = authorIdentity(req.user.userId);
  let imageUri = null;
  try {
    imageUri = persistCommunityImage(image?.uri);
  } catch (error) {
    if (error.code === 'COMMUNITY_IMAGE_TOO_LARGE') {
      return res.status(413).json({ error: { code: error.code, message: '图片过大，请选择 3MB 以内的图片' } });
    }
    throw error;
  }

  const row = db.insert('community_posts', {
    // 记录发帖人 userId，用于「仅作者可删帖」的权限校验
    userId: req.user.userId,
    authorName: author.name,
    authorAvatar: author.avatar,
    // sql.js 不允许绑定 undefined，可选字段统一兜底为 null
    authorTag: author.tag || null,
    timeLabel: '刚刚',
    category,
    content,
    imageEmoji: image?.emoji || null,
    imageColor: image?.color || null,
    imageUri,
    likes: 0,
  });
  res.status(201).json({ data: toPostView(row, { comments: 0, likes: 0, liked: false, canDelete: true }), message: '发布成功' });
});

// 删除动态（需登录；仅发帖人本人可删，种子帖不可删）
router.delete('/posts/:id', (req, res) => {
  if (!requireLogin(req, res)) return;
  const { id } = req.params;
  const post = db.findById('community_posts', id);
  if (!post) {
    return res.status(404).json({ error: { code: 'POST_NOT_FOUND', message: '动态不存在' } });
  }
  if (post.userId !== req.user.userId) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: '只能删除自己发布的动态' } });
  }
  // 连带清理该帖的点赞与评论
  db.remove('community_posts', id);
  db.removeMany('community_post_likes', { postId: id });
  db.removeMany('community_comments', { postId: id });
  res.json({ data: { id }, message: '已删除' });
});

// 切换点赞（需登录；点赞只对当前用户生效）
router.post('/posts/:id/like', (req, res) => {
  if (!requireLogin(req, res)) return;
  const { id } = req.params;
  if (!postExists(id)) {
    return res.status(404).json({ error: { code: 'POST_NOT_FOUND', message: '动态不存在' } });
  }
  const userId = req.user.userId;
  const existing = db.find('community_post_likes', { postId: id, userId });
  let liked;
  if (existing.length > 0) {
    db.remove('community_post_likes', existing[0].id);
    liked = false;
  } else {
    db.insert('community_post_likes', { postId: id, userId });
    liked = true;
  }
  const base = db.findById('community_posts', id)?.likes || SEED_POSTS.find((p) => p.id === id)?.likes || 0;
  const likes = base + db.find('community_post_likes', { postId: id }).length;
  res.json({ data: { id, likes, liked }, message: liked ? '已点赞' : '已取消点赞' });
});

// 评论列表（postId -> 评论数组）
router.get('/comments', (req, res) => {
  res.json({ data: { comments: commentsView() } });
});

// 发表评论（需登录；作者取 token 对应用户）
router.post('/posts/:id/comments', (req, res) => {
  if (!requireLogin(req, res)) return;
  const { id } = req.params;
  if (!postExists(id)) {
    return res.status(404).json({ error: { code: 'POST_NOT_FOUND', message: '动态不存在' } });
  }
  const content = String(req.body.content || '').trim();
  if (!content) {
    return res.status(400).json({ error: { code: 'INVALID_PARAMS', message: '评论内容不能为空' } });
  }
  const author = authorIdentity(req.user.userId);
  const row = db.insert('community_comments', {
    postId: id,
    authorName: author.name,
    authorAvatar: author.avatar,
    timeLabel: '刚刚',
    content,
  });
  res.status(201).json({
    data: { id: row.id, postId: id, author: { name: author.name, avatar: author.avatar }, timeLabel: '刚刚', content },
    message: '评论成功',
  });
});

// 我的照片墙
router.get('/photos', (req, res) => {
  res.json({ data: { photos: photosView(req.user?.userId) } });
});

// 新增记忆（需登录；按用户隔离）
router.post('/photos', (req, res) => {
  if (!requireLogin(req, res)) return;
  const userId = req.user.userId;
  const body = req.body || {};
  const current = photosView(userId);
  let photoUri = null;
  try {
    photoUri = persistCommunityImage(body.uri);
  } catch (error) {
    if (error.code === 'COMMUNITY_IMAGE_TOO_LARGE') {
      return res.status(413).json({ error: { code: error.code, message: '图片过大，请选择 3MB 以内的图片' } });
    }
    throw error;
  }
  const photo = {
    id: db.generateId(),
    date: String(body.date || new Date().toISOString().slice(0, 10)),
    day: body.day == null ? undefined : Number(body.day),
    weight: body.weight == null ? undefined : Number(body.weight),
    bodyFat: body.bodyFat == null ? undefined : Number(body.bodyFat),
    note: body.note || undefined,
    uri: photoUri || undefined,
    emoji: body.emoji || '🌱',
    color: body.color || '#E4F3ED',
  };
  replaceUserPhotos(userId, [photo, ...current]);
  res.status(201).json({ data: photo, message: '已收进时光阁' });
});

// 删除记忆（需登录；支持删掉种子照片后不复现）
router.delete('/photos/:id', (req, res) => {
  if (!requireLogin(req, res)) return;
  const userId = req.user.userId;
  const current = photosView(userId);
  const next = current.filter((p) => p.id !== req.params.id);
  if (next.length !== current.length) {
    replaceUserPhotos(userId, next);
  }
  res.json({ data: { id: req.params.id }, message: '已删除' });
});

// 我的关注列表
router.get('/following', (req, res) => {
  res.json({ data: { following: followingView(req.user?.userId) } });
});

// 切换关注（需登录；按用户隔离）
router.post('/following/toggle', (req, res) => {
  if (!requireLogin(req, res)) return;
  const userId = req.user.userId;
  const name = String(req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: { code: 'INVALID_PARAMS', message: '缺少关注对象' } });
  }
  const current = followingView(userId);
  const next = current.includes(name) ? current.filter((n) => n !== name) : [...current, name];
  replaceUserFollowing(userId, next);
  res.json({ data: { following: next }, message: next.includes(name) ? '已关注' : '已取消关注' });
});

// 关注我的种子作者（供互关好友角标使用；演示数据）
router.get('/followers', (req, res) => {
  res.json({ data: { followers: SEED_FOLLOWERS } });
});

module.exports = router;

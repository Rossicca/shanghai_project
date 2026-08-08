/** 社区作者 */
export interface CommunityAuthor {
  name: string;
  /** 头像 emoji（本地无真实头像） */
  avatar: string;
  /** 标签，如「减脂第 30 天」 */
  tag?: string;
}

/** 社区动态 */
export interface CommunityPost {
  id: string;
  author: CommunityAuthor;
  /** 相对时间文案，如「2小时前」 */
  timeLabel: string;
  category: '打卡' | '食谱' | '提问' | '晒变化';
  content: string;
  /** 配图：上传的真实图片 uri（可选），无 uri 时用 emoji+色块占位 */
  image?: { uri?: string; emoji: string; color: string };
  likes: number;
  liked: boolean;
  comments: number;
}

/** 帖子评论 */
export interface Comment {
  id: string;
  postId: string;
  author: {
    name: string;
    /** 头像 emoji（本地无真实头像） */
    avatar: string;
  };
  /** 相对时间文案，如「2小时前」；新评论为「刚刚」 */
  timeLabel: string;
  content: string;
}

/** 时光阁条目（按时间记录的锻炼记忆） */
export interface TimelineEntry {
  id: string;
  /** 拍摄日期 YYYY-MM-DD */
  date: string;
  /** 第几天（锻炼坚持天数，可选） */
  day?: number;
  /** 体重（kg，可选） */
  weight?: number;
  /** 体脂率（%，可选） */
  bodyFat?: number;
  /** 当时的记忆/感受 */
  note?: string;
  /** 真实图片 uri（可选，web 本地可用） */
  uri?: string;
  /** 演示封面（无 uri 时用） */
  emoji: string;
  color: string;
}

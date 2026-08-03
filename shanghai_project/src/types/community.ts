/** 社区动态 */
export interface CommunityPost {
  id: string;
  author: {
    name: string;
    /** 头像 emoji（本地无真实头像） */
    avatar: string;
    /** 标签，如「减脂第 30 天」 */
    tag?: string;
  };
  /** 相对时间文案，如「2小时前」 */
  timeLabel: string;
  category: '打卡' | '食谱' | '提问' | '晒变化';
  content: string;
  /** 演示图片占位（本地无真实图片时用 emoji+色块） */
  image?: { emoji: string; color: string };
  likes: number;
  liked: boolean;
  comments: number;
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

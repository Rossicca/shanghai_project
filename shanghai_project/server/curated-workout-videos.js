/** 经人工核验的第三方公开视频目录。只保存外链和公开封面，不下载或二次分发视频。 */
const CURATED_WORKOUT_VIDEOS = [
  {
    id: 'yt-bSZj19AUU5I', title: '新手低冲击有氧与全身塑形跟练', category: '有氧', duration: 1560,
    difficulty: '入门', coach: 'FitnessBlender', calories: 210, coverColor: '#E74C3C',
    sourceUrl: 'https://www.youtube.com/watch?v=bSZj19AUU5I', platform: 'youtube', videoUrl: null,
    coverUrl: 'https://i.ytimg.com/vi/bSZj19AUU5I/maxresdefault.jpg', playCount: 4156812,
    description: 'FitnessBlender 官方低冲击有氧教程。', reason: '来自经过核验的专业健身频道，适合新手或温和训练模式。',
    tags: ['低冲击', '有氧', '新手', '跟练'], fetchedAt: '2026-08-09T00:00:00.000Z', source: 'youtube', createdAt: null, updatedAt: null,
  },
  {
    id: 'yt-AF9d2Icl4fA', title: '全身瑜伽舒展与练后拉伸', category: '拉伸', duration: 1200,
    difficulty: '入门', coach: 'Yoga With Adriene', calories: 70, coverColor: '#1ABC9C',
    sourceUrl: 'https://www.youtube.com/watch?v=AF9d2Icl4fA', platform: 'youtube', videoUrl: null,
    coverUrl: 'https://i.ytimg.com/vi/AF9d2Icl4fA/maxresdefault.jpg', playCount: 1000000,
    description: 'Yoga With Adriene 官方全身瑜伽拉伸。', reason: '动作节奏温和，适合作为恢复日或训练后的舒展参考。',
    tags: ['瑜伽', '全身拉伸', '恢复'], fetchedAt: '2026-08-09T00:00:00.000Z', source: 'youtube', createdAt: null, updatedAt: null,
  },
  {
    id: 'yt-AnYl6Nk9GOA', title: '10 分钟无器械核心训练', category: '核心', duration: 600,
    difficulty: '进阶', coach: 'Pamela Reif', calories: 120, coverColor: '#8E44AD',
    sourceUrl: 'https://www.youtube.com/watch?v=AnYl6Nk9GOA', platform: 'youtube', videoUrl: null,
    coverUrl: 'https://i.ytimg.com/vi/AnYl6Nk9GOA/maxresdefault.jpg', playCount: 111153541,
    description: 'Pamela Reif 官方完整跟练核心训练。', reason: '视频为完整动作跟练并带有安全说明，适合已有一定基础的核心训练。',
    tags: ['核心', '腹肌', '无器械', '跟练'], fetchedAt: '2026-08-09T00:00:00.000Z', source: 'youtube', createdAt: null, updatedAt: null,
  },
  {
    id: 'yt-_8tuB87OoO8', title: '哑铃、踏板与弹力带下肢力量训练', category: '臀腿', duration: 3300,
    difficulty: '挑战', coach: 'FitnessBlender', calories: 430, coverColor: '#2ECC71',
    sourceUrl: 'https://www.youtube.com/watch?v=_8tuB87OoO8', platform: 'youtube', videoUrl: null,
    coverUrl: 'https://i.ytimg.com/vi/_8tuB87OoO8/maxresdefault.jpg', playCount: 132284,
    description: 'FitnessBlender 官方下肢力量与间歇训练。', reason: '器械和训练结构清晰，适合健身房或有器械的渐进训练模式。',
    tags: ['臀腿', '力量训练', '哑铃', '弹力带'], fetchedAt: '2026-08-09T00:00:00.000Z', source: 'youtube', createdAt: null, updatedAt: null,
  },
];

module.exports = { CURATED_WORKOUT_VIDEOS };

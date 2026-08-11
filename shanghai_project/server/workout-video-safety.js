/**
 * 公开视频进入推荐流前的保守安全过滤。
 * 这不是内容平台的完整审核系统，但可以在抓取入库和接口输出之间再加一道闸门：
 * 必须是健身内容、链接来源受控、时长合理，并拦截擦边或夸大身体效果的标题。
 */

const FITNESS_CATEGORIES = new Set(['臀腿', '全身燃脂', '核心', '肩背', '手臂', '有氧', '拉伸']);
const FITNESS_TERMS = /健身|训练|运动|跟练|燃脂|有氧|拉伸|瑜伽|普拉提|塑形|体态|臀|腿|肩|背|手臂|核心|腹|HIIT|跑步|跳绳|深蹲|俯卧撑|力量|关节|热身|放松|弓步蹲|杠铃|哑铃|壶铃|卧推|划船|硬拉|引体|推举|肩推|臀桥|卷腹|平板|波比|高抬腿|开合跳|登山跑|弹力带|自重|器械|徒手/i;
const BLOCKED_TERMS = /丰胸|乳沟|升杯|大胸|胸变大|性感|诱惑|私密|床上|内衣|裸|擦边|成人视频|福利视频|美女热舞|宅男|臀奴|胸器|福利姬/i;
const SAFE_HOSTS = new Set([
  'www.bilibili.com', 'bilibili.com', 'search.bilibili.com',
  'www.douyin.com', 'douyin.com',
]);
const DOMESTIC_PLATFORMS = new Set(['bilibili', 'douyin']);

function isSafeWorkoutVideo(video) {
  if (!video || !FITNESS_CATEGORIES.has(String(video.category || ''))) return false;
  if (!DOMESTIC_PLATFORMS.has(String(video.platform || 'bilibili'))) return false;
  const haystack = [video.title, ...(Array.isArray(video.tags) ? video.tags : [])]
    .filter(Boolean).join(' ');
  if (!FITNESS_TERMS.test(haystack) || BLOCKED_TERMS.test(haystack)) return false;
  const duration = Number(video.duration || 0);
  if (duration && (duration < 10 || duration > 7200)) return false;
  try {
    const url = new URL(video.sourceUrl);
    return url.protocol === 'https:' && SAFE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

function filterSafeWorkoutVideos(videos) {
  return (Array.isArray(videos) ? videos : []).filter(isSafeWorkoutVideo);
}

function mergeCuratedWorkoutVideos(videos) {
  const { CURATED_WORKOUT_VIDEOS } = require('./curated-workout-videos');
  const merged = new Map((Array.isArray(videos) ? videos : []).map((video) => [String(video.id), video]));
  for (const video of CURATED_WORKOUT_VIDEOS) merged.set(String(video.id), video);
  return filterSafeWorkoutVideos([...merged.values()]);
}

module.exports = { isSafeWorkoutVideo, filterSafeWorkoutVideos, mergeCuratedWorkoutVideos, BLOCKED_TERMS };

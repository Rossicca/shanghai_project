const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const { mergeCuratedWorkoutVideos } = require('../workout-video-safety');
const { matchExerciseVideo } = require('../exercise-video-matcher');

const stored = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'workout_videos.json'), 'utf8'));
const videos = mergeCuratedWorkoutVideos(stored);
const cases = [
  ['徒手深蹲', '臀腿'], ['标准俯卧撑', '手臂'], ['臀桥', '臀腿'], ['弓步蹲', '臀腿'],
  ['平板支撑', '核心'], ['死虫式', '核心'], ['哑铃划船', '肩背'], ['哑铃推举', '肩背'],
  ['哑铃弯举', '手臂'], ['动态热身', '全身燃脂'], ['练后全身拉伸', '拉伸'],
];

for (const [name, category] of cases) {
  const matched = matchExerciseVideo({ name, category }, videos, { category });
  assert.ok(matched.video, `${name} 必须有经过核验的视频`);
  assert.ok(['douyin', 'bilibili'].includes(matched.video.platform || 'bilibili'));
  assert.match(matched.video.sourceUrl, /^https:\/\/(www\.)?(douyin|bilibili)\.com\//);
  assert.equal(matched.exact, true, `${name} 不应被替换成不相关动作`);
}

const unknown = matchExerciseVideo({ name: '模型临时创造的未知动作', category: '核心' }, videos, { category: '核心' });
assert.ok(unknown.video);
assert.equal(unknown.exact, false);
assert.notEqual(unknown.displayName, '模型临时创造的未知动作');

console.log(`PASS: ${cases.length} 个训练动作均严格匹配国内视频，未知动作会安全替换`);

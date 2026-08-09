/**
 * 训练计划动作与公开视频的严格匹配层。
 * AI 只生成动作；链接只能来自安全视频库，且必须命中动作别名，不能按大分类随便兜底。
 */
const DOMESTIC_PLATFORMS = new Set(['douyin', 'bilibili']);

const EXERCISE_PROFILES = [
  { key: 'warmup', label: '全身动态热身', category: '全身燃脂', aliases: ['动态热身', '训练前热身', '原地踏步', '低冲击原地踏步', '肩髋环绕', '关节动态活动', '肩髋踝关节动态活动', '髋膝踝关节动态活动', '训练动作轻量预演'], note: '从小幅度开始，逐步提高心率并活动主要关节。' },
  { key: 'stretch', label: '练后全身拉伸', category: '拉伸', aliases: ['全身拉伸', '练后拉伸', '静态拉伸', '下肢肌群静态拉伸', '肩背与躯干舒展', '低强度走动与呼吸恢复', '放松恢复'], note: '动作缓慢、保持自然呼吸，不追求疼痛幅度。' },
  { key: 'squat', label: '徒手深蹲', category: '臀腿', aliases: ['深蹲', '徒手深蹲', '哑铃深蹲', '壶铃深蹲', '杯式深蹲'], note: '膝盖与脚尖方向一致，重心稳定，按可控幅度下蹲。' },
  { key: 'pushup', label: '跪姿或标准俯卧撑', category: '手臂', aliases: ['俯卧撑', '标准俯卧撑', '跪姿俯卧撑', '上斜俯卧撑'], note: '保持头、躯干与骨盆稳定，新手可从跪姿或上斜版本开始。' },
  { key: 'glute_bridge', label: '臀桥', category: '臀腿', aliases: ['臀桥', '负重臀桥', '单腿臀桥'], note: '骨盆保持稳定，以臀部发力抬起，不用腰部过度顶起。' },
  { key: 'lunge', label: '弓步蹲', category: '臀腿', aliases: ['弓步蹲', '反向弓步', '箭步蹲'], note: '前脚踩稳，控制下落，膝关节不适时缩小幅度。' },
  { key: 'plank', label: '平板支撑', category: '核心', aliases: ['平板支撑', '前臂支撑'], note: '收紧核心并保持自然呼吸，腰背不要塌陷。' },
  { key: 'dead_bug', label: '死虫式', category: '核心', aliases: ['死虫式', '死虫'], note: '腰背保持稳定，手脚交替伸展，幅度服从核心控制。' },
  { key: 'bird_dog', label: '鸟狗式', category: '核心', aliases: ['鸟狗式', '鸟狗'], note: '四点支撑保持骨盆稳定，对侧手脚缓慢伸展。' },
  { key: 'row', label: '划船动作', category: '肩背', aliases: ['哑铃划船', '弹力带划船', '坐姿划船', '俯身划船', '划船动作'], note: '先稳定躯干，再让肘部向后，感受肩胛骨自然回收。' },
  { key: 'shoulder', label: '肩背基础训练', category: '肩背', aliases: ['肩胛后缩', '俯身飞鸟', '肩背训练', '开肩美背'], note: '肩部远离耳朵，控制肩胛而不是耸肩借力。' },
  { key: 'shoulder_press', label: '哑铃推举', category: '肩背', aliases: ['哑铃推举', '哑铃推肩', '肩上推举'], note: '保持躯干稳定，手腕与肘部对齐，使用可控重量。' },
  { key: 'arm', label: '哑铃手臂训练', category: '手臂', aliases: ['哑铃弯举', '二头弯举', '臂屈伸', '哑铃臂屈伸', '手臂训练'], note: '固定上臂并控制速度，选择能稳定完成的重量。' },
  { key: 'low_impact', label: '低冲击原地踏步', category: '有氧', aliases: ['低冲击原地踏步', '原地踏步', '低冲击有氧', '站立有氧'], note: '保持能够说短句的强度，避免屏息或追求过快速度。' },
  { key: 'jumping_jack', label: '开合跳', category: '全身燃脂', aliases: ['开合跳', '低冲击开合步'], note: '落地轻柔；需要低冲击时改为左右交替开合步。' },
  { key: 'mountain_climber', label: '登山跑', category: '核心', aliases: ['登山跑', '登山者'], note: '肩膀保持在手腕上方，核心稳定后再逐步加速。' },
  { key: 'full_body', label: '徒手全身循环', category: '全身燃脂', aliases: ['徒手全身', '全身循环', '全身力量', '徒手训练'], note: '优先保证动作质量，根据体感降低速度或减少重复次数。' },
];

const FALLBACK_KEYS = {
  '臀腿': ['squat', 'glute_bridge', 'lunge'],
  '核心': ['dead_bug', 'plank', 'bird_dog'],
  '肩背': ['row', 'shoulder_press', 'shoulder'],
  '手臂': ['pushup', 'arm'],
  '有氧': ['low_impact', 'full_body'],
  '全身燃脂': ['low_impact', 'full_body', 'jumping_jack'],
  '拉伸': ['stretch'],
};

function normalizedText(value) {
  return String(value || '').toLowerCase().replace(/[\s·•_—\-（）()]/g, '');
}

function resolveExerciseProfile(name) {
  const text = normalizedText(name);
  if (!text) return null;
  return EXERCISE_PROFILES.find((profile) =>
    profile.aliases.some((alias) => text.includes(normalizedText(alias)) || normalizedText(alias).includes(text))
  ) || null;
}

function fallbackProfile(category, index = 0) {
  const keys = FALLBACK_KEYS[String(category || '')] || FALLBACK_KEYS['全身燃脂'];
  const key = keys[Math.abs(Number(index) || 0) % keys.length];
  return EXERCISE_PROFILES.find((profile) => profile.key === key);
}

function videoAliases(video) {
  return [video.title, ...(video.tags || []), ...(video.actionAliases || [])]
    .map(normalizedText).filter(Boolean);
}

function isNegated(title, alias) {
  const raw = String(title || '').replace(/\s/g, '');
  const cleanAlias = String(alias || '').replace(/\s/g, '');
  return new RegExp(`(?:无|不做|避免|不含)${cleanAlias}`).test(raw);
}

function matchVideoForProfile(profile, videos) {
  if (!profile) return null;
  const candidates = (Array.isArray(videos) ? videos : [])
    .filter((video) => DOMESTIC_PLATFORMS.has(video.platform || 'bilibili'))
    .map((video) => {
      const haystacks = videoAliases(video);
      let score = 0;
      for (const alias of profile.aliases) {
        const normalizedAlias = normalizedText(alias);
        if (!normalizedAlias || isNegated(video.title, alias)) continue;
        if (normalizedText(video.title).includes(normalizedAlias)) score = Math.max(score, 20 + normalizedAlias.length);
        if ((video.actionAliases || []).some((item) => normalizedText(item) === normalizedAlias)) score = Math.max(score, 30 + normalizedAlias.length);
        if (haystacks.some((text) => text.includes(normalizedAlias))) score = Math.max(score, 12 + normalizedAlias.length);
      }
      if (video.platform === 'douyin') score += 2;
      if (/教学|标准|正确|要领|跟练/.test(String(video.title || ''))) score += 2;
      return { video, score };
    })
    .filter((item) => item.score >= 12)
    .sort((a, b) => b.score - a.score || Number(b.video.playCount || 0) - Number(a.video.playCount || 0));
  return candidates[0]?.video || null;
}

function matchExerciseVideo(exercise, videos, { category, index = 0 } = {}) {
  const requestedName = String(exercise?.name || '').trim();
  const resolved = resolveExerciseProfile(requestedName);
  let profile = resolved || fallbackProfile(exercise?.category || category, index);
  let video = matchVideoForProfile(profile, videos);
  let exact = Boolean(resolved);
  if (!video) {
    const keys = FALLBACK_KEYS[String(exercise?.category || category || '')] || FALLBACK_KEYS['全身燃脂'];
    for (const key of keys) {
      const candidateProfile = EXERCISE_PROFILES.find((item) => item.key === key);
      const candidateVideo = matchVideoForProfile(candidateProfile, videos);
      if (candidateVideo) {
        profile = candidateProfile;
        video = candidateVideo;
        exact = false;
        break;
      }
    }
  }
  return {
    profile,
    video,
    exact,
    displayName: exact ? requestedName : profile.label,
    notes: exact ? String(exercise?.notes || profile.note) : profile.note,
  };
}

module.exports = {
  EXERCISE_PROFILES,
  resolveExerciseProfile,
  matchVideoForProfile,
  matchExerciseVideo,
};

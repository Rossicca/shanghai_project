/**
 * 菜谱生成的厨房条件约束。
 *
 * 每个条件对应：
 *  - prompt：写入 AI system prompt 的硬性要求（推荐候选菜 / 生成完整菜谱都生效）
 *  - forbidden：mock / 兜底数据过滤用的违规正则（命中即排除，如需要明火的烹饪动作）
 *  - maxMinutes：可选，对总时长的硬限制（微波炉快手）
 *
 * 新增条件：在 CONDITIONS 里加一项即可，AI 约束与 mock 过滤会自动生效。
 * 注意：App 端 src/app/recipe/generate.tsx 的 KITCHEN_CONDITIONS 需与本文件的 key 保持一致。
 */

const CONDITIONS = {
  no_flame: {
    label: '无明火条件',
    prompt: '厨房条件为「无明火」：没有燃气灶和明火，只能使用微波炉、电饭煲、空气炸锅等电器，或凉拌、泡制等无需加热的做法。严禁生成任何需要开火的菜谱：不得煎、炒、炸、炖、焖、红烧、爆炒、明火煮、上锅/隔水蒸；步骤中不得出现“开火”“热锅”“起油锅”“锅烧热”“明火”等动作。',
    forbidden: /(煎|炒|炸|炖|焖|红烧|爆|煸|起油锅|开火|热锅|锅烧热|明火|上锅|隔水|煲|煮|热油|水开|焯|烧|蒸锅|蒸笼|蒸屉|水汽|灼|烫|汆|涮|过油|泼油|一锅|干锅|砂锅|小炒|糖醋|宫保|鱼香|油焖|铁锅)/,
    // 候选菜只看菜名/分类/描述时，额外排除明面上就需要开火炖煮的类别（汤羹、粥、饼、水饺、咖喱、意面、白灼、一锅/糖醋等）
    candidateForbidden: /(煎|炒|炸|炖|焖|红烧|爆|煸|煲|煮|汤|粥|饼|水饺|咖喱|意面|灼|烫|汆|涮|过油|泼油|一锅|干锅|砂锅|小炒|糖醋|宫保|鱼香|油焖|铁锅)/,
  },
  no_oven: {
    label: '无烤箱',
    prompt: '厨房条件为「无烤箱」：不得使用烤箱，不得生成需要烤箱的烘焙/烤制类菜谱（蛋糕、面包、吐司、烤鸡、烤蔬菜等）。如需要可用空气炸锅、电饭煲或微波炉替代。',
    forbidden: /(烤箱|烘焙|烤|蛋糕|面包|吐司|曲奇)/,
  },
  microwave_fast: {
    label: '微波炉快手',
    prompt: '厨房条件为「微波炉快手」：全程主要用微波炉完成，总烹饪时间不超过 15 分钟，不得煎、炒、油炸或长时间炖煮。',
    forbidden: /(煎|炒|炸|炖|焖|红烧|爆|煸|烤箱|烘焙|起油锅|热锅)/,
    maxMinutes: 15,
  },
};

/** 归一化并只保留已知的条件 key。 */
function normalizeConditions(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter((key) => CONDITIONS[key]))];
}

/** 生成写入 AI prompt 的条件硬约束文本；无条件返回空串。 */
function buildConditionPrompt(conditions) {
  const list = normalizeConditions(conditions);
  if (!list.length) return '';
  return '\n厨房条件硬性约束（必须严格遵守，逐条执行，不得生成任何违背条件的菜谱）：\n'
    + list.map((key) => `- ${CONDITIONS[key].prompt}`).join('\n');
}

/** 候选菜（name/category/minutes/cookTime）是否满足所有已选条件。 */
function candidateAllowedByConditions(candidate, conditions) {
  const list = normalizeConditions(conditions);
  if (!list.length) return true;
  const haystack = `${candidate.name || ''} ${candidate.category || ''} ${candidate.description || ''}`;
  return list.every((key) => {
    const rule = CONDITIONS[key];
    if ((rule.candidateForbidden || rule.forbidden).test(haystack)) return false;
    if (rule.maxMinutes && Number(candidate.minutes || candidate.cookTime || 999) > rule.maxMinutes) return false;
    return true;
  });
}

/** 完整菜谱（name/description/steps/cookTime）是否满足所有已选条件。 */
function recipeAllowedByConditions(recipe, conditions) {
  const list = normalizeConditions(conditions);
  if (!list.length) return true;
  const haystack = `${recipe.name || ''} ${recipe.description || ''} ${(recipe.steps || []).join(' ')}`;
  return list.every((key) => {
    const rule = CONDITIONS[key];
    if (rule.forbidden.test(haystack)) return false;
    if (rule.maxMinutes && Number(recipe.cookTime || recipe.prepTime || 999) > rule.maxMinutes) return false;
    return true;
  });
}

module.exports = {
  CONDITIONS,
  normalizeConditions,
  buildConditionPrompt,
  candidateAllowedByConditions,
  recipeAllowedByConditions,
};

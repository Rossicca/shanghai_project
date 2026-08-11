/**
 * 视频人工审查的共用规则（导出/审查/应用脚本共用，规则只维护这一份）。
 * 现行 isSafeWorkoutVideo 规则之外，辅助人工判断“不合规”的维度。
 * 这里只是“提示风险”，最终删不删由人工在表格里决定。
 */
const EXTRA_CHECKS = [
  { name: '夸大效果宣传', regex: /(?:天|周|月)(?:瘦|见效|掉|练出|减|速成)|秒瘦|极速瘦|暴瘦|瘦成|狂瘦|一周瘦\d|瘦\d+斤|掉\d+斤|减\d+斤|永不反弹|一劳永逸|躺着瘦|轻松减\b/i },
  // 只挑真正的医疗/康复口吻，不误伤“矫正圆肩驼背”这类正常体态训练话术
  { name: '医疗/康复类', regex: /医疗矫正|运动康复|治疗|疗法|消炎|止痛|疾病|颈椎病|腰间盘|椎间盘|内分泌/i },
  { name: '夸大身材效果', regex: /魔鬼|疯狂燃脂|极速瘦|秒变|立竿见影|效果惊人|神级|终极减脂/i },
  { name: '标题党', regex: /震惊|千万不要|后悔|惊了|别再|一定要看|不看后悔|99%|没人知道|秘密|绝招|遮羞/i },
];

function riskTags(video) {
  const haystack = [video.title, ...(Array.isArray(video.tags) ? video.tags : [])].filter(Boolean).join(' ');
  return EXTRA_CHECKS.filter((c) => c.regex.test(haystack)).map((c) => c.name);
}

module.exports = { EXTRA_CHECKS, riskTags };

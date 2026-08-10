/** 日期格式化工具（输入统一为后端存储的 YYYY-MM-DD） */

/** 2026-08-10 → 2026年8月10日 */
export function formatDate(date: string) {
  const [y, m, d] = date.split('-');
  return `${y}年${Number(m)}月${Number(d)}日`;
}

/** 2026-08-10 → 8月10日（窄卡片用，避免完整日期换行） */
export function formatShortDate(date: string) {
  const [, m, d] = date.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

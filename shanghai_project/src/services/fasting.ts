import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 断食番茄钟（轻断食计时）。
 * 两种模式：
 *  - manual 手动：点"开始禁食"记下起点，显示已禁食时长 / 目标进度
 *  - auto 自动：按预设时间窗（如每晚 20:00 → 次日 12:00）自动判断当前状态
 * demo 阶段数据本地持久化。
 */

const KEY = 'fasting:state';

export type FastingMode = 'manual' | 'auto';

export interface FastingState {
  mode: FastingMode;
  /** 目标禁食时长（小时） */
  targetHours: number;
  /** 手动模式：禁食起点时间戳（ms），null = 未开始 */
  startedAt: number | null;
  /** 最近一次完成的禁食时长（分钟） */
  lastFastMin: number;
  /** 手动模式最近一次开始的时间戳（用于跨天/重启恢复） */
  lastStartAt?: number;
}

const DEFAULT_STATE: FastingState = {
  mode: 'manual',
  targetHours: 16,
  startedAt: null,
  lastFastMin: 0,
};

/** 自动模式默认禁食窗口：每天这段小时内禁食 */
export const AUTO_START_HOUR = 20; // 每天 20:00 开始
export const AUTO_END_HOUR = 12; // 次日 12:00 结束

export async function loadFasting(): Promise<FastingState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

export async function saveFasting(state: FastingState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

/** 手动模式：已禁食秒数 */
export function manualElapsed(state: FastingState, now = Date.now()): number {
  if (!state.startedAt) return 0;
  return Math.max(0, Math.floor((now - state.startedAt) / 1000));
}

/** 目标时长（秒） */
export function targetSeconds(state: FastingState): number {
  return state.targetHours * 3600;
}

export type AutoStatus = 'fasting' | 'window-open' | 'preparing';

/**
 * 自动模式：根据当前时间与预设窗口判断状态。
 * 窗口为 [今天 AUTO_START_HOUR 点, 若已过 START 则到明天 END 点]，跨天。
 */
export function autoStatus(now = new Date()): {
  status: AutoStatus;
  /** 本次禁食已进行秒数 */
  elapsedSec: number;
  /** 禁食窗口开始时刻（Date） */
  start: Date;
  /** 禁食窗口结束时刻（Date） */
  end: Date;
  /** 进食窗口开始时刻（Date） */
  feedStart: Date;
} {
  const start = new Date(now);
  start.setHours(AUTO_START_HOUR, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  end.setHours(AUTO_END_HOUR, 0, 0, 0);

  // 进食窗口 = 本周期结束 → 下一次禁食开始
  const feedStart = new Date(end);
  const nextStart = new Date(feedStart);
  nextStart.setDate(nextStart.getDate() + 1);
  nextStart.setHours(AUTO_START_HOUR, 0, 0, 0);

  if (now >= nextStart) {
    // 已进入下一轮禁食（20:00 之后）
    return {
      status: 'fasting',
      elapsedSec: Math.floor((now.getTime() - nextStart.getTime()) / 1000),
      start: nextStart,
      end: new Date(nextStart.getTime() + (end.getTime() - start.getTime())),
      feedStart,
    };
  }
  if (now >= feedStart) {
    // 进食窗口内
    return {
      status: 'window-open',
      elapsedSec: 0,
      start,
      end,
      feedStart,
    };
  }
  if (now >= start) {
    // 禁食窗口内（今天 20:00 → 次日 12:00）
    return {
      status: 'fasting',
      elapsedSec: Math.floor((now.getTime() - start.getTime()) / 1000),
      start,
      end,
      feedStart,
    };
  }
  // 今天还没到 20:00：等待下一轮
  return {
    status: 'preparing',
    elapsedSec: 0,
    start,
    end,
    feedStart,
  };
}

/** 格式化秒 → HH:MM:SS 或 H 小时 M 分 */
export function fmtHMS(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

import { api } from './api';

/**
 * 每日训练打卡数据服务 — 后端 /api/v1/checkins。
 * 打卡按登录用户记录，每天一次；打卡数计入个人主页「训练次数」。
 */

export interface CheckinStatus {
  /** 今天是否已打卡 */
  checkedInToday: boolean;
  /** 连续打卡天数 */
  streak: number;
  /** 训练总次数（打卡 + 真实训练完成，与 dashboard.totalWorkouts 一致） */
  totalWorkouts: number;
}

/** 查询今日打卡状态 + 连续打卡 + 总训练次数 */
export async function fetchCheckinStatus(): Promise<CheckinStatus> {
  const res = await api.get('/api/v1/checkins');
  return res.data.data as CheckinStatus;
}

/** 每日打卡（后端保证每天一次，重复打卡返回 409） */
export async function submitCheckin(): Promise<CheckinStatus> {
  const res = await api.post('/api/v1/checkins');
  return res.data.data as CheckinStatus;
}

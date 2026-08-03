const express = require('express');
const db = require('../db');
const { generateWorkoutPlan } = require('../ai');

const router = express.Router();
const ALLOWED_GOALS = new Set(['lose_fat', 'gain_muscle', 'shape', 'maintain']);
const ALLOWED_LOCATIONS = new Set(['home', 'gym', 'outdoor']);
const ALLOWED_LEVELS = new Set(['beginner', 'intermediate', 'advanced']);
const HIGH_RISK_PATTERN = /\u80f8\u75db|\u5fc3\u810f|\u5fc3\u810f\u75c5|\u5b55\u671f|\u6000\u5b55|\u672f\u540e|\u9aa8\u6298|\u6655\u53a5|chest pain|pregnan|heart disease|recent surgery/i;
const SAFE_VIDEO_HOSTS = new Set(['www.bilibili.com', 'bilibili.com', 'search.bilibili.com']);

function numberInRange(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

function normalizeRequest(body) {
  return {
    goalType: ALLOWED_GOALS.has(body.goalType) ? body.goalType : 'maintain',
    weeklyFrequency: numberInRange(body.weeklyFrequency, 3, 1, 6),
    sessionDurationMinutes: numberInRange(body.sessionDurationMinutes, 30, 10, 90),
    workoutLocation: ALLOWED_LOCATIONS.has(body.workoutLocation) ? body.workoutLocation : 'home',
    hasEquipment: Boolean(body.hasEquipment),
    fitnessLevel: ALLOWED_LEVELS.has(body.fitnessLevel) ? body.fitnessLevel : 'beginner',
    limitations: Array.isArray(body.limitations)
      ? body.limitations.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
      : [],
  };
}

function safeVideoUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && SAFE_VIDEO_HOSTS.has(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

function findVideo(exercise, videos) {
  const category = String(exercise.category || '');
  return videos.find((video) => video.category === category) ||
    videos.find((video) => (video.tags || []).some((tag) => exercise.name?.includes(tag))) || null;
}

function normalizePlan(raw, input) {
  const videos = db.readCollection('workout_videos');
  const rawDays = Array.isArray(raw.weeklySchedule) ? raw.weeklySchedule : [];
  const days = Array.from({ length: input.weeklyFrequency }, (_, index) => {
    const day = rawDays[index] || rawDays[index % Math.max(rawDays.length, 1)] || {};
    const exercises = (Array.isArray(day.exercises) ? day.exercises : []).slice(0, 8).map((exercise) => {
      const video = findVideo(exercise, videos);
      return {
        name: String(exercise.name || '\u4f4e\u51b2\u51fb\u539f\u5730\u8e0f\u6b65').slice(0, 80),
        sets: numberInRange(exercise.sets, 3, 1, 8),
        reps: String(exercise.reps || '10-12').slice(0, 30),
        restSeconds: numberInRange(exercise.restSeconds, 45, 15, 180),
        notes: String(exercise.notes || '\u4fdd\u6301\u547c\u5438\u5e73\u7a33\uff0c\u4e0d\u9002\u65f6\u7acb\u5373\u505c\u6b62').slice(0, 180),
        videoId: video?.id || null,
        videoUrl: safeVideoUrl(video?.sourceUrl),
      };
    });
    return {
      day: index + 1,
      title: String(day.title || `\u7b2c ${index + 1} \u5929\u8bad\u7ec3`).slice(0, 80),
      durationMinutes: numberInRange(day.durationMinutes, input.sessionDurationMinutes, 10, 90),
      exercises: exercises.length ? exercises : [{
        name: '\u4f4e\u51b2\u51fb\u539f\u5730\u8e0f\u6b65', sets: 3, reps: '40\u79d2', restSeconds: 40,
        notes: '\u4fdd\u6301\u547c\u5438\u5e73\u7a33\uff0c\u4e0d\u9002\u65f6\u7acb\u5373\u505c\u6b62', videoId: null, videoUrl: null,
      }],
    };
  });
  return {
    goalType: input.goalType,
    summary: String(raw.summary || `\u6bcf\u5468 ${input.weeklyFrequency} \u5929\u7684\u5faa\u5e8f\u6e10\u8fdb\u8bad\u7ec3\u8ba1\u5212`).slice(0, 240),
    weeklySchedule: days,
    reminders: (Array.isArray(raw.reminders) ? raw.reminders : [])
      .map((item) => String(item).slice(0, 180)).filter(Boolean).slice(0, 8),
  };
}

router.post('/generate', async (req, res) => {
  const input = normalizeRequest(req.body || {});
  if (input.limitations.some((item) => HIGH_RISK_PATTERN.test(item))) {
    return res.status(422).json({
      error: {
        code: 'PROFESSIONAL_GUIDANCE_REQUIRED',
        message: '\u5f53\u524d\u8eab\u4f53\u9650\u5236\u9700\u5148\u54a8\u8be2\u533b\u751f\u6216\u4e13\u4e1a\u6559\u7ec3\uff0c\u6682\u4e0d\u751f\u6210\u81ea\u52a8\u8ba1\u5212',
      },
    });
  }

  try {
    const generated = await generateWorkoutPlan(input);
    const normalized = normalizePlan(generated, input);
    const record = db.insert('workout_plans', {
      userId: req.user.userId,
      ...normalized,
      reminders: normalized.reminders.length ? normalized.reminders : [
        '\u8bad\u7ec3\u524d\u70ed\u8eab 5 \u5206\u949f',
        '\u4efb\u4f55\u52a8\u4f5c\u5f15\u8d77\u660e\u663e\u75bc\u75db\u65f6\u7acb\u5373\u505c\u6b62',
        '\u6bcf\u5468\u81f3\u5c11\u5b89\u6392 1 \u5929\u5b8c\u6574\u4f11\u606f',
      ],
      disclaimer: '\u672c\u8ba1\u5212\u4e3a\u4e00\u822c\u5065\u8eab\u5efa\u8bae\uff0c\u4e0d\u80fd\u66ff\u4ee3\u533b\u751f\u6216\u4e13\u4e1a\u6559\u7ec3\u7684\u4e2a\u4f53\u5316\u6307\u5bfc\u3002',
    });
    res.json({ data: { ...record, planId: record.id }, message: 'ok' });
  } catch (error) {
    console.error('[workout-plans] generate error:', error);
    res.status(502).json({
      error: { code: 'WORKOUT_PLAN_GENERATION_FAILED', message: '\u5065\u8eab\u8ba1\u5212\u751f\u6210\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5' },
    });
  }
});

router.get('/latest', (req, res) => {
  const plan = db.find('workout_plans', { userId: req.user.userId })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  res.json({ data: plan ? { ...plan, planId: plan.id } : null, message: 'ok' });
});

module.exports = router;

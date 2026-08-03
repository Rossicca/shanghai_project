import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  autoStatus,
  fmtHMS,
  loadFasting,
  manualElapsed,
  saveFasting,
  targetSeconds,
  type FastingMode,
  type FastingState,
} from '@/services/fasting';

const TARGETS = [14, 16, 18];
const AUTO_WINDOW_LABEL = '20:00 → 12:00';
const RING_R = 62;
const RING_C = 2 * Math.PI * RING_R;

/** 圆形环形进度（react-native-svg 画，中心放 children） */
function Ring({ pct, color, children }: { pct: number; color: string; children?: React.ReactNode }) {
  const colors = useTheme();
  const safe = Math.min(100, Math.max(0, pct));
  return (
    <View style={styles.ring}>
      <Svg width={150} height={150}>
        <Circle cx={75} cy={75} r={RING_R} stroke={colors.backgroundSelected} strokeWidth={13} fill="none" />
        <Circle
          cx={75}
          cy={75}
          r={RING_R}
          stroke={color}
          strokeWidth={13}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(safe / 100) * RING_C} ${RING_C}`}
          transform="rotate(-90 75 75)"
        />
      </Svg>
      <View style={styles.ringCenter}>{children}</View>
    </View>
  );
}

/**
 * 断食番茄钟卡片：手动 / 时间窗 两种计时模式。
 * 手动：点"开始禁食"记录起点，实时显示已禁食时长与目标进度。
 * 时间窗：按预设 20:00→12:00 窗口自动判断当前是否在禁食、进行到第几小时。
 */
export function FastingTimer() {
  const colors = useTheme();
  const [state, setState] = useState<FastingState | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadFasting().then(setState);
  }, []);

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  if (!state) return null;

  async function patch(p: Partial<FastingState>) {
    const next = { ...state!, ...p };
    setState(next);
    await saveFasting(next);
  }

  function startFast() {
    patch({ startedAt: Date.now(), lastStartAt: Date.now() });
  }

  async function endFast() {
    const elapsedMin = Math.round(manualElapsed(state!, now) / 60);
    patch({ startedAt: null, lastFastMin: elapsedMin });
  }

  function selectTarget(h: number) {
    patch({ targetHours: h });
  }

  const targetSec = targetSeconds(state);
  const isManual = state.mode === 'manual';

  // 手动模式
  const elapsed = manualElapsed(state, now);
  const pct = targetSec > 0 ? Math.min(100, (elapsed / targetSec) * 100) : 0;
  const remainSec = Math.max(0, targetSec - elapsed);
  const running = state.startedAt != null;

  // 自动模式
  const auto = autoStatus(new Date(now));

  const modeSwitch = (
    <View style={[styles.segment, { backgroundColor: colors.backgroundElement }]}>
      {(
        [
          { key: 'manual', label: '手动' },
          { key: 'auto', label: '时间窗' },
        ] as { key: FastingMode; label: string }[]
      ).map((m) => {
        const active = state.mode === m.key;
        return (
          <Pressable
            key={m.key}
            onPress={() => patch({ mode: m.key })}
            style={[
              styles.segItem,
              active && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
            ]}>
            <Text style={[styles.segText, { color: active ? colors.text : colors.textSecondary }]}>
              {m.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const targetChips = (
    <View style={styles.chips}>
      {TARGETS.map((h) => {
        const active = state.targetHours === h;
        return (
          <Pressable
            key={h}
            onPress={() => selectTarget(h)}
            style={[
              styles.chip,
              { backgroundColor: active ? colors.primary : colors.backgroundElement, borderColor: active ? colors.primary : colors.border },
            ]}>
            <Text style={[styles.chipText, { color: active ? '#fff' : colors.textSecondary }]}>{h}:00</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* 头部 */}
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="hourglass-outline" size={17} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>断食番茄钟</Text>
        </View>
        {modeSwitch}
      </View>

      {isManual ? (
        <>
          {/* 手动模式：圆形环形进度 */}
          <View style={styles.ringRow}>
            <Ring pct={pct} color={running ? colors.primary : colors.primarySoft}>
              <Text style={[styles.clock, { color: colors.text }]}>{fmtHMS(elapsed)}</Text>
              <Text style={[styles.clockLabel, { color: colors.textSecondary }]}>
                {running ? '已禁食' : '本次已禁食'}
              </Text>
              <Text style={[styles.targetText, { color: colors.primary }]}>目标 {state.targetHours}h</Text>
            </Ring>
          </View>

          {running ? (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              距离目标还差 {fmtHMS(remainSec)}
              {state.lastFastMin > 0 ? ` · 上次坚持 ${Math.floor(state.lastFastMin / 60)}h${state.lastFastMin % 60}m` : ''}
            </Text>
          ) : (
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              {state.lastFastMin > 0
                ? `上次坚持 ${Math.floor(state.lastFastMin / 60)}h${state.lastFastMin % 60}m，再来一轮？`
                : '点开始禁食，记录你的轻断食时长'}
            </Text>
          )}

          {/* 操作按钮 */}
          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: running ? colors.danger : colors.primary },
            ]}
            onPress={running ? endFast : startFast}>
            <Ionicons name={running ? 'stop' : 'play'} size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>{running ? '结束禁食' : '开始禁食'}</Text>
          </Pressable>

          {targetChips}
        </>
      ) : (
        <>
          {/* 自动时间窗模式：圆形环形进度 */}
          <View style={styles.ringRow}>
            <Ring
              pct={
                auto.status === 'fasting'
                  ? Math.min(100, (auto.elapsedSec / (16 * 3600)) * 100)
                  : auto.status === 'window-open'
                    ? 100
                    : 0
              }
              color={auto.status === 'fasting' ? colors.primary : colors.primarySoft}>
              <Text style={[styles.clock, { color: colors.text }]}>
                {auto.status === 'fasting'
                  ? fmtHMS(auto.elapsedSec)
                  : auto.status === 'window-open'
                    ? '0:00'
                    : '--:--'}
              </Text>
              <Text style={[styles.clockLabel, { color: colors.textSecondary }]}>
                {auto.status === 'fasting'
                  ? '已禁食'
                  : auto.status === 'window-open'
                    ? '进食窗口'
                    : '等待下一轮'}
              </Text>
              <Text style={[styles.targetText, { color: colors.primary }]}>{AUTO_WINDOW_LABEL}</Text>
            </Ring>
          </View>

          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {auto.status === 'fasting'
              ? `禁食窗口 ${AUTO_WINDOW_LABEL}，目标 16h · 演示数据`
              : auto.status === 'window-open'
                ? '现在是进食窗口，下一轮禁食将在 20:00 开始'
                : `距今晚 ${AUTO_WINDOW_LABEL.split(' → ')[0]} 下一轮禁食开始`}
          </Text>

          <View style={[styles.autoBadge, { backgroundColor: colors.primarySoft }]}>
            <Ionicons
              name={auto.status === 'fasting' ? 'flame' : auto.status === 'window-open' ? 'restaurant' : 'time'}
              size={15}
              color={colors.success}
            />
            <Text style={[styles.autoBadgeText, { color: colors.success }]}>
              {auto.status === 'fasting' ? '禁食中' : auto.status === 'window-open' ? '可进食' : '准备中'}
            </Text>
          </View>

          {targetChips}
        </>
      )}

      <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
        轻断食建议仅供参考，非医疗用途 · 演示数据
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  iconWrap: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800' },
  segment: { flexDirection: 'row', padding: 3, borderRadius: Radius.chip },
  segItem: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, alignItems: 'center' },
  segText: { fontSize: 12, fontWeight: '700' },
  // 环形进度
  ringRow: { alignItems: 'center' },
  ring: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', gap: 1 },
  clock: { fontSize: 26, fontWeight: '800', letterSpacing: 1, fontVariant: ['tabular-nums'] },
  clockLabel: { fontSize: 11, color: '#5A7A6F' },
  targetText: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  hint: { fontSize: 12, lineHeight: 18 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.button,
    paddingVertical: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: Spacing.two },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.chip, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  autoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  autoBadgeText: { fontSize: 12, fontWeight: '700' },
  disclaimer: { fontSize: 10, textAlign: 'center' },
});

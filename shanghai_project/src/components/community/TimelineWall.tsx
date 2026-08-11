import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirmDialog } from '@/utils/dialog';
import { formatShortDate } from '@/utils/date';
import type { TimelineEntry } from '@/types/community';

type Props = {
  entries: TimelineEntry[];
  onAdd: () => void;
  onRemove: (id: string) => void;
};

/** 卡片固定高度（保证节点与轴线对齐） */
const CARD_H = 200;
/** 图片区高度 */
const PHOTO_H = 136;
/** 卡片纵向间距 */
const ITEM_GAP = 16;
/** S 曲线周期数（2 ≈ 两个 S 弯） */
const WAVE_PERIOD = 2;
/** 顶部/底部留白 */
const TOP_PAD = 60;
const BOTTOM_PAD = 60;

/** 曲线振幅：随屏宽缩放（窄屏收小 → 卡片更宽，手机端更好读） */
function curveAmp(width: number) {
  return width < 480
    ? Math.min(width * 0.05, 26)
    : Math.min(width * 0.16, 72);
}

/** S 曲线 x 坐标：给定纵向 y(px, 从顶部起算) 与整条线高度，返回曲线 x */
function waveX(y: number, height: number, width: number) {
  const t = height > 0 ? y / height : 0; // 0(顶) → 1(底)
  const amp = curveAmp(width);
  return width / 2 + amp * Math.sin(t * Math.PI * 2 * WAVE_PERIOD);
}

/** 生成整条 S 曲线 SVG path（点足够密 → 视觉平滑） */
function buildAxisPath(width: number, height: number) {
  const step = 4;
  const points: string[] = [];
  for (let y = 0; y <= height; y += step) {
    points.push(`${waveX(y, height, width).toFixed(1)},${y.toFixed(1)}`);
  }
  return `M ${points.join(' L ')}`;
}

/** 卡片宽度：中线到曲线(振幅)之间留缝，确保左右两侧卡片不重叠 */
function cardWidth(width: number) {
  const w = width / 2 - curveAmp(width) - 14;
  return Math.min(280, Math.max(120, w));
}

/** 时光阁：氛围封面 + S 形蜿蜒曲线记忆墙（节点由下至上，卡片左右交替） */
export function TimelineWall({ entries, onAdd, onRemove }: Props) {
  const colors = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const avail = Math.min(windowWidth, 480) - Spacing.three * 2;
  const cw = cardWidth(avail);

  // 由下至上：ITEMS[0] 在最底部（最早），越往上越新
  const sorted = [...entries].sort((a, b) => (a.date > b.date ? 1 : -1));
  const totalDays = sorted[0]?.day ?? sorted.length;
  const start = sorted[0];
  const end = sorted[sorted.length - 1];
  const lost =
    start && end && start.weight != null && end.weight != null
      ? start.weight - end.weight
      : null;

  const count = sorted.length;
  const spacing = CARD_H + ITEM_GAP;
  const height = TOP_PAD + BOTTOM_PAD + spacing * count;
  const baseY = height - BOTTOM_PAD - spacing / 2; // 底部第一个节点中心 y
  const axisPath = count > 0 ? buildAxisPath(avail, height) : '';

  return (
    <View style={styles.wrap}>
      {/* 氛围封面卡：叠层色块制造渐变光晕 */}
      <View style={[styles.cover, { backgroundColor: colors.primarySoft }]}>
        <View style={[styles.coverGlow, styles.glowBig, { backgroundColor: colors.primary }]} />
        <View style={[styles.coverGlow, styles.glowSmall, { backgroundColor: '#FDF0DC' }]} />
        <View style={styles.coverIcon}>
          <Ionicons name="time-outline" size={30} color="#16382E" />
        </View>
        <Text style={styles.coverTitle}>我的时光阁</Text>
        <Text style={styles.coverSub}>把锻炼的每一天，收进这里</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{totalDays}</Text>
            <Text style={styles.statLabel}>坚持天数</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{count}</Text>
            <Text style={styles.statLabel}>记忆卡片</Text>
          </View>
          {lost != null && lost > 0 ? (
            <>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={[styles.statNum, { color: colors.success }]}>-{lost.toFixed(1)}</Text>
                <Text style={styles.statLabel}>kg 变化</Text>
              </View>
            </>
          ) : null}
        </View>
      </View>

      {/* 添加记忆：置于照片上方，随手可收 */}
      <Pressable style={[styles.addBtn, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]} onPress={onAdd}>
        <Ionicons name="add" size={20} color={colors.success} />
        <Text style={[styles.addText, { color: colors.success }]}>收一张今天的记忆</Text>
      </Pressable>

      {/* S 形蜿蜒时间轴 */}
      <View style={{ height }}>
        {/* 蜿蜒的 S 曲线 */}
        <Svg width={avail} height={height} style={styles.axisSvg} pointerEvents="none">
          <Path
            d={axisPath}
            stroke={colors.primary}
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            opacity={0.75}
          />
        </Svg>

        {sorted.map((entry, i) => {
          // i=0 在底部，越往上越新；节点圆心精准落在 S 曲线上
          const nodeY = baseY - i * spacing;
          const nodeX = waveX(nodeY, height, avail);
          // 节点在曲线右半侧 → 卡片放右侧；左半侧 → 放左侧（照片沿曲线两侧铺开）
          const onRight = nodeX >= avail / 2;

          // 卡片水平定位：贴曲线外侧 + 边界夹取，保证不溢出
          const left = onRight
            ? Math.min(nodeX + 16, avail - cw - 6)
            : Math.max(nodeX - 16 - cw, 6);

          return (
            <View key={entry.id}>
              {/* 圆点定位点（骑在 S 曲线上） */}
              <View
                style={[
                  styles.dot,
                  { left: nodeX - 9, top: nodeY - 9, borderColor: colors.background, shadowColor: colors.primary },
                ]}
              />
              {/* 时光卡：图片 + 短日期 + 体重/体脂；点卡片进详情，完整备注在详情页 */}
              <Pressable
                onPress={() => router.push(`/community/photo/${encodeURIComponent(entry.id)}` as Href)}
                style={[styles.card, { left, top: nodeY - CARD_H / 2, width: cw, backgroundColor: colors.card }]}>
                <View style={[styles.photo, { backgroundColor: entry.color }]}>
                  {entry.uri ? (
                    <Image source={{ uri: entry.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Ionicons name="image-outline" size={34} color="#5A7A6F" />
                  )}
                  {entry.day != null ? (
                    <View style={[styles.dayBadge, { backgroundColor: colors.primarySoft }]}>
                      <Text style={[styles.dayText, { color: colors.success }]}>第 {entry.day} 天</Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.date, { color: colors.text }]}>{formatShortDate(entry.date)}</Text>
                  {entry.weight != null ? (
                    <Text style={[styles.metric, { color: colors.textSecondary }]}>
                      体重 {entry.weight}kg{entry.bodyFat != null ? ` · 体脂 ${entry.bodyFat}%` : ''}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  hitSlop={6}
                  style={styles.delBtn}
                  onPress={() =>
                    confirmDialog({
                      title: '删除这条记忆',
                      message: '删除后不可恢复，确定删除吗？',
                      confirmText: '删除',
                      cancelText: '取消',
                      destructive: true,
                      onConfirm: () => onRemove(entry.id),
                    })
                  }>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </Pressable>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  // 封面
  cover: {
    borderRadius: Radius.card,
    padding: Spacing.four,
    overflow: 'hidden',
    alignItems: 'center',
    gap: Spacing.one,
  },
  coverGlow: { position: 'absolute', borderRadius: 999, opacity: 0.35 },
  glowBig: { width: 200, height: 200, top: -90, right: -60 },
  glowSmall: { width: 120, height: 120, bottom: -50, left: -30 },
  coverIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  coverTitle: { fontSize: 22, fontWeight: '800', color: '#16382E', marginTop: Spacing.one },
  coverSub: { fontSize: 12, color: '#5A7A6F' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, marginTop: Spacing.three },
  stat: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 20, fontWeight: '800', color: '#16382E' },
  statLabel: { fontSize: 11, color: '#5A7A6F' },
  statDivider: { width: 1, height: 26, backgroundColor: 'rgba(90,122,111,0.25)' },
  // 时间轴
  axisSvg: { position: 'absolute', top: 0, left: 0 },
  dot: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  card: {
    position: 'absolute',
    borderRadius: Radius.card,
    height: CARD_H,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  photo: {
    width: '100%',
    height: PHOTO_H,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { padding: Spacing.two + 2, gap: 4 },
  date: { fontSize: 13, fontWeight: '700' },
  dayBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.chip,
  },
  dayText: { fontSize: 11, fontWeight: '700' },
  metric: { fontSize: 12 },
  delBtn: { position: 'absolute', top: 8, right: 8 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: 13,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addText: { fontSize: 14, fontWeight: '700' },
});

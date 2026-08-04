import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** 用户目标热量，用于对比（可空） */
  targetCalories?: number;
};

const SIZE = 140;
const RADIUS = 52;
const STROKE = 14;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** 营养信息：三大营养素环形图 + 热量对比 */
export function NutritionInfo({ calories, protein, carbs, fat, targetCalories }: Props) {
  const colors = useTheme();
  const safeCalories = Number.isFinite(calories) ? Math.max(0, calories) : 0;
  const safeProtein = Number.isFinite(protein) ? Math.max(0, protein) : 0;
  const safeCarbs = Number.isFinite(carbs) ? Math.max(0, carbs) : 0;
  const safeFat = Number.isFinite(fat) ? Math.max(0, fat) : 0;
  const total = Math.max(safeProtein + safeCarbs + safeFat, 1);

  // 蛋白/碳水/脂肪 三段弧
  const segments = [
    { key: '蛋白质', value: safeProtein, color: colors.success },
    { key: '碳水', value: safeCarbs, color: colors.warning },
    { key: '脂肪', value: safeFat, color: '#9B59B6' },
  ];

  let acc = 0;
  const arcs = segments.map((s) => {
    const frac = s.value / total;
    const dash = frac * CIRCUMFERENCE;
    const startOffset = -(acc * CIRCUMFERENCE);
    acc += frac;
    return { ...s, dash, startOffset };
  });

  const status = targetCalories
    ? safeCalories <= targetCalories * 1.05
      ? safeCalories >= targetCalories * 0.85
        ? '达标'
        : '偏低'
      : '超标'
    : '--';

  return (
    <Card style={styles.card}>
      <ThemedText type="smallBold">营养信息</ThemedText>

      <View style={styles.body}>
        <View style={styles.donutWrap}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={colors.backgroundElement} strokeWidth={STROKE} fill="none" />
            {arcs.filter((a) => a.dash > 0).map((a) => (
              <Circle
                key={a.key}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={a.color}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={[
                  Math.max(a.dash, 0.001),
                  Math.max(CIRCUMFERENCE - a.dash, 0.001),
                ]}
                strokeDashoffset={Number.isFinite(a.startOffset) ? a.startOffset : 0}
                strokeLinecap="butt"
                rotation={-90}
                origin={`${SIZE / 2}, ${SIZE / 2}`}
              />
            ))}
          </Svg>
          <View style={styles.donutCenter}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text }}>{safeCalories}</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>千卡</Text>
          </View>
        </View>

        <View style={styles.info}>
          {segments.map((s) => (
            <View key={s.key} style={styles.infoRow}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={{ color: colors.text, flex: 1 }}>{s.key}</Text>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{s.value}g</Text>
            </View>
          ))}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={{ color: colors.text, flex: 1 }}>蛋白占比</Text>
            <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>
              {Math.round((safeProtein / total) * 100)}%
            </Text>
          </View>
        </View>
      </View>

      {targetCalories ? (
        <View style={[styles.targetRow, { backgroundColor: colors.primarySoft }]}>
          <ThemedText type="small" themeColor="primary">
            你的目标 {targetCalories} 千卡 · 本菜 {safeCalories} 千卡
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: status === '达标' ? colors.success : status === '超标' ? colors.danger : colors.warning }]}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{status}</Text>
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.three },
  body: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four },
  donutWrap: { alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  info: { flex: 1, gap: Spacing.two },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  dot: { width: 10, height: 10, borderRadius: 5 },
  divider: { height: 1 },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    padding: Spacing.two + 2,
  },
  statusBadge: { paddingHorizontal: Spacing.two + 4, paddingVertical: 2, borderRadius: 10 },
});

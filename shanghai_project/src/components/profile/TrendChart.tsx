import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';
import type { BodySnapshot } from '@/services/user';

type Props = {
  data: BodySnapshot[];
  /** 取哪个指标：weight 或 bodyFat */
  field: 'weight' | 'bodyFat';
  unit?: string;
};

const W = 320;
const H = 140;
const PAD_X = 24;
const PAD_Y = 18;

/** 轻量折线趋势图（SVG 自绘，避免依赖兼容问题） */
export function TrendChart({ data, field, unit = 'kg' }: Props) {
  const colors = useTheme();

  const values = data
    .map((d) => (field === 'weight' ? d.weight : d.bodyFat))
    .filter((v): v is number => typeof v === 'number');

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);
  const points = values.map((v, i) => {
    const x = PAD_X + (i / (values.length - 1)) * (W - PAD_X * 2);
    const y = PAD_Y + (1 - (v - min) / range) * (H - PAD_Y * 2);
    return { x, y, v };
  });
  const line = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.wrap}>
      <Svg width={W} height={H}>
        <Line x1={PAD_X} y1={PAD_Y} x2={PAD_X} y2={H - PAD_Y} stroke={colors.border} strokeWidth={1} />
        <Line x1={PAD_X} y1={H - PAD_Y} x2={W - PAD_X} y2={H - PAD_Y} stroke={colors.border} strokeWidth={1} />
        <Polyline points={line} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinejoin="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={colors.primary} />
        ))}
        <SvgText x={4} y={PAD_Y + 4} fontSize={10} fill={colors.textSecondary}>
          {max}
        </SvgText>
        <SvgText x={4} y={H - PAD_Y + 2} fontSize={10} fill={colors.textSecondary}>
          {min}
        </SvgText>
      </Svg>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.label, { color: colors.textSecondary }]}>
            {d.date.slice(5)}
          </Text>
        ))}
      </View>
      <Text style={[styles.unit, { color: colors.textSecondary }]}>
        最近 {data.length} 次记录 · {field === 'weight' ? `体重 ${unit}` : '体脂率 %'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  labels: { flexDirection: 'row', justifyContent: 'space-between', width: W - PAD_X * 2, marginTop: 2 },
  label: { fontSize: 10 },
  unit: { fontSize: 11, marginTop: 8 },
});

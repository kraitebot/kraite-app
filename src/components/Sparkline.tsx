import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Line, Path, Stop } from 'react-native-svg';

let nextGradientId = 0;

export function Sparkline({ values, color, height = 38, opacity = 1 }: {
  values: number[];
  color: string;
  height?: number;
  opacity?: number;
}) {
  const [gradientId] = useState(() => `spark-area-${nextGradientId++}`);
  const recent = values.filter(Number.isFinite).slice(-18);

  if (recent.length < 2) return <View style={[styles.empty, { height }]} />;

  const width = 124;
  const chartTop = 3;
  const chartBottom = height - 4;
  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const range = Math.max(max - min, 0.0001);
  const points = recent.map((value, index) => ({
    x: (index / (recent.length - 1)) * width,
    y: chartBottom - ((value - min) / range) * (chartBottom - chartTop),
  }));
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const end = points[points.length - 1]!;

  return (
    <View style={[styles.spark, { height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" opacity={opacity}>
        <Defs>
          <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.28} />
            <Stop offset="1" stopColor={color} stopOpacity={0.02} />
          </SvgLinearGradient>
        </Defs>
        <Line x1="0" y1={chartBottom} x2={width} y2={chartBottom} stroke={color} strokeOpacity={0.12} strokeWidth="1" />
        <Path d={area} fill={`url(#${gradientId})`} />
        <Path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <Circle cx={end.x} cy={end.y} r="2.8" fill={color} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  spark: { width: '100%', marginTop: 'auto' },
  empty: { width: '100%' },
});

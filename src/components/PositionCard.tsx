import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Animated, Image, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { Position } from '../api/types';
import { money, percent } from '../dashboard/formatters';
import { positionNextTarget, POSITION_LABELS, positionTrackMarkers } from '../dashboard/trackLayout';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';

export function PositionCard({ position, reduceMotion }: { position: Position; reduceMotion: boolean }) {
  const { palette } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const chevronProgress = useRef(new Animated.Value(0)).current;
  const long = position.direction === 'LONG';
  const accent = long ? palette.green : palette.red;
  const tint = long ? palette.greenSoft : palette.redSoft;
  const pnl = Number(position.pnl ?? 0);
  const hasFilledLimits = position.filled_count > 0;
  const track = position.track;
  const trackMarkers = track ? positionTrackMarkers(track) : [];
  const nextTarget = positionNextTarget(position.next_limit_price, position.stop_loss_price);
  const nextTargetLabel = nextTarget.label;
  const nextTargetPrice = nextTarget.price;

  const toggleExpanded = () => {
    const next = !expanded;
    if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(next);
    Animated.timing(chevronProgress, {
      toValue: next ? 1 : 0,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: true,
    }).start();
  };

  const chevronRotation = chevronProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[styles.position, { backgroundColor: palette.panel, borderColor: accent }]}>
      <Pressable
        onPress={toggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={`${position.token ?? position.symbol} position details`}
        accessibilityHint={expanded ? 'Collapses position details' : 'Expands position details'}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.positionSummary, { backgroundColor: tint }, pressed && styles.positionPressed]}
      >
        <View style={styles.positionIdentity}>
          {position.token_image ? <Image source={{ uri: position.token_image }} style={styles.tokenImage} /> : <View style={[styles.tokenFallback, { backgroundColor: palette.canvasRaised }]}><Text style={[styles.tokenFallbackText, { color: palette.text }]}>{(position.token ?? '?').slice(0, 2)}</Text></View>}
          <View style={styles.positionName}>
            <View style={styles.tokenRow}><Text style={[styles.token, { color: palette.text }]}>{position.token ?? position.symbol}</Text><Text numberOfLines={1} style={[styles.tokenName, { color: palette.textSoft }]}>{position.token_name}</Text></View>
            <View style={styles.positionMeta}>
              <Text style={[styles.direction, { color: accent, backgroundColor: palette.panel }]}>{long ? '↑' : '↓'} {position.direction} {position.leverage}×</Text>
              <Ionicons name="time-outline" size={13} color={palette.textSoft} />
              <Text style={[styles.age, { color: palette.textSoft }]}>{position.age_human ?? 'now'}</Text>
              <Text style={[styles.filledBadge, {
                color: hasFilledLimits ? palette.amber : palette.text,
                backgroundColor: hasFilledLimits ? palette.amberSoft : palette.panel,
                borderColor: hasFilledLimits ? palette.amber : palette.line,
              }]}>{POSITION_LABELS.filled} {position.filled_count}/{position.total_limits}</Text>
            </View>
          </View>
          <View style={styles.positionSignals}>
            <View style={styles.dots}>{position.timeframe_dots.slice(0, 4).map((dot) => <View key={dot.timeframe} style={[styles.dot, { backgroundColor: dot.direction === 'up' ? palette.green : dot.direction === 'down' ? palette.red : palette.textFaint }]} />)}</View>
            <View style={[styles.expandButton, { backgroundColor: palette.panel, borderColor: palette.line }]}>
              <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}><Ionicons name="chevron-down" size={17} color={accent} /></Animated.View>
            </View>
          </View>
        </View>

        <View style={[styles.positionQuickMetrics, { backgroundColor: palette.panel, borderColor: palette.line }]}>
          <CompactMetric label={POSITION_LABELS.pnl} value={money(position.pnl)} color={pnl >= 0 ? palette.green : palette.red} accentColor={pnl >= 0 ? palette.green : palette.red} borderRight borderBottom />
          <CompactMetric label={POSITION_LABELS.alphaPath} value={percent(position.alpha_path_pct, false)} color={accent} accentColor={accent} borderBottom />
          <CompactMetric label={POSITION_LABELS.alphaLimit} value={percent(position.alpha_limit_pct, false)} color={palette.text} accentColor={palette.amber} borderRight />
          <CompactMetric label={nextTargetLabel} value={nextTargetPrice ?? '—'} color={nextTargetLabel === POSITION_LABELS.stopLoss ? palette.red : palette.text} accentColor={nextTargetLabel === POSITION_LABELS.stopLoss ? palette.red : palette.textSoft} />
        </View>
      </Pressable>

      {expanded ? <View style={styles.positionBody}>
        <View style={styles.trackFrame}>
          <View style={[styles.track, { backgroundColor: palette.track }]} />
          {track ? <>
            {track.gain_width > 0 ? <View style={[styles.trackGain, { backgroundColor: accent, left: `${track.gain_left}%`, width: `${track.gain_width}%` }]} /> : null}
            {track.rungs.map((rung) => <View key={rung.index} style={[styles.rung, { left: `${rung.pct}%`, borderColor: palette.panel, backgroundColor: palette.track }]}><Text style={[styles.rungText, { color: palette.textSoft }]}>{rung.index}</Text></View>)}
            {trackMarkers.map((marker) => {
              const markerColor = marker.key === 'sl' ? palette.red : marker.key === 'tp' ? accent : palette.text;
              const markerBackground = marker.key === 'sl' ? palette.redSoft : markerColor;
              return <View key={marker.key} style={[styles.trackMarker, { left: `${marker.pct}%` }]}>
                <Text style={[styles.trackMarkerLabel, { color: markerColor }]}>{marker.label}</Text>
                <View style={[styles.trackMarkerDot, { backgroundColor: markerBackground, borderColor: marker.key === 'sl' ? palette.red : palette.panel }]} />
              </View>;
            })}
          </> : null}
        </View>

        <View style={[styles.executionGrid, { borderColor: palette.line }]}>
          <ExecutionColumn
            label={POSITION_LABELS.alphaPath}
            value={percent(position.alpha_path_pct, false)}
            color={accent}
            secondaryLabel={position.entry_label.toUpperCase()}
            secondaryValue={position.entry_price}
            secondaryColor={palette.text}
          />
          <ExecutionColumn
            label={POSITION_LABELS.alphaLimit}
            value={percent(position.alpha_limit_pct, false)}
            color={palette.text}
            secondaryLabel={POSITION_LABELS.takeProfit}
            secondaryValue={position.profit_price}
            secondaryColor={accent}
            align="center"
            bordered
          />
          <ExecutionColumn
            label={POSITION_LABELS.filled}
            value={`${position.filled_count} / ${position.total_limits}`}
            color={palette.text}
            secondaryLabel={nextTargetLabel}
            secondaryValue={nextTargetPrice}
            secondaryColor={nextTargetLabel === POSITION_LABELS.stopLoss ? palette.red : palette.text}
            align="right"
            bordered
          />
        </View>
        <View style={styles.positionFooter}>
          <Text style={[styles.footerSize, { color: palette.textFaint }]}>{POSITION_LABELS.size} {money(position.size)}</Text>
          <Text style={[styles.footerPnl, { color: pnl >= 0 ? palette.green : palette.red }]}>{money(position.pnl)}</Text>
        </View>
      </View> : null}
    </View>
  );
}

function CompactMetric({ label, value, color, accentColor, borderRight, borderBottom }: {
  label: string;
  value: string;
  color: string;
  accentColor: string;
  borderRight?: boolean;
  borderBottom?: boolean;
}) {
  const { palette } = useTheme();
  return <View style={[
    styles.compactMetric,
    borderRight && styles.compactMetricBorderRight,
    borderBottom && styles.compactMetricBorderBottom,
    { borderColor: palette.line },
  ]}>
    <View style={styles.compactMetricHeader}>
      <View style={[styles.compactMetricAccent, { backgroundColor: accentColor }]} />
      <Text numberOfLines={1} style={[styles.compactMetricLabel, { color: palette.textSoft }]}>{label}</Text>
    </View>
    <Text numberOfLines={1} style={[styles.compactMetricValue, { color }]}>{value}</Text>
  </View>;
}

function ExecutionColumn({ label, value, color, secondaryLabel, secondaryValue, secondaryColor, align = 'left', bordered = false }: {
  label: string;
  value: string;
  color: string;
  secondaryLabel: string;
  secondaryValue: string | null;
  secondaryColor: string;
  align?: 'left' | 'center' | 'right';
  bordered?: boolean;
}) {
  const { palette } = useTheme();
  const alignment = align === 'center' ? styles.alignCenter : align === 'right' ? styles.alignRight : null;
  const textAlignment = align === 'center' ? styles.textCenter : align === 'right' ? styles.textRight : styles.textLeft;
  return <View style={[styles.executionColumn, bordered && styles.executionColumnBorder, bordered && { borderLeftColor: palette.line }, alignment]}>
    <View style={[styles.executionReading, alignment]}>
      <Text style={[styles.executionLabel, textAlignment, { color: palette.textSoft }]}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.executionValue, textAlignment, { color }]}>{value}</Text>
    </View>
    <View style={[styles.executionDivider, { backgroundColor: palette.line }]} />
    <View style={[styles.executionReading, alignment]}>
      <Text style={[styles.executionLabel, textAlignment, { color: palette.textSoft }]}>{secondaryLabel}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.executionPriceValue, textAlignment, { color: secondaryColor }]}>{secondaryValue ?? '—'}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  position: { borderWidth: 1.2, borderRadius: radius.card, overflow: 'hidden' },
  positionSummary: { padding: spacing(1.5), gap: spacing(1.25) },
  positionPressed: { opacity: 0.82 },
  positionIdentity: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  tokenImage: { width: 38, height: 38, borderRadius: 19 },
  tokenFallback: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  tokenFallbackText: { fontFamily: fonts.monoBold, fontSize: 12 },
  positionName: { flex: 1, gap: 6 },
  tokenRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  token: { fontFamily: fonts.monoBold, fontSize: 17 },
  tokenName: { fontFamily: fonts.regular, fontSize: 12, flex: 1 },
  positionMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  direction: { fontFamily: fonts.monoBold, fontSize: 10, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  age: { fontFamily: fonts.mono, fontSize: 10 },
  filledBadge: { fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 13, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden' },
  positionSignals: { alignItems: 'flex-end', gap: spacing(1) },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  expandButton: { width: 36, height: 36, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  positionQuickMetrics: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
  compactMetric: { width: '50%', minHeight: 64, minWidth: 0, justifyContent: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 10 },
  compactMetricBorderRight: { borderRightWidth: StyleSheet.hairlineWidth },
  compactMetricBorderBottom: { borderBottomWidth: StyleSheet.hairlineWidth },
  compactMetricHeader: { minHeight: 15, flexDirection: 'row', alignItems: 'center', gap: 7 },
  compactMetricAccent: { width: 3, height: 14, borderRadius: 2 },
  compactMetricLabel: { fontFamily: fonts.monoBold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.8 },
  compactMetricValue: { fontFamily: fonts.monoBold, fontSize: 19, lineHeight: 24, letterSpacing: -0.45, width: '100%' },
  positionBody: { padding: spacing(1.5) },
  trackFrame: { height: 48, marginHorizontal: 20, position: 'relative' },
  track: { position: 'absolute', left: 0, right: 0, top: 30, height: 4, borderRadius: radius.pill },
  trackGain: { position: 'absolute', top: 30, height: 4, borderRadius: radius.pill },
  rung: { position: 'absolute', top: 23, width: 18, height: 18, marginLeft: -9, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rungText: { fontFamily: fonts.monoBold, fontSize: 8 },
  trackMarker: { position: 'absolute', top: 0, width: 42, marginLeft: -21, alignItems: 'center', zIndex: 2 },
  trackMarkerLabel: { fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 13, letterSpacing: 0.9 },
  trackMarkerDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 3, marginTop: 10 },
  executionGrid: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: spacing(1.5), paddingVertical: spacing(1.25) },
  executionColumn: { flex: 1, minWidth: 0, gap: spacing(1.25), paddingHorizontal: 10 },
  executionColumnBorder: { borderLeftWidth: StyleSheet.hairlineWidth },
  executionReading: { width: '100%', gap: 5 },
  executionLabel: { fontFamily: fonts.monoBold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.85, width: '100%' },
  executionValue: { fontFamily: fonts.monoBold, fontSize: 17.5, lineHeight: 22, width: '100%' },
  executionPriceValue: { fontFamily: fonts.monoBold, fontSize: 15, lineHeight: 20, width: '100%' },
  executionDivider: { width: '100%', height: StyleSheet.hairlineWidth },
  alignCenter: { alignItems: 'center' },
  alignRight: { alignItems: 'flex-end' },
  textLeft: { textAlign: 'left' },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
  positionFooter: { marginTop: spacing(1.5), flexDirection: 'row', justifyContent: 'space-between' },
  footerSize: { fontFamily: fonts.mono, fontSize: 10.5 },
  footerPnl: { fontFamily: fonts.monoBold, fontSize: 15 },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Animated, Image, LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

import { PositionHistory } from '../api/types';
import { money, percent } from '../dashboard/formatters';
import { historyClosedAgo, historyDuration, historyToken } from '../positions/presentation';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';

function dateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Reading({ label, value, color, align = 'left' }: {
  label: string;
  value: string;
  color: string;
  align?: 'left' | 'center' | 'right';
}) {
  const { palette } = useTheme();
  const textAlign = align === 'center' ? styles.textCenter : align === 'right' ? styles.textRight : styles.textLeft;

  return (
    <View style={styles.reading}>
      <Text style={[styles.readingLabel, textAlign, { color: palette.textFaint }]}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.readingValue, textAlign, { color }]}>{value}</Text>
    </View>
  );
}

export function PositionHistoryCard({ position, reduceMotion }: {
  position: PositionHistory;
  reduceMotion: boolean;
}) {
  const { palette } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const chevronProgress = useRef(new Animated.Value(0)).current;
  const long = position.direction === 'LONG';
  const pnl = position.pnl === null ? null : Number(position.pnl);
  const profitable = pnl !== null && pnl >= 0;
  const resultColor = pnl === null ? palette.textSoft : profitable ? palette.green : palette.red;
  const directionColor = long ? palette.green : palette.red;
  const directionTint = long ? palette.greenSoft : palette.redSoft;
  const token = historyToken(position);

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
    <View style={[styles.card, { backgroundColor: palette.panel, borderColor: palette.line }]}>
      <View style={[styles.resultRail, { backgroundColor: resultColor }]} />
      <Pressable
        onPress={toggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={`${token} completed position`}
        accessibilityHint={expanded ? 'Collapses position history details' : 'Expands position history details'}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <View style={styles.identityRow}>
          {position.token_image
            ? <Image source={{ uri: position.token_image }} style={styles.tokenImage} />
            : <View style={[styles.tokenFallback, { backgroundColor: palette.canvasRaised }]}><Text style={[styles.tokenFallbackText, { color: palette.text }]}>{token.slice(0, 2)}</Text></View>}

          <View style={styles.identity}>
            <View style={styles.nameRow}>
              <Text style={[styles.token, { color: palette.text }]}>{token}</Text>
              {position.token_name ? <Text numberOfLines={1} style={[styles.tokenName, { color: palette.textSoft }]}>{position.token_name}</Text> : null}
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.direction, { color: directionColor, backgroundColor: directionTint }]}>{long ? '↑' : '↓'} {position.direction} {position.leverage}×</Text>
              <Text style={[styles.closedAgo, { color: palette.textSoft }]}>{historyClosedAgo(position.closed_at)}</Text>
            </View>
          </View>

          <View style={styles.result}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.pnl, { color: resultColor }]}>{money(position.pnl)}</Text>
            <Text style={[styles.return, { color: palette.textSoft }]}>{percent(position.return_pct)}</Text>
          </View>

          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <Ionicons name="chevron-down" size={18} color={palette.textFaint} />
          </Animated.View>
        </View>

        <View style={[styles.quickReadings, { borderColor: palette.line, backgroundColor: palette.panelStrong }]}>
          <Reading label="ENTRY" value={position.entry_price ?? '—'} color={palette.text} />
          <View style={[styles.readingDivider, { backgroundColor: palette.line }]} />
          <Reading label="EXIT" value={position.exit_price ?? '—'} color={palette.text} align="center" />
          <View style={[styles.readingDivider, { backgroundColor: palette.line }]} />
          <Reading label="HELD" value={historyDuration(position.duration_seconds)} color={palette.text} align="right" />
        </View>
      </Pressable>

      {expanded ? (
        <View style={[styles.details, { borderTopColor: palette.line }]}>
          <View style={styles.detailGrid}>
            <View style={styles.detailCell}>
              <Text style={[styles.detailLabel, { color: palette.textFaint }]}>OPENED</Text>
              <Text style={[styles.detailValue, { color: palette.text }]}>{dateTime(position.opened_at)}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={[styles.detailLabel, { color: palette.textFaint }]}>CLOSED</Text>
              <Text style={[styles.detailValue, { color: palette.text }]}>{dateTime(position.closed_at)}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={[styles.detailLabel, { color: palette.textFaint }]}>QUANTITY</Text>
              <Text style={[styles.detailValueMono, { color: palette.text }]}>{position.quantity ?? '—'}</Text>
            </View>
            <View style={styles.detailCell}>
              <Text style={[styles.detailLabel, { color: palette.textFaint }]}>MARGIN</Text>
              <Text style={[styles.detailValueMono, { color: palette.text }]}>{money(position.margin)}</Text>
            </View>
          </View>

          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: directionTint }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color={directionColor} />
              <Text style={[styles.tagText, { color: directionColor }]}>COMPLETED</Text>
            </View>
            {position.was_waped ? <View style={[styles.tag, { backgroundColor: palette.amberSoft }]}><Text style={[styles.tagText, { color: palette.amber }]}>WAP ADJUSTED</Text></View> : null}
            {position.was_fast_traded ? <View style={[styles.tag, { backgroundColor: palette.greenSoft }]}><Text style={[styles.tagText, { color: palette.green }]}>FAST TRADE</Text></View> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden', position: 'relative' },
  resultRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  summary: { padding: spacing(1.5), paddingLeft: spacing(1.75), gap: spacing(1.25) },
  pressed: { opacity: 0.8 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  tokenImage: { width: 40, height: 40, borderRadius: 20 },
  tokenFallback: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tokenFallbackText: { fontFamily: fonts.monoBold, fontSize: 12 },
  identity: { flex: 1, minWidth: 0, gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  token: { fontFamily: fonts.monoBold, fontSize: 17 },
  tokenName: { flex: 1, fontFamily: fonts.regular, fontSize: 11.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  direction: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 0.35, paddingHorizontal: 7, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  closedAgo: { fontFamily: fonts.mono, fontSize: 9 },
  result: { width: 78, alignItems: 'flex-end', gap: 2 },
  pnl: { width: '100%', textAlign: 'right', fontFamily: fonts.monoBold, fontSize: 15 },
  return: { fontFamily: fonts.mono, fontSize: 9.5 },
  quickReadings: { minHeight: 62, borderWidth: StyleSheet.hairlineWidth, borderRadius: 15, flexDirection: 'row', alignItems: 'stretch', paddingVertical: 10 },
  reading: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 5, paddingHorizontal: 10 },
  readingLabel: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 1 },
  readingValue: { width: '100%', fontFamily: fonts.monoBold, fontSize: 12.5 },
  readingDivider: { width: StyleSheet.hairlineWidth },
  textLeft: { textAlign: 'left' },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
  details: { borderTopWidth: StyleSheet.hairlineWidth, padding: spacing(1.75), gap: spacing(1.5) },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing(1.5) },
  detailCell: { width: '50%', paddingRight: spacing(1), gap: 5 },
  detailLabel: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 1 },
  detailValue: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17 },
  detailValueMono: { fontFamily: fonts.monoBold, fontSize: 13 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: { minHeight: 28, borderRadius: radius.pill, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  tagText: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 0.65 },
});

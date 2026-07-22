import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Line, Path, Stop } from 'react-native-svg';

import { api, ApiError } from '../api/client';
import { Account, BscsSummary, Dashboard, DashboardKpis, DashboardResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AccountPicker } from '../components/AccountPicker';
import { Logo } from '../components/Logo';
import { PositionCard } from '../components/PositionCard';
import { NoticeOverlay } from '../components/ScreenState';
import { formatBscsPositionCap } from '../dashboard/bscsPresentation';
import { money, percent } from '../dashboard/formatters';
import { lastPositionClosedLabel } from '../dashboard/positionTimeline';
import { ACCOUNT_KEY, AUTO_REFRESH_KEY } from '../dashboard/preferences';
import { shouldAutoRefresh } from '../dashboard/refreshPolicy';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const recent = values.slice(-18);
  if (recent.length < 2) return <View style={styles.sparkEmpty} />;
  const width = 124;
  const height = 38;
  const chartTop = 3;
  const chartBottom = 34;
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
    <View style={styles.spark} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.28} />
            <Stop offset="1" stopColor={color} stopOpacity={0.02} />
          </SvgLinearGradient>
        </Defs>
        <Line x1="0" y1={chartBottom} x2={width} y2={chartBottom} stroke={color} strokeOpacity={0.12} strokeWidth="1" />
        <Path d={area} fill="url(#spark-area)" />
        <Path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <Circle cx={end.x} cy={end.y} r="2.8" fill={color} />
      </Svg>
    </View>
  );
}

function KpiCard({ label, value, delta, icon, spark, accent }: {
  label: string;
  value: string;
  delta?: string;
  icon: keyof typeof Ionicons.glyphMap;
  spark?: number[];
  accent?: 'green' | 'red';
}) {
  const { palette } = useTheme();
  const tint = accent === 'red' ? palette.red : palette.green;
  return (
    <View style={[styles.kpi, { backgroundColor: palette.panel, borderColor: palette.line }]}>
      <View style={styles.kpiTop}>
        <Ionicons name={icon} size={17} color={palette.textSoft} />
        <Text style={[styles.kpiLabel, { color: palette.textSoft }]}>{label}</Text>
      </View>
      <View style={styles.kpiValueRow}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.kpiValue, { color: palette.text }]}>{value}</Text>
        {delta ? <Text style={[styles.kpiDelta, { color: tint, backgroundColor: accent === 'red' ? palette.redSoft : palette.greenSoft }]}>{delta}</Text> : null}
      </View>
      {spark ? <Sparkline values={spark} color={tint} /> : null}
    </View>
  );
}

function OpenPositionsKpi({ kpis }: { kpis: DashboardKpis }) {
  const { palette } = useTheme();
  const total = Math.max(kpis.open_count, 1);
  return (
    <View style={[styles.kpi, { backgroundColor: palette.panel, borderColor: palette.line }]}>
      <View style={styles.kpiTop}><Ionicons name="layers-outline" size={17} color={palette.textSoft} /><Text style={[styles.kpiLabel, { color: palette.textSoft }]}>OPEN POSITIONS</Text></View>
      <Text style={[styles.kpiValue, { color: palette.text }]}>{kpis.open_count}</Text>
      <View style={styles.splitBar}>
        <View style={[styles.splitLong, { flex: kpis.long_count / total, backgroundColor: palette.green }]} />
        <View style={[styles.splitShort, { flex: kpis.short_count / total, backgroundColor: palette.red }]} />
      </View>
      <View style={styles.splitLegend}>
        <Text style={[styles.splitText, { color: palette.green }]}>{kpis.long_count}L</Text>
        <Text style={[styles.splitText, { color: palette.red }]}>{kpis.short_count}S</Text>
      </View>
    </View>
  );
}

function BscsKpi({ bscs }: { bscs: BscsSummary }) {
  const { palette } = useTheme();
  const score = bscs.score === null ? null : Math.max(0, Math.min(100, bscs.score));
  const threshold = Math.max(0, Math.min(100, bscs.block_threshold));
  const tone = bscs.blocked || bscs.band === 'critical'
    ? palette.red
    : bscs.band === 'fragile' || bscs.band === 'elevated'
      ? palette.amber
      : bscs.band === 'calm'
        ? palette.green
        : palette.textFaint;
  const toneSoft = bscs.blocked || bscs.band === 'critical'
    ? palette.redSoft
    : bscs.band === 'fragile' || bscs.band === 'elevated'
      ? palette.amberSoft
      : bscs.band === 'calm'
        ? palette.greenSoft
        : palette.panelStrong;
  const band = bscs.band?.toUpperCase() ?? 'AWAITING DATA';
  const positionCap = formatBscsPositionCap(bscs.position_cap);

  return (
    <View style={[styles.bscsKpi, { backgroundColor: palette.panel, borderColor: bscs.blocked ? palette.red : palette.line }]}>
      <View style={styles.bscsTop}>
        <View style={[styles.bscsIcon, { backgroundColor: toneSoft }]}>
          <Ionicons name="shield-half-outline" size={23} color={tone} />
        </View>
        <View style={styles.bscsCopy}>
          <Text style={[styles.bscsEyebrow, { color: palette.textSoft }]}>MARKET REGIME · BSCS</Text>
          <View style={styles.bscsBandRow}>
            <Text style={[styles.bscsBand, { color: tone }]}>{band}</Text>
            {bscs.is_stale ? <View style={[styles.bscsStaleBadge, { backgroundColor: palette.amberSoft }]}><Text style={[styles.bscsStaleText, { color: palette.amber }]}>STALE</Text></View> : null}
          </View>
        </View>
        <View style={styles.bscsScoreBlock}>
          <Text style={[styles.bscsScore, { color: tone }]}>{score ?? '—'}</Text>
          <Text style={[styles.bscsScoreUnit, { color: palette.textSoft }]}>/100</Text>
        </View>
      </View>

      <Text style={[styles.bscsStatus, { color: bscs.blocked ? palette.red : palette.text }]}>{bscs.status}</Text>
      {positionCap ? <Text style={[styles.bscsPositionCap, { color: palette.textSoft }]}>POSITION CAP · {positionCap}</Text> : null}

      <View style={styles.bscsScale}>
        <LinearGradient
          colors={[palette.green, palette.green, palette.amber, palette.red]}
          locations={[0, 0.39, 0.6, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        {score !== null ? <View style={[styles.bscsUnreached, { backgroundColor: palette.panelStrong, left: `${score}%` }]} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: palette.panelStrong }]} />}
        <View style={[styles.bscsThreshold, { backgroundColor: palette.textFaint, left: `${threshold}%` }]} />
        {score !== null ? <View style={[styles.bscsMarker, { backgroundColor: palette.text, left: `${score}%` }]} /> : null}
      </View>
      <View style={styles.bscsScaleLabels}>
        <Text style={[styles.bscsScaleLabel, styles.bscsCalmLabel, { color: palette.textSoft }]}>CALM</Text>
        <Text style={[styles.bscsScaleLabel, { color: palette.textSoft }]}>ELEVATED</Text>
        <Text style={[styles.bscsScaleLabel, { color: palette.textSoft }]}>FRAGILE</Text>
        <Text style={[styles.bscsScaleLabel, styles.bscsCriticalLabel, { color: palette.textSoft }]}>CRITICAL</Text>
      </View>
    </View>
  );
}

export function DashboardScreen() {
  const { palette, toggle } = useTheme();
  const { expireSession, user } = useAuth();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (accountId?: number | null, quiet = false) => {
    const id = ++requestId.current;
    if (!quiet) setRefreshing(true);
    setError(null);
    try {
      const query = accountId ? `?account_id=${accountId}` : '';
      const response = await api.get<DashboardResponse>(`/dashboard${query}`);
      if (id !== requestId.current) return;
      setAccounts(response.data.accounts);
      setSelectedId(response.data.selected_account_id);
      setDashboard(response.data.dashboard);
      if (response.data.selected_account_id) void SecureStore.setItemAsync(ACCOUNT_KEY, String(response.data.selected_account_id));
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await expireSession();
        return;
      }
      if (caught instanceof ApiError && caught.status === 404 && accountId) {
        await SecureStore.deleteItemAsync(ACCOUNT_KEY);
        await load(null, quiet);
        return;
      }
      if (id === requestId.current) setError(caught instanceof ApiError ? caught.message : 'Unable to load live dashboard data.');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [expireSession]);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let alive = true;
    void Promise.all([SecureStore.getItemAsync(AUTO_REFRESH_KEY), SecureStore.getItemAsync(ACCOUNT_KEY)]).then(([storedAuto, storedAccount]) => {
      if (!alive) return;
      if (storedAuto !== null) setAutoRefresh(storedAuto === 'true');
      void load(storedAccount ? Number(storedAccount) : null);
    });
    return () => { alive = false; };
  }, [load]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setAppState(next);
      if (next === 'active' && autoRefresh && isFocused) void load(selectedId, true);
    });
    return () => subscription.remove();
  }, [autoRefresh, isFocused, load, selectedId]);

  useEffect(() => {
    if (!shouldAutoRefresh(autoRefresh, appState, isFocused)) return;
    const timer = setInterval(() => void load(selectedId, true), 10_000);
    return () => clearInterval(timer);
  }, [appState, autoRefresh, isFocused, load, selectedId]);

  const selectAccount = (accountId: number) => {
    setPickerOpen(false);
    setSelectedId(accountId);
    setLoading(true);
    void load(accountId);
  };

  const toggleAuto = (enabled: boolean) => {
    setAutoRefresh(enabled);
    void SecureStore.setItemAsync(AUTO_REFRESH_KEY, String(enabled));
    if (enabled && appState === 'active') void load(selectedId, true);
  };

  const selected = accounts.find((account) => account.id === selectedId);
  const kpis = dashboard?.kpis;
  const todayRed = Number(kpis?.pnl_today ?? 0) < 0;
  const monthRed = Number(kpis?.pnl_30d ?? 0) < 0;

  return (
    <View style={[styles.screen, { backgroundColor: palette.canvas, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 105 }]}
        refreshControl={<RefreshControl refreshing={refreshing && !loading} onRefresh={() => void load(selectedId)} tintColor={palette.green} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <Logo />
          <View style={styles.topActions}>
            <Pressable onPress={toggle} style={[styles.iconButton, { backgroundColor: palette.panel, borderColor: palette.line }]} accessibilityLabel="Toggle color theme"><Ionicons name={palette.dark ? 'sunny-outline' : 'moon-outline'} size={19} color={palette.text} /></Pressable>
            <View style={[styles.avatar, { backgroundColor: palette.greenSoft }]}><Text style={[styles.avatarText, { color: palette.green }]}>{user?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'TR'}</Text></View>
          </View>
        </View>

        <View style={styles.heroHeader}>
          <View><Text style={[styles.pageEyebrow, { color: palette.green }]}>OVERVIEW · LIVE</Text><Text style={[styles.pageTitle, { color: palette.text }]}>Dashboard</Text></View>
          <View style={[styles.liveBadge, { backgroundColor: palette.greenSoft }]}><View style={[styles.livePulse, { backgroundColor: palette.green }]} /><Text style={[styles.liveText, { color: palette.green }]}>ENGINE LIVE</Text></View>
        </View>

        <Pressable onPress={() => setPickerOpen(true)} disabled={accounts.length < 2} style={[styles.accountSelector, { backgroundColor: palette.panel, borderColor: palette.line }]}>
          <View style={[styles.accountSignal, { backgroundColor: selected?.is_trading ? palette.green : palette.amber }]} />
          <View style={styles.selectorCopy}><Text style={[styles.selectorLabel, { color: palette.textFaint }]}>ACTIVE ACCOUNT</Text><Text style={[styles.selectorValue, { color: palette.text }]}>{selected ? `${selected.name} · ${selected.exchange}` : 'No trading account'}</Text></View>
          {accounts.length > 1 ? <Ionicons name="chevron-down" size={19} color={palette.textSoft} /> : null}
        </Pressable>

        <View style={styles.refreshRow}>
          <View><Text style={[styles.refreshTitle, { color: palette.text }]}>Auto-refresh</Text><Text style={[styles.refreshCopy, { color: palette.textSoft }]}>{autoRefresh ? 'Every 10s while app is active' : 'Pull down to refresh'}</Text></View>
          <Switch value={autoRefresh} onValueChange={toggleAuto} trackColor={{ false: palette.lineStrong, true: palette.greenSoft }} thumbColor={autoRefresh ? palette.green : (palette.dark ? palette.text : palette.panel)} ios_backgroundColor={palette.lineStrong} />
        </View>

        {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={palette.green} /><Text style={[styles.loadingText, { color: palette.textSoft }]}>Synchronizing portfolio</Text></View> : null}

        {!loading && kpis ? <>
          <View style={styles.kpiGrid}>
            <KpiCard label="PORTFOLIO VALUE" value={money(kpis.balance)} delta={percent(kpis.balance_delta_24h_pct)} icon="wallet-outline" accent={Number(kpis.balance_delta_24h_pct ?? 0) < 0 ? 'red' : 'green'} />
            <KpiCard label="P&L · TODAY" value={money(kpis.pnl_today)} delta={percent(kpis.pnl_today_pct)} icon="flash-outline" accent={todayRed ? 'red' : 'green'} />
            <KpiCard label="P&L · 30 DAY" value={money(kpis.pnl_30d)} delta={percent(kpis.pnl_30d_pct)} icon="trending-up-outline" spark={kpis.pnl_30d_spark} accent={monthRed ? 'red' : 'green'} />
            <OpenPositionsKpi kpis={kpis} />
          </View>

          {dashboard.bscs ? <BscsKpi bscs={dashboard.bscs} /> : null}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Open positions</Text>
              <Text style={[styles.sectionCopy, { color: palette.textSoft }]}>{lastPositionClosedLabel(dashboard.last_position_closed_at)}</Text>
            </View>
            <View style={[styles.countBadge, { backgroundColor: palette.panel }]}>
              <Text style={[styles.countText, { color: palette.text }]}>{dashboard.positions.length}</Text>
            </View>
          </View>

          <View style={styles.positions}>
            {dashboard.positions.map((position) => <PositionCard key={position.id} position={position} reduceMotion={reduceMotion} />)}
            {dashboard.positions.length === 0 ? <View style={[styles.empty, { backgroundColor: palette.panel, borderColor: palette.line }]}><View style={[styles.emptyIcon, { backgroundColor: palette.greenSoft }]}><Ionicons name="checkmark-done" size={24} color={palette.green} /></View><Text style={[styles.emptyTitle, { color: palette.text }]}>No open positions</Text><Text style={[styles.emptyCopy, { color: palette.textSoft }]}>The engine has no live exposure on this account.</Text></View> : null}
          </View>

          <Text style={[styles.generated, { color: palette.textFaint }]}>LAST SYNC · {new Date(dashboard.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
        </> : null}
      </ScrollView>

      {error ? <NoticeOverlay
        tone="error"
        title="Signal interrupted"
        message={error}
        icon="cloud-offline-outline"
        actionLabel="Retry dashboard connection"
        actionIcon="refresh"
        onAction={() => void load(selectedId)}
        onDismiss={() => setError(null)}
      /> : null}

      <AccountPicker visible={pickerOpen} accounts={accounts} selectedId={selectedId} onSelect={selectAccount} onClose={() => setPickerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing(2), paddingTop: spacing(1.75), gap: spacing(1.5) },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  iconButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.monoBold, fontSize: 12 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing(1.5) },
  pageEyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 1.8 },
  pageTitle: { fontFamily: fonts.display, fontSize: 36, letterSpacing: -1.5, marginTop: 2 },
  liveBadge: { borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  livePulse: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 1 },
  accountSelector: { minHeight: 62, borderWidth: 1, borderRadius: radius.control, paddingHorizontal: spacing(1.5), flexDirection: 'row', alignItems: 'center', gap: spacing(1.25) },
  accountSignal: { width: 8, height: 34, borderRadius: radius.pill },
  selectorCopy: { flex: 1, gap: 3 },
  selectorLabel: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 1.2 },
  selectorValue: { fontFamily: fonts.medium, fontSize: 15 },
  refreshRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  refreshTitle: { fontFamily: fonts.medium, fontSize: 14 },
  refreshCopy: { fontFamily: fonts.regular, fontSize: 12, marginTop: 1 },
  loading: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: spacing(1.25) },
  loadingText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  kpi: { width: '48.8%', minHeight: 136, borderWidth: 1, borderRadius: radius.card, padding: spacing(1.5), overflow: 'hidden' },
  kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kpiLabel: { fontFamily: fonts.monoBold, fontSize: 10.5, lineHeight: 14, letterSpacing: 1.05 },
  kpiValueRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing(1.1) },
  kpiValue: { fontFamily: fonts.monoBold, fontSize: 23, lineHeight: 29, letterSpacing: -1 },
  kpiDelta: { fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 13, paddingHorizontal: 7, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  spark: { width: '100%', height: 38, marginTop: 'auto' },
  sparkEmpty: { height: 38 },
  splitBar: { flexDirection: 'row', height: 6, gap: 3, marginTop: 'auto' },
  splitLong: { borderRadius: radius.pill },
  splitShort: { borderRadius: radius.pill },
  splitLegend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  splitText: { fontFamily: fonts.monoBold, fontSize: 10.5 },
  bscsKpi: { width: '100%', minHeight: 142, borderWidth: 1, borderRadius: radius.card, padding: spacing(1.5) },
  bscsTop: { flexDirection: 'row', alignItems: 'center', gap: spacing(1.25) },
  bscsIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bscsCopy: { flex: 1, gap: 4 },
  bscsEyebrow: { fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 13, letterSpacing: 1.1 },
  bscsBandRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  bscsBand: { fontFamily: fonts.monoBold, fontSize: 15, lineHeight: 19, letterSpacing: 0.5 },
  bscsStaleBadge: { borderRadius: radius.pill, paddingHorizontal: 6, paddingVertical: 3 },
  bscsStaleText: { fontFamily: fonts.monoBold, fontSize: 8, lineHeight: 10, letterSpacing: 0.8 },
  bscsScoreBlock: { flexDirection: 'row', alignItems: 'baseline' },
  bscsScore: { fontFamily: fonts.monoBold, fontSize: 31, lineHeight: 36, letterSpacing: -1.4 },
  bscsScoreUnit: { fontFamily: fonts.monoBold, fontSize: 10, lineHeight: 13 },
  bscsStatus: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, marginTop: spacing(1) },
  bscsPositionCap: { fontFamily: fonts.monoBold, fontSize: 9, lineHeight: 13, letterSpacing: 0.35, marginTop: 4 },
  bscsScale: { height: 9, borderRadius: radius.pill, overflow: 'hidden', position: 'relative', marginTop: spacing(1.25) },
  bscsUnreached: { position: 'absolute', top: 0, right: 0, bottom: 0, opacity: 0.88 },
  bscsThreshold: { position: 'absolute', top: -2, bottom: -2, width: 1, opacity: 0.9 },
  bscsMarker: { position: 'absolute', top: -2, width: 4, height: 13, borderRadius: 2, marginLeft: -2 },
  bscsScaleLabels: { flexDirection: 'row', marginTop: 6 },
  bscsScaleLabel: { flex: 1, fontFamily: fonts.monoBold, fontSize: 7.5, lineHeight: 10, letterSpacing: 0.35, textAlign: 'center' },
  bscsCalmLabel: { flex: 2, textAlign: 'left' },
  bscsCriticalLabel: { textAlign: 'right' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(1.5) },
  sectionTitle: { fontFamily: fonts.display, fontSize: 23, letterSpacing: -0.7 },
  sectionCopy: { fontFamily: fonts.regular, fontSize: 12.5, marginTop: 3 },
  countBadge: { minWidth: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: fonts.monoBold, fontSize: 13 },
  positions: { gap: spacing(1.5) },
  empty: { borderWidth: 1, borderRadius: radius.card, padding: spacing(3), alignItems: 'center' },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fonts.display, fontSize: 19, marginTop: spacing(1.5) },
  emptyCopy: { fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', marginTop: 4 },
  generated: { fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1.2, textAlign: 'center', marginTop: spacing(1) },
});

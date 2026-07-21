import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError } from '../api/client';
import { Account, Dashboard, DashboardResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AccountPicker } from '../components/AccountPicker';
import { Logo } from '../components/Logo';
import { PositionCard } from '../components/PositionCard';
import { NoticeOverlay } from '../components/ScreenState';
import { money, percent } from '../dashboard/formatters';
import { ACCOUNT_KEY, AUTO_REFRESH_KEY } from '../dashboard/preferences';
import { shouldAutoRefresh } from '../dashboard/refreshPolicy';
import { PositionFilter, PositionSort, positionBookSummary, positionsForView } from '../positions/presentation';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';

const FILTERS: PositionFilter[] = ['ALL', 'LONG', 'SHORT'];
const SORTS: PositionSort[] = ['RISK', 'EXPOSURE', 'P&L'];

function SummaryCard({ icon, label, value, detail, color }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.summaryCard, { backgroundColor: palette.panel, borderColor: palette.line }]}>
      <View style={styles.summaryHeader}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={[styles.summaryLabel, { color: palette.textSoft }]}>{label}</Text>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={[styles.summaryDetail, { color: palette.textFaint }]}>{detail}</Text>
    </View>
  );
}

function ChoiceRow<T extends string>({ label, values, selected, onSelect }: {
  label: string;
  values: T[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.choiceGroup}>
      <Text style={[styles.choiceLabel, { color: palette.textFaint }]}>{label}</Text>
      <View style={styles.choices}>
        {values.map((value) => {
          const active = selected === value;
          return (
            <Pressable
              key={value}
              onPress={() => onSelect(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.choice,
                { backgroundColor: active ? palette.greenSoft : palette.panelStrong, borderColor: active ? palette.green : palette.line },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.choiceText, { color: active ? palette.green : palette.textSoft }]}>{value}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function PositionsScreen() {
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
  const [filter, setFilter] = useState<PositionFilter>('ALL');
  const [sort, setSort] = useState<PositionSort>('RISK');
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
      if (response.data.selected_account_id) {
        void SecureStore.setItemAsync(ACCOUNT_KEY, String(response.data.selected_account_id));
      }
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
      if (id === requestId.current) {
        setError(caught instanceof ApiError ? caught.message : 'Unable to load live positions.');
      }
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

  const selected = accounts.find((account) => account.id === selectedId);
  const positions = dashboard?.positions ?? [];
  const summary = useMemo(() => positionBookSummary(positions), [positions]);
  const visiblePositions = useMemo(() => positionsForView(positions, filter, sort), [filter, positions, sort]);
  const pnlColor = summary.pnl >= 0 ? palette.green : palette.red;

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
          <View><Text style={[styles.pageEyebrow, { color: palette.green }]}>TRADER BOOK · LIVE</Text><Text style={[styles.pageTitle, { color: palette.text }]}>Positions</Text></View>
          <View style={[styles.liveBadge, { backgroundColor: palette.greenSoft }]}><View style={[styles.livePulse, { backgroundColor: palette.green }]} /><Text style={[styles.liveText, { color: palette.green }]}>{autoRefresh ? '10S SYNC' : 'MANUAL'}</Text></View>
        </View>

        <Pressable onPress={() => setPickerOpen(true)} disabled={accounts.length < 2} style={[styles.accountSelector, { backgroundColor: palette.panel, borderColor: palette.line }]}>
          <View style={[styles.accountSignal, { backgroundColor: selected?.is_trading ? palette.green : palette.amber }]} />
          <View style={styles.selectorCopy}><Text style={[styles.selectorLabel, { color: palette.textFaint }]}>ACTIVE ACCOUNT</Text><Text style={[styles.selectorValue, { color: palette.text }]}>{selected ? `${selected.name} · ${selected.exchange}` : 'No trading account'}</Text></View>
          {accounts.length > 1 ? <Ionicons name="chevron-down" size={19} color={palette.textSoft} /> : null}
        </Pressable>

        {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={palette.green} /><Text style={[styles.loadingText, { color: palette.textSoft }]}>Synchronizing open book</Text></View> : null}

        {!loading && dashboard ? <>
          <View style={styles.summaryGrid}>
            <SummaryCard icon="layers-outline" label="OPEN POSITIONS" value={String(summary.open)} detail={`${summary.long} LONG · ${summary.short} SHORT`} color={palette.text} />
            <SummaryCard icon="resize-outline" label="TOTAL EXPOSURE" value={money(summary.exposure)} detail="NOTIONAL" color={palette.text} />
            <SummaryCard icon="pulse-outline" label="UNREALIZED P&L" value={money(summary.pnl)} detail="LIVE MARK" color={pnlColor} />
            <SummaryCard icon="options-outline" label="MAX α LIMIT" value={percent(summary.maxAlphaLimit, false)} detail="NEAREST RUNG" color={palette.amber} />
          </View>

          <View style={[styles.controls, { backgroundColor: palette.panel, borderColor: palette.line }]}>
            <ChoiceRow label="SIDE" values={FILTERS} selected={filter} onSelect={setFilter} />
            <View style={[styles.controlDivider, { backgroundColor: palette.line }]} />
            <ChoiceRow label="SORT DESCENDING" values={SORTS} selected={sort} onSelect={setSort} />
          </View>

          <View style={styles.sectionHeader}>
            <View><Text style={[styles.sectionTitle, { color: palette.text }]}>Open book</Text><Text style={[styles.sectionCopy, { color: palette.textSoft }]}>{visiblePositions.length} shown · {filter.toLowerCase()} · {sort.toLowerCase()}</Text></View>
            <View style={[styles.countBadge, { backgroundColor: palette.panel }]}><Text style={[styles.countText, { color: palette.text }]}>{visiblePositions.length}</Text></View>
          </View>

          <View style={styles.positions}>
            {visiblePositions.map((position) => <PositionCard key={position.id} position={position} reduceMotion={reduceMotion} />)}
            {visiblePositions.length === 0 ? <View style={[styles.empty, { backgroundColor: palette.panel, borderColor: palette.line }]}><View style={[styles.emptyIcon, { backgroundColor: palette.greenSoft }]}><Ionicons name={positions.length === 0 ? 'checkmark-done' : 'filter-outline'} size={24} color={palette.green} /></View><Text style={[styles.emptyTitle, { color: palette.text }]}>{positions.length === 0 ? 'No open positions' : `No ${filter.toLowerCase()} positions`}</Text><Text style={[styles.emptyCopy, { color: palette.textSoft }]}>{positions.length === 0 ? 'The engine has no live exposure on this account.' : 'Change the side filter to inspect the rest of the book.'}</Text></View> : null}
          </View>

          <Text style={[styles.generated, { color: palette.textFaint }]}>LAST SYNC · {new Date(dashboard.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
        </> : null}
      </ScrollView>

      {error ? <NoticeOverlay tone="error" title="Signal interrupted" message={error} icon="cloud-offline-outline" actionLabel="Retry positions connection" actionIcon="refresh" onAction={() => void load(selectedId)} onDismiss={() => setError(null)} /> : null}

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
  loading: { minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: spacing(1.25) },
  loadingText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) },
  summaryCard: { width: '48.8%', minHeight: 126, borderWidth: 1, borderRadius: radius.card, padding: spacing(1.5), justifyContent: 'space-between' },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryLabel: { flex: 1, fontFamily: fonts.monoBold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.9 },
  summaryValue: { fontFamily: fonts.monoBold, fontSize: 23, lineHeight: 29, letterSpacing: -0.8, marginTop: spacing(1) },
  summaryDetail: { fontFamily: fonts.monoBold, fontSize: 8.5, lineHeight: 12, letterSpacing: 0.9, marginTop: 5 },
  controls: { borderWidth: 1, borderRadius: radius.card, padding: spacing(1.5), gap: spacing(1.5) },
  choiceGroup: { gap: 8 },
  choiceLabel: { fontFamily: fonts.monoBold, fontSize: 9, lineHeight: 12, letterSpacing: 1.25 },
  choices: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontFamily: fonts.monoBold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.65 },
  controlDivider: { height: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.78 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(0.5) },
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

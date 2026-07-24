import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError } from '../api/client';
import { Account, PositionHistoryPage, PositionsResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AccountPicker } from '../components/AccountPicker';
import { Logo } from '../components/Logo';
import { PositionHistoryCard } from '../components/PositionHistoryCard';
import { NoticeOverlay } from '../components/ScreenState';
import { money, percent } from '../dashboard/formatters';
import { ACCOUNT_KEY } from '../dashboard/preferences';
import {
  historyPositionsForFilter,
  historyWinRate,
  PositionHistoryFilter,
} from '../positions/presentation';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';

const FILTERS: PositionHistoryFilter[] = ['ALL', 'LONG', 'SHORT'];

function LedgerMetric({ label, value, color }: { label: string; value: string; color: string }) {
  const { palette } = useTheme();

  return (
    <View style={styles.ledgerMetric}>
      <Text style={[styles.ledgerMetricLabel, { color: palette.textFaint }]}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.ledgerMetricValue, { color }]}>{value}</Text>
    </View>
  );
}

function FilterBar({ selected, onSelect }: {
  selected: PositionHistoryFilter;
  onSelect: (filter: PositionHistoryFilter) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.filters, { backgroundColor: palette.panel, borderColor: palette.line }]}>
      {FILTERS.map((filter) => {
        const active = filter === selected;
        return (
          <Pressable
            key={filter}
            onPress={() => onSelect(filter)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.filter,
              active && { backgroundColor: palette.greenSoft },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.filterText, { color: active ? palette.green : palette.textSoft }]}>{filter}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PositionsScreen() {
  const { palette, toggle } = useTheme();
  const { expireSession, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [history, setHistory] = useState<PositionHistoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [filter, setFilter] = useState<PositionHistoryFilter>('ALL');
  const requestId = useRef(0);

  const load = useCallback(async (
    accountId?: number | null,
    cursor?: string | null,
    append = false,
    refresh = false,
  ) => {
    const id = ++requestId.current;
    if (append) setLoadingMore(true);
    else if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params: string[] = [];
      if (accountId) params.push(`account_id=${accountId}`);
      if (cursor) params.push(`cursor=${encodeURIComponent(cursor)}`);
      const response = await api.get<PositionsResponse>(`/positions${params.length ? `?${params.join('&')}` : ''}`);
      if (id !== requestId.current) return;

      setAccounts(response.data.accounts);
      setSelectedId(response.data.selected_account_id);
      setHistory((current) => {
        const next = response.data.history;
        if (!append || !current || !next) return next;
        return {
          ...next,
          positions: [...current.positions, ...next.positions],
        };
      });

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
        await load(null);
        return;
      }
      if (id === requestId.current) {
        setError(caught instanceof ApiError ? caught.message : 'Unable to load position history.');
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
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
    void SecureStore.getItemAsync(ACCOUNT_KEY).then((storedAccount) => {
      if (alive) void load(storedAccount ? Number(storedAccount) : null);
    });
    return () => { alive = false; };
  }, [load]);

  const selectAccount = (accountId: number) => {
    setPickerOpen(false);
    setSelectedId(accountId);
    setFilter('ALL');
    void load(accountId);
  };

  const selected = accounts.find((account) => account.id === selectedId);
  const visiblePositions = useMemo(
    () => historyPositionsForFilter(history?.positions ?? [], filter),
    [filter, history?.positions],
  );
  const winRate = history ? historyWinRate(history.summary) : null;
  const pnl = history?.summary.realized_pnl;
  const pnlNumber = pnl === null || pnl === undefined ? null : Number(pnl);
  const pnlColor = pnlNumber === null || !Number.isFinite(pnlNumber)
    ? palette.text
    : pnlNumber >= 0 ? palette.green : palette.red;

  return (
    <View style={[styles.screen, { backgroundColor: palette.canvas, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 105 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(selectedId, null, false, true)} tintColor={palette.green} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topbar}>
          <Logo />
          <View style={styles.topActions}>
            <Pressable onPress={toggle} style={[styles.iconButton, { backgroundColor: palette.panel, borderColor: palette.line }]} accessibilityLabel="Toggle color theme">
              <Ionicons name={palette.dark ? 'sunny-outline' : 'moon-outline'} size={19} color={palette.text} />
            </Pressable>
            <View style={[styles.avatar, { backgroundColor: palette.greenSoft }]}>
              <Text style={[styles.avatarText, { color: palette.green }]}>{user?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'TR'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.heroHeader}>
          <View>
            <Text style={[styles.pageEyebrow, { color: palette.green }]}>TRADE JOURNAL</Text>
            <Text style={[styles.pageTitle, { color: palette.text }]}>Positions</Text>
            <Text style={[styles.pageCopy, { color: palette.textSoft }]}>Completed positions, newest first.</Text>
          </View>
          <View style={[styles.historyBadge, { backgroundColor: palette.panel, borderColor: palette.line }]}>
            <Ionicons name="time-outline" size={14} color={palette.textSoft} />
            <Text style={[styles.historyBadgeText, { color: palette.textSoft }]}>HISTORY</Text>
          </View>
        </View>

        <Pressable onPress={() => setPickerOpen(true)} disabled={accounts.length < 2} style={[styles.accountSelector, { backgroundColor: palette.panel, borderColor: palette.line }]}>
          <View style={[styles.accountSignal, { backgroundColor: selected?.is_trading ? palette.green : palette.amber }]} />
          <View style={styles.selectorCopy}>
            <Text style={[styles.selectorLabel, { color: palette.textFaint }]}>POSITION HISTORY</Text>
            <Text style={[styles.selectorValue, { color: palette.text }]}>{selected ? `${selected.name} · ${selected.exchange}` : 'No trading account'}</Text>
          </View>
          {accounts.length > 1 ? <Ionicons name="chevron-down" size={19} color={palette.textSoft} /> : null}
        </Pressable>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={palette.green} />
            <Text style={[styles.loadingText, { color: palette.textSoft }]}>Opening trade journal</Text>
          </View>
        ) : null}

        {!loading && history ? (
          <>
            <View style={[styles.ledger, { backgroundColor: palette.panel, borderColor: palette.line }]}>
              <View style={styles.ledgerHero}>
                <View>
                  <Text style={[styles.ledgerLabel, { color: palette.textFaint }]}>REALIZED P&L</Text>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.ledgerValue, { color: pnlColor }]}>{money(pnl ?? null)}</Text>
                </View>
                <View style={[styles.journalMark, { backgroundColor: pnlNumber !== null && pnlNumber < 0 ? palette.redSoft : palette.greenSoft }]}>
                  <Ionicons name={pnlNumber !== null && pnlNumber < 0 ? 'trending-down' : 'trending-up'} size={24} color={pnlColor} />
                </View>
              </View>
              <View style={[styles.ledgerDivider, { backgroundColor: palette.line }]} />
              <View style={styles.ledgerMetrics}>
                <LedgerMetric label="CLOSED" value={String(history.summary.count)} color={palette.text} />
                <LedgerMetric label="WIN RATE" value={percent(winRate, false)} color={palette.green} />
                <LedgerMetric label="LONG" value={String(history.summary.long)} color={palette.green} />
                <LedgerMetric label="SHORT" value={String(history.summary.short)} color={palette.red} />
              </View>
            </View>

            <FilterBar selected={filter} onSelect={setFilter} />

            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Closed positions</Text>
                <Text style={[styles.sectionCopy, { color: palette.textSoft }]}>{visiblePositions.length} loaded · {filter.toLowerCase()}</Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: palette.panel }]}>
                <Text style={[styles.countText, { color: palette.text }]}>{history.summary.count}</Text>
              </View>
            </View>

            <View style={styles.positions}>
              {visiblePositions.map((position) => <PositionHistoryCard key={position.id} position={position} reduceMotion={reduceMotion} />)}
              {visiblePositions.length === 0 ? (
                <View style={[styles.empty, { backgroundColor: palette.panel, borderColor: palette.line }]}>
                  <View style={[styles.emptyIcon, { backgroundColor: palette.greenSoft }]}>
                    <Ionicons name={history.summary.count === 0 ? 'journal-outline' : 'filter-outline'} size={24} color={palette.green} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: palette.text }]}>{history.summary.count === 0 ? 'No completed positions' : `No ${filter.toLowerCase()} positions loaded`}</Text>
                  <Text style={[styles.emptyCopy, { color: palette.textSoft }]}>{history.summary.count === 0 ? 'Completed trades will build this account journal.' : 'Change the side filter or load more history.'}</Text>
                </View>
              ) : null}
            </View>

            {history.next_cursor ? (
              <Pressable
                onPress={() => void load(selectedId, history.next_cursor, true)}
                disabled={loadingMore}
                style={({ pressed }) => [styles.loadMore, { backgroundColor: palette.panel, borderColor: palette.line }, pressed && styles.pressed]}
              >
                {loadingMore ? <ActivityIndicator size="small" color={palette.green} /> : <Ionicons name="arrow-down" size={17} color={palette.green} />}
                <Text style={[styles.loadMoreText, { color: palette.text }]}>{loadingMore ? 'Loading history' : 'Load older positions'}</Text>
              </Pressable>
            ) : null}

            <Text style={[styles.generated, { color: palette.textFaint }]}>UPDATED · {new Date(history.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </>
        ) : null}

        {!loading && !history ? (
          <View style={[styles.empty, { backgroundColor: palette.panel, borderColor: palette.line }]}>
            <View style={[styles.emptyIcon, { backgroundColor: palette.amberSoft }]}>
              <Ionicons name="link-outline" size={24} color={palette.amber} />
            </View>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No trading account</Text>
            <Text style={[styles.emptyCopy, { color: palette.textSoft }]}>Connect an account before position history can appear.</Text>
          </View>
        ) : null}
      </ScrollView>

      {error ? <NoticeOverlay tone="error" title="History unavailable" message={error} icon="cloud-offline-outline" actionLabel="Retry position history" actionIcon="refresh" onAction={() => void load(selectedId)} onDismiss={() => setError(null)} /> : null}

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
  pageCopy: { fontFamily: fonts.regular, fontSize: 13, marginTop: 3 },
  historyBadge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyBadgeText: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 1 },
  accountSelector: { minHeight: 62, borderWidth: 1, borderRadius: radius.control, paddingHorizontal: spacing(1.5), flexDirection: 'row', alignItems: 'center', gap: spacing(1.25) },
  accountSignal: { width: 8, height: 34, borderRadius: radius.pill },
  selectorCopy: { flex: 1, gap: 3 },
  selectorLabel: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 1.2 },
  selectorValue: { fontFamily: fonts.medium, fontSize: 15 },
  loading: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: spacing(1.25) },
  loadingText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },
  ledger: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  ledgerHero: { minHeight: 112, padding: spacing(2), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ledgerLabel: { fontFamily: fonts.monoBold, fontSize: 9, letterSpacing: 1.3 },
  ledgerValue: { maxWidth: 245, fontFamily: fonts.monoBold, fontSize: 32, letterSpacing: -1.2, marginTop: 8 },
  journalMark: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ledgerDivider: { height: StyleSheet.hairlineWidth },
  ledgerMetrics: { minHeight: 78, flexDirection: 'row', paddingHorizontal: spacing(1), paddingVertical: spacing(1.25) },
  ledgerMetric: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 6 },
  ledgerMetricLabel: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 0.8 },
  ledgerMetricValue: { width: '100%', textAlign: 'center', fontFamily: fonts.monoBold, fontSize: 15 },
  filters: { minHeight: 48, borderWidth: 1, borderRadius: radius.control, padding: 4, flexDirection: 'row', gap: 4 },
  filter: { flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.8 },
  pressed: { opacity: 0.78 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing(0.5) },
  sectionTitle: { fontFamily: fonts.display, fontSize: 23, letterSpacing: -0.7 },
  sectionCopy: { fontFamily: fonts.regular, fontSize: 12.5, marginTop: 3 },
  countBadge: { minWidth: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: fonts.monoBold, fontSize: 13 },
  positions: { gap: spacing(1.25) },
  empty: { borderWidth: 1, borderRadius: radius.card, padding: spacing(3), alignItems: 'center' },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fonts.display, fontSize: 19, marginTop: spacing(1.5) },
  emptyCopy: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  loadMore: { minHeight: 54, borderWidth: 1, borderRadius: radius.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadMoreText: { fontFamily: fonts.medium, fontSize: 13 },
  generated: { fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 1.2, textAlign: 'center', marginTop: spacing(1) },
});

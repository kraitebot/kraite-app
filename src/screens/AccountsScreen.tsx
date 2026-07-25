import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, ApiError } from '../api/client';
import {
  AccountConfigurationOptions,
  AccountQuotesResponse,
  AccountsResponse,
  ManagedAccount,
} from '../api/types';
import {
  AccountDraft,
  accountDraft,
  accountErrorMessage,
  accountHasChanges,
  accountPayload,
} from '../accounts/presentation';
import { useAuth } from '../auth/AuthContext';
import { AccountPicker } from '../components/AccountPicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { NoticeOverlay } from '../components/ScreenState';
import { ACCOUNT_KEY } from '../dashboard/preferences';
import { Palette, useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';

type Notice = {
  tone: 'error' | 'warning' | 'success';
  title: string;
  message: string;
  signInAgain?: boolean;
};

function ChoiceRow<T extends string | number>({
  label,
  help,
  values,
  selected,
  format,
  disabled,
  onSelect,
}: {
  label: string;
  help?: string;
  values: T[];
  selected: T;
  format?: (value: T) => string;
  disabled?: boolean;
  onSelect: (value: T) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.choiceField}>
      <View style={styles.fieldHeading}>
        <Text style={[styles.fieldLabel, { color: palette.text }]}>{label}</Text>
        {help ? <Text style={[styles.fieldHelp, { color: palette.textFaint }]}>{help}</Text> : null}
      </View>
      <View style={styles.choiceRow}>
        {values.map((value) => {
          const active = value === selected;
          return (
            <Pressable
              key={String(value)}
              onPress={() => onSelect(value)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: Boolean(disabled) }}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: active ? palette.greenSoft : palette.canvasRaised,
                  borderColor: active ? palette.green : palette.line,
                },
                pressed && styles.pressed,
                disabled && styles.disabled,
              ]}
            >
              <Text style={[styles.choiceText, { color: active ? palette.green : palette.textSoft }]}>
                {format ? format(value) : String(value)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DirectionChoice<T extends string | number>({
  label,
  values,
  selected,
  tone,
  soft,
  disabled,
  format,
  onSelect,
}: {
  label: string;
  values: T[];
  selected: T;
  tone: string;
  soft: string;
  disabled: boolean;
  format?: (value: T) => string;
  onSelect: (value: T) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.railField}>
      <Text style={[styles.railFieldLabel, { color: palette.textFaint }]}>{label}</Text>
      <View style={styles.railChoices}>
        {values.map((value) => {
          const active = value === selected;
          return (
            <Pressable
              key={String(value)}
              onPress={() => onSelect(value)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              style={({ pressed }) => [
                styles.railChoice,
                {
                  backgroundColor: active ? soft : palette.canvasRaised,
                  borderColor: active ? tone : palette.line,
                },
                pressed && styles.pressed,
                disabled && styles.disabled,
              ]}
            >
              <Text style={[styles.railChoiceText, { color: active ? tone : palette.textSoft }]}>
                {format ? format(value) : String(value)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DirectionRail({
  direction,
  slots,
  leverage,
  margin,
  options,
  disabled,
  onSlots,
  onLeverage,
  onMargin,
}: {
  direction: 'LONG' | 'SHORT';
  slots: number;
  leverage: number;
  margin: string;
  options: AccountConfigurationOptions;
  disabled: boolean;
  onSlots: (value: number) => void;
  onLeverage: (value: number) => void;
  onMargin: (value: string) => void;
}) {
  const { palette } = useTheme();
  const tone = direction === 'LONG' ? palette.green : palette.red;
  const soft = direction === 'LONG' ? palette.greenSoft : palette.redSoft;

  return (
    <View style={[styles.directionRail, { backgroundColor: palette.panel, borderColor: palette.line }]}>
      <View style={[styles.railSignal, { backgroundColor: tone }]} />
      <View style={styles.railHeader}>
        <Text style={[styles.railTitle, { color: tone }]}>{direction}</Text>
        <Ionicons name={direction === 'LONG' ? 'arrow-up' : 'arrow-down'} size={16} color={tone} />
      </View>
      <DirectionChoice label="POSITION SLOTS" values={options.total_positions} selected={slots} tone={tone} soft={soft} disabled={disabled} onSelect={onSlots} />
      <DirectionChoice label="LEVERAGE" values={options.position_leverage} selected={leverage} tone={tone} soft={soft} disabled={disabled} format={(value) => `${value}×`} onSelect={onLeverage} />
      <DirectionChoice label="MARGIN / POSITION" values={options.margin_percentage} selected={margin} tone={tone} soft={soft} disabled={disabled} format={(value) => `${value}%`} onSelect={onMargin} />
    </View>
  );
}

function statusTone(account: ManagedAccount, palette: Palette): { color: string; soft: string } {
  if (account.connectivity_health.kind === 'healthy') {
    return { color: palette.green, soft: palette.greenSoft };
  }
  if (account.connectivity_health.kind === 'critical' || account.connectivity_health.kind === 'degraded') {
    return { color: palette.red, soft: palette.redSoft };
  }
  return { color: palette.amber, soft: palette.amberSoft };
}

export function AccountsScreen() {
  const { palette } = useTheme();
  const { expireSession, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [options, setOptions] = useState<AccountConfigurationOptions | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<AccountDraft | null>(null);
  const [quotes, setQuotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const requestId = useRef(0);

  const selected = accounts.find((account) => account.id === selectedId) ?? null;
  const dirty = Boolean(selected && draft && accountHasChanges(selected, draft));

  const loadQuotes = useCallback(async (account: ManagedAccount) => {
    if (account.configuration_locked || account.quotes_locked) {
      setQuotes([account.portfolio_quote, account.trading_quote]);
      return;
    }

    try {
      const response = await api.get<AccountQuotesResponse>(`/accounts/quotes?account_id=${account.id}`);
      setQuotes(Array.from(new Set([
        account.portfolio_quote,
        account.trading_quote,
        ...response.assets,
      ].filter(Boolean))));
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await expireSession();
        return;
      }
      setQuotes([account.portfolio_quote, account.trading_quote]);
    }
  }, [expireSession]);

  const load = useCallback(async (accountId?: number | null, refresh = false) => {
    const id = ++requestId.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setNotice(null);

    try {
      const response = await api.get<AccountsResponse>('/accounts');
      if (id !== requestId.current) return;

      const nextAccounts = response.data.accounts;
      const nextSelected = nextAccounts.find((account) => account.id === accountId)
        ?? nextAccounts[0]
        ?? null;

      setAccounts(nextAccounts);
      setOptions(response.data.options);
      setSelectedId(nextSelected?.id ?? null);
      setDraft(nextSelected ? accountDraft(nextSelected) : null);

      if (nextSelected) {
        await SecureStore.setItemAsync(ACCOUNT_KEY, String(nextSelected.id));
        void loadQuotes(nextSelected);
      } else {
        setQuotes([]);
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await expireSession();
        return;
      }
      setNotice({
        tone: 'error',
        title: 'Accounts unavailable',
        message: caught instanceof ApiError ? caught.message : 'Unable to load account configuration.',
      });
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [expireSession, loadQuotes]);

  useEffect(() => {
    let alive = true;
    void SecureStore.getItemAsync(ACCOUNT_KEY).then((storedAccount) => {
      if (alive) void load(storedAccount ? Number(storedAccount) : null);
    });
    return () => { alive = false; };
  }, [load]);

  const switchAccount = (accountId: number) => {
    setPickerOpen(false);

    const apply = () => {
      const account = accounts.find((candidate) => candidate.id === accountId);
      if (!account) return;
      setSelectedId(account.id);
      setDraft(accountDraft(account));
      setNotice(null);
      void SecureStore.setItemAsync(ACCOUNT_KEY, String(account.id));
      void loadQuotes(account);
    };

    if (!dirty) {
      apply();
      return;
    }

    Alert.alert(
      'Discard unsaved changes?',
      'Switching accounts will restore the last saved values.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: apply },
      ],
    );
  };

  const requireFreshSignIn = (message: string) => {
    setNotice({
      tone: 'warning',
      title: 'Sign in again',
      message,
      signInAgain: true,
    });
  };

  const save = async () => {
    if (!selected || !draft || selected.configuration_locked || !dirty || saving) return;
    if (!draft.name.trim()) {
      setNotice({ tone: 'error', title: 'Account name required', message: 'Enter a name before saving.' });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      await api.patch('/accounts', accountPayload(selected.id, draft));
      await load(selected.id, true);
      setNotice({
        tone: 'success',
        title: 'Configuration saved',
        message: 'New positions will use these settings. Existing positions stay unchanged.',
      });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await expireSession();
        return;
      }
      if (caught instanceof ApiError && caught.status === 403) {
        requireFreshSignIn('Your current mobile session predates account editing. Sign out and sign in once to unlock saves.');
        return;
      }
      setNotice({
        tone: 'error',
        title: 'Configuration not saved',
        message: caught instanceof ApiError
          ? accountErrorMessage(caught.errors, caught.message)
          : 'Unable to save account configuration.',
      });
    } finally {
      setSaving(false);
    }
  };

  const disableTrading = async () => {
    if (!selected || disabling) return;
    setDisabling(true);
    setNotice(null);

    try {
      await api.patch('/accounts/trading/disable', { account_id: selected.id });
      setAccounts((current) => current.map((account) => account.id === selected.id
        ? { ...account, can_trade: false, is_trading: false, quotes_locked: account.open_positions_count > 0 }
        : account));
      setDraft((current) => current ? { ...current, can_trade: false } : current);
      setNotice({
        tone: 'success',
        title: 'New trading stopped',
        message: selected.open_positions_count > 0
          ? 'No new positions will open. Existing positions remain managed.'
          : 'No new positions will open for this account.',
      });
      void loadQuotes({ ...selected, can_trade: false, quotes_locked: selected.open_positions_count > 0 });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await expireSession();
        return;
      }
      if (caught instanceof ApiError && caught.status === 403) {
        requireFreshSignIn('Your current mobile session predates account editing. Sign out and sign in once to unlock controls.');
        return;
      }
      setNotice({
        tone: 'error',
        title: 'Trading not changed',
        message: caught instanceof ApiError ? caught.message : 'Unable to stop new trading.',
      });
    } finally {
      setDisabling(false);
    }
  };

  const toggleTrading = () => {
    if (!selected || !draft || disabling || selected.configuration_locked) return;
    if (!draft.can_trade) {
      if (!selected.can_enable_trading) {
        setNotice({
          tone: 'warning',
          title: 'Trading stays disabled',
          message: !selected.subscription_active
            ? 'Activate the subscription before enabling new positions.'
            : 'This account needs a healthy connection before trading can be enabled.',
        });
        return;
      }
      setDraft({ ...draft, can_trade: true });
      return;
    }

    if (selected.open_positions_count > 0) {
      Alert.alert(
        'Stop opening new positions?',
        `${selected.open_positions_count} open position${selected.open_positions_count === 1 ? '' : 's'} will remain managed. No new positions will open.`,
        [
          { text: 'Keep trading', style: 'cancel' },
          { text: 'Stop new trading', style: 'destructive', onPress: () => void disableTrading() },
        ],
      );
      return;
    }

    void disableTrading();
  };

  const quoteOptions = useMemo(() => Array.from(new Set([
    draft?.portfolio_quote,
    draft?.trading_quote,
    ...quotes,
  ].filter((value): value is string => Boolean(value)))), [draft?.portfolio_quote, draft?.trading_quote, quotes]);

  const updateDraft = <K extends keyof AccountDraft>(key: K, value: AccountDraft[K]) => {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  };

  const tone = selected ? statusTone(selected, palette) : null;
  const controlsLocked = Boolean(selected?.configuration_locked);
  const quotesLocked = Boolean(selected && draft && (selected.open_positions_count > 0 || draft.can_trade));

  return (
    <View style={[styles.screen, { backgroundColor: palette.canvas, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 112 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(selectedId, true)} tintColor={palette.green} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader />

        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Text style={[styles.pageEyebrow, { color: palette.green }]}>TRADING PARAMETERS</Text>
            <Text style={[styles.pageTitle, { color: palette.text }]}>Accounts</Text>
            <Text style={[styles.pageCopy, { color: palette.textSoft }]}>Control how this account opens new positions.</Text>
          </View>
          <View style={[styles.controlBadge, { backgroundColor: palette.panel, borderColor: palette.line }]}>
            <Ionicons name="options-outline" size={14} color={palette.textSoft} />
            <Text style={[styles.controlBadgeText, { color: palette.textSoft }]}>CONTROL</Text>
          </View>
        </View>

        <Pressable onPress={() => setPickerOpen(true)} disabled={accounts.length < 2} style={[styles.accountSelector, { backgroundColor: palette.panel, borderColor: palette.line }]}>
          <View style={[styles.accountSignal, { backgroundColor: selected?.can_trade ? palette.green : palette.amber }]} />
          <View style={styles.selectorCopy}>
            <Text style={[styles.selectorLabel, { color: palette.textFaint }]}>TRADING ACCOUNT</Text>
            <Text style={[styles.selectorValue, { color: palette.text }]}>{selected ? `${selected.name} · ${selected.exchange}` : 'No trading account'}</Text>
          </View>
          {dirty ? <View style={[styles.unsavedDot, { backgroundColor: palette.amber }]} /> : null}
          {accounts.length > 1 ? <Ionicons name="chevron-down" size={19} color={palette.textSoft} /> : null}
        </Pressable>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={palette.green} />
            <Text style={[styles.loadingText, { color: palette.textSoft }]}>Loading account controls</Text>
          </View>
        ) : null}

        {!loading && selected && draft && options ? (
          <>
            <View style={[styles.statusPanel, { backgroundColor: palette.panel, borderColor: palette.line }]}>
              <View style={[styles.statusMark, { backgroundColor: tone?.soft }]}>
                <Ionicons name={selected.connectivity_health.kind === 'healthy' ? 'link' : 'alert-circle-outline'} size={22} color={tone?.color} />
              </View>
              <View style={styles.statusCopy}>
                <Text style={[styles.statusTitle, { color: palette.text }]}>{selected.connectivity_health.label}</Text>
                <Text style={[styles.statusMeta, { color: palette.textSoft }]}>
                  {selected.can_trade ? 'New positions enabled' : 'New positions disabled'} · {selected.open_positions_count} open
                </Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: selected.can_trade ? palette.greenSoft : palette.amberSoft }]}>
                <Text style={[styles.statusPillText, { color: selected.can_trade ? palette.green : palette.amber }]}>
                  {selected.can_trade ? 'TRADING' : 'PAUSED'}
                </Text>
              </View>
            </View>

            {selected.configuration_locked ? (
              <View style={[styles.banner, { backgroundColor: palette.amberSoft, borderColor: palette.amber }]}>
                <Ionicons name="key-outline" size={19} color={palette.amber} />
                <View style={styles.bannerCopy}>
                  <Text style={[styles.bannerTitle, { color: palette.text }]}>Connect this account first</Text>
                  <Text style={[styles.bannerText, { color: palette.textSoft }]}>Configuration unlocks after a successful connection in admin.kraite.</Text>
                </View>
              </View>
            ) : null}

            {!selected.subscription_active ? (
              <View style={[styles.banner, { backgroundColor: palette.amberSoft, borderColor: palette.amber }]}>
                <Ionicons name="card-outline" size={19} color={palette.amber} />
                <View style={styles.bannerCopy}>
                  <Text style={[styles.bannerTitle, { color: palette.text }]}>Subscription inactive</Text>
                  <Text style={[styles.bannerText, { color: palette.textSoft }]}>Open positions stay managed, but new positions cannot be enabled.</Text>
                </View>
              </View>
            ) : null}

            <View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.line }, controlsLocked && styles.locked]}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={[styles.sectionEyebrow, { color: palette.textFaint }]}>IDENTITY & QUOTES</Text>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Account basics</Text>
                </View>
                <Ionicons name="finger-print-outline" size={20} color={palette.textFaint} />
              </View>

              <View style={styles.textField}>
                <Text style={[styles.fieldLabel, { color: palette.text }]}>Account name</Text>
                <TextInput
                  value={draft.name}
                  onChangeText={(value) => updateDraft('name', value)}
                  editable={!controlsLocked}
                  maxLength={255}
                  placeholder="Account name"
                  placeholderTextColor={palette.textFaint}
                  selectionColor={palette.green}
                  style={[styles.input, { backgroundColor: palette.canvasRaised, borderColor: palette.line, color: palette.text }]}
                />
                <Text style={[styles.fieldHelp, { color: palette.textFaint }]}>Label only. Does not affect trading.</Text>
              </View>

              <View style={[styles.tradingControl, { backgroundColor: palette.canvasRaised, borderColor: palette.line }]}>
                <Pressable
                  onPress={toggleTrading}
                  disabled={controlsLocked || disabling}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: draft.can_trade, disabled: controlsLocked || disabling }}
                  style={[
                    styles.toggle,
                    { backgroundColor: draft.can_trade ? palette.green : palette.track },
                    (controlsLocked || disabling) && styles.disabled,
                  ]}
                >
                  <View style={[styles.toggleThumb, { backgroundColor: palette.panel }, draft.can_trade && styles.toggleThumbOn]} />
                </Pressable>
                <View style={styles.tradingCopy}>
                  <Text style={[styles.tradingLabel, { color: draft.can_trade ? palette.green : palette.textSoft }]}>
                    {disabling ? 'UPDATING' : draft.can_trade ? 'CAN TRADE' : 'NOT TRADING'}
                  </Text>
                  <Text style={[styles.tradingHelp, { color: palette.textFaint }]}>Controls new positions only.</Text>
                </View>
              </View>

              <ChoiceRow
                label="Portfolio quote"
                help={quotesLocked ? 'Locked while trading is enabled or positions are open.' : 'Portfolio valuation currency.'}
                values={quoteOptions}
                selected={draft.portfolio_quote}
                disabled={controlsLocked || quotesLocked}
                onSelect={(value) => updateDraft('portfolio_quote', value)}
              />
              <ChoiceRow
                label="Trading quote"
                help={quotesLocked ? 'Locked while trading is enabled or positions are open.' : 'Quote currency for new positions.'}
                values={quoteOptions}
                selected={draft.trading_quote}
                disabled={controlsLocked || quotesLocked}
                onSelect={(value) => updateDraft('trading_quote', value)}
              />
            </View>

            <View style={[styles.sectionCard, { backgroundColor: palette.panel, borderColor: palette.line }, controlsLocked && styles.locked]}>
              <View style={styles.sectionHeading}>
                <View>
                  <Text style={[styles.sectionEyebrow, { color: palette.textFaint }]}>EXIT PARAMETERS</Text>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>Profit and protection</Text>
                </View>
                <Ionicons name="pulse-outline" size={20} color={palette.textFaint} />
              </View>
              <ChoiceRow
                label="Profit target"
                help="Closes after price moves in your favor."
                values={options.profit_percentage}
                selected={draft.profit_percentage}
                format={(value) => `${value}%`}
                disabled={controlsLocked}
                onSelect={(value) => updateDraft('profit_percentage', value)}
              />
              <ChoiceRow
                label="Stop-loss"
                help="Limits loss after price moves against you."
                values={options.stop_market_initial_percentage}
                selected={draft.stop_market_initial_percentage}
                format={(value) => `${value}%`}
                disabled={controlsLocked}
                onSelect={(value) => updateDraft('stop_market_initial_percentage', value)}
              />
            </View>

            <View style={styles.riskHeading}>
              <View>
                <Text style={[styles.sectionEyebrow, { color: palette.textFaint }]}>DIRECTIONAL RISK</Text>
                <Text style={[styles.riskTitle, { color: palette.text }]}>Long / short rails</Text>
              </View>
              <Text style={[styles.riskCopy, { color: palette.textSoft }]}>Saved maximums per side</Text>
            </View>

            <View style={styles.directionGrid}>
              <DirectionRail
                direction="LONG"
                slots={draft.total_positions_long}
                leverage={draft.position_leverage_long}
                margin={draft.margin_percentage_long}
                options={options}
                disabled={controlsLocked}
                onSlots={(value) => updateDraft('total_positions_long', value)}
                onLeverage={(value) => updateDraft('position_leverage_long', value)}
                onMargin={(value) => updateDraft('margin_percentage_long', value)}
              />
              <DirectionRail
                direction="SHORT"
                slots={draft.total_positions_short}
                leverage={draft.position_leverage_short}
                margin={draft.margin_percentage_short}
                options={options}
                disabled={controlsLocked}
                onSlots={(value) => updateDraft('total_positions_short', value)}
                onLeverage={(value) => updateDraft('position_leverage_short', value)}
                onMargin={(value) => updateDraft('margin_percentage_short', value)}
              />
            </View>

            <View style={[styles.overrideNote, { backgroundColor: palette.panelStrong, borderColor: palette.line }]}>
              <Ionicons name="shield-checkmark-outline" size={19} color={palette.green} />
              <Text style={[styles.overrideText, { color: palette.textSoft }]}>
                BSCS and exchange limits may reduce slots, leverage, or margin. Profit target and stop-loss remain unchanged. Existing positions keep their opening values.
              </Text>
            </View>

            <Pressable
              onPress={() => void save()}
              disabled={!dirty || controlsLocked || saving}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: dirty && !controlsLocked ? palette.green : palette.panelStrong },
                pressed && styles.pressed,
                (!dirty || controlsLocked || saving) && styles.disabled,
              ]}
            >
              {saving ? <ActivityIndicator size="small" color={palette.greenDeep} /> : <Ionicons name={dirty ? 'save-outline' : 'checkmark-circle-outline'} size={19} color={dirty && !controlsLocked ? palette.greenDeep : palette.textFaint} />}
              <Text style={[styles.saveText, { color: dirty && !controlsLocked ? palette.greenDeep : palette.textFaint }]}>
                {saving ? 'Saving configuration' : dirty ? 'Save configuration' : 'Configuration saved'}
              </Text>
            </Pressable>
            <Text style={[styles.saveCaption, { color: palette.textFaint }]}>Changes apply only to positions opened after saving.</Text>
          </>
        ) : null}

        {!loading && !selected ? (
          <View style={[styles.empty, { backgroundColor: palette.panel, borderColor: palette.line }]}>
            <View style={[styles.emptyIcon, { backgroundColor: palette.amberSoft }]}>
              <Ionicons name="link-outline" size={24} color={palette.amber} />
            </View>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No trading account</Text>
            <Text style={[styles.emptyCopy, { color: palette.textSoft }]}>Create and connect an exchange account in admin.kraite first.</Text>
          </View>
        ) : null}
      </ScrollView>

      {notice ? (
        <NoticeOverlay
          tone={notice.tone}
          title={notice.title}
          message={notice.message}
          actionLabel={notice.signInAgain ? 'Sign out and sign in again' : undefined}
          actionIcon={notice.signInAgain ? 'log-out-outline' : undefined}
          onAction={notice.signInAgain ? () => void logout() : undefined}
          onDismiss={() => setNotice(null)}
        />
      ) : null}

      <AccountPicker visible={pickerOpen} accounts={accounts} selectedId={selectedId} onSelect={switchAccount} onClose={() => setPickerOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: spacing(2), paddingTop: spacing(1.75), gap: spacing(1.5) },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing(1.5), gap: spacing(1) },
  heroCopy: { flex: 1 },
  pageEyebrow: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 1.8 },
  pageTitle: { fontFamily: fonts.display, fontSize: 36, letterSpacing: -1.5, marginTop: 2 },
  pageCopy: { fontFamily: fonts.regular, fontSize: 13, marginTop: 3 },
  controlBadge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  controlBadgeText: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 1 },
  accountSelector: { minHeight: 62, borderWidth: 1, borderRadius: radius.control, paddingHorizontal: spacing(1.5), flexDirection: 'row', alignItems: 'center', gap: spacing(1.25) },
  accountSignal: { width: 8, height: 34, borderRadius: radius.pill },
  selectorCopy: { flex: 1, gap: 3 },
  selectorLabel: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 1.2 },
  selectorValue: { fontFamily: fonts.medium, fontSize: 15 },
  unsavedDot: { width: 8, height: 8, borderRadius: 4 },
  loading: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: spacing(1.25) },
  loadingText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },
  statusPanel: { minHeight: 78, borderWidth: 1, borderRadius: radius.card, padding: spacing(1.25), flexDirection: 'row', alignItems: 'center', gap: spacing(1.25) },
  statusMark: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, gap: 4 },
  statusTitle: { fontFamily: fonts.medium, fontSize: 14.5 },
  statusMeta: { fontFamily: fonts.regular, fontSize: 11.5 },
  statusPill: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 6 },
  statusPillText: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 0.8 },
  banner: { borderWidth: 1, borderRadius: radius.control, padding: spacing(1.25), flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1) },
  bannerCopy: { flex: 1, gap: 3 },
  bannerTitle: { fontFamily: fonts.medium, fontSize: 13.5 },
  bannerText: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16 },
  sectionCard: { borderWidth: 1, borderRadius: radius.card, padding: spacing(1.5), gap: spacing(2) },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionEyebrow: { fontFamily: fonts.monoBold, fontSize: 8, letterSpacing: 1.25 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 21, letterSpacing: -0.6, marginTop: 3 },
  textField: { gap: 7 },
  fieldHeading: { gap: 3 },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 13 },
  fieldHelp: { fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 15 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: spacing(1.25), fontFamily: fonts.medium, fontSize: 14 },
  tradingControl: { minHeight: 62, borderWidth: 1, borderRadius: 14, paddingHorizontal: spacing(1.25), flexDirection: 'row', alignItems: 'center', gap: spacing(1.25) },
  toggle: { width: 48, height: 28, borderRadius: radius.pill, padding: 3, justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11 },
  toggleThumbOn: { transform: [{ translateX: 20 }] },
  tradingCopy: { flex: 1, gap: 3 },
  tradingLabel: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 0.9 },
  tradingHelp: { fontFamily: fonts.regular, fontSize: 10.5 },
  choiceField: { gap: spacing(1) },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { minWidth: 68, minHeight: 40, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontFamily: fonts.monoBold, fontSize: 11 },
  riskHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: spacing(0.5) },
  riskTitle: { fontFamily: fonts.display, fontSize: 23, letterSpacing: -0.7, marginTop: 3 },
  riskCopy: { fontFamily: fonts.regular, fontSize: 10.5 },
  directionGrid: { flexDirection: 'row', gap: spacing(1) },
  directionRail: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: radius.card, padding: spacing(1.25), gap: spacing(1.5), overflow: 'hidden' },
  railSignal: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  railHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  railTitle: { fontFamily: fonts.monoBold, fontSize: 12, letterSpacing: 1.4 },
  railField: { gap: 7 },
  railFieldLabel: { fontFamily: fonts.monoBold, fontSize: 7.4, lineHeight: 10, letterSpacing: 0.65 },
  railChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  railChoice: { minWidth: 37, minHeight: 34, borderWidth: 1, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  railChoiceText: { fontFamily: fonts.monoBold, fontSize: 9 },
  overrideNote: { borderWidth: 1, borderRadius: radius.control, padding: spacing(1.25), flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1) },
  overrideText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 16 },
  saveButton: { minHeight: 54, borderRadius: radius.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing(1) },
  saveText: { fontFamily: fonts.medium, fontSize: 14 },
  saveCaption: { fontFamily: fonts.mono, fontSize: 8.5, letterSpacing: 0.4, textAlign: 'center', marginTop: -4 },
  empty: { borderWidth: 1, borderRadius: radius.card, padding: spacing(3), alignItems: 'center' },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fonts.display, fontSize: 19, marginTop: spacing(1.5) },
  emptyCopy: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4 },
  pressed: { opacity: 0.76 },
  disabled: { opacity: 0.45 },
  locked: { opacity: 0.52 },
});

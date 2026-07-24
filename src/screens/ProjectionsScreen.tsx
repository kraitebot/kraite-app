import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  Account,
  ProjectionCalendar,
  ProjectionMilestone,
  ProjectionScenario,
  ProjectionYearly,
  ProjectionsResponse,
} from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { AccountPicker } from '../components/AccountPicker';
import { Logo } from '../components/Logo';
import { NoticeOverlay } from '../components/ScreenState';
import { ACCOUNT_KEY } from '../dashboard/preferences';
import {
  buildProjectionMonth,
  PROJECTION_SCENARIOS,
  projectionCapitalMilestones,
  projectionCompactMoney,
  projectionDailyRate,
  projectionInvestment,
  projectionMoney,
  projectionMonthLabel,
  projectionMultiple,
  projectionPercent,
  projectionScenarioLabel,
  shiftProjectionMonth,
} from '../projections/presentation';
import { Palette, useTheme } from '../theme/ThemeContext';
import { fonts, radius, spacing } from '../theme/tokens';

type ProjectionTab = 'daily' | 'yearly';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function scenarioColor(palette: Palette, scenario: ProjectionScenario): string {
  if (scenario === 'pessimistic') return palette.red;
  if (scenario === 'optimistic') return palette.green;
  return palette.amber;
}

function scenarioSoftColor(palette: Palette, scenario: ProjectionScenario): string {
  if (scenario === 'pessimistic') return palette.redSoft;
  if (scenario === 'optimistic') return palette.greenSoft;
  return palette.amberSoft;
}

function PageTabs({ selected, onSelect }: {
  selected: ProjectionTab;
  onSelect: (tab: ProjectionTab) => void;
}) {
  const { palette } = useTheme();
  const options: { key: ProjectionTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'daily', label: 'Daily profit', icon: 'calendar-outline' },
    { key: 'yearly', label: 'Year by year', icon: 'bar-chart-outline' },
  ];

  return (
    <View style={[styles.tabs, { backgroundColor: palette.panel, borderColor: palette.line }]}>
      {options.map((option) => {
        const active = selected === option.key;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option.key)}
            style={({ pressed }) => [
              styles.tab,
              active && { backgroundColor: palette.greenSoft },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name={option.icon} size={16} color={active ? palette.green : palette.textSoft} />
            <Text style={[styles.tabText, { color: active ? palette.green : palette.textSoft }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScenarioSelector({ selected, rates, disabled = false, onSelect }: {
  selected: ProjectionScenario;
  rates: Record<ProjectionScenario, string | null>;
  disabled?: boolean;
  onSelect: (scenario: ProjectionScenario) => void;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.scenarioBlock}>
      <View style={styles.scenarioHeading}>
        <Text style={[styles.controlLabel, { color: palette.textFaint }]}>PLANNING SCENARIO</Text>
        <Text style={[styles.scenarioRate, { color: scenarioColor(palette, selected) }]}>
          {projectionDailyRate(rates[selected])}
        </Text>
      </View>
      <View style={[styles.scenarios, { backgroundColor: palette.panelStrong, borderColor: palette.line }]}>
        {PROJECTION_SCENARIOS.map((scenario) => {
          const active = scenario === selected;
          return (
            <Pressable
              key={scenario}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              onPress={() => onSelect(scenario)}
              style={({ pressed }) => [
                styles.scenario,
                active && { backgroundColor: scenarioColor(palette, scenario) },
                pressed && styles.pressed,
                disabled && styles.disabled,
              ]}
            >
              <Text style={[
                styles.scenarioText,
                { color: active ? (scenario === 'optimistic' ? '#04140D' : '#FFFFFF') : palette.textSoft },
              ]}>
                {projectionScenarioLabel(scenario)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function CalendarSummary({ calendar, scenario }: {
  calendar: ProjectionCalendar;
  scenario: ProjectionScenario;
}) {
  const { palette } = useTheme();
  const month = useMemo(() => buildProjectionMonth(calendar, scenario), [calendar, scenario]);
  const projectedColor = scenarioColor(palette, scenario);
  const realizedColor = (month.realized ?? 0) < 0 ? palette.red : palette.green;
  const typeLabel = month.kind === 'past' ? 'REALIZED' : month.kind === 'future' ? 'PROJECTED' : 'HYBRID';

  return (
    <View style={[styles.monthSummary, { backgroundColor: palette.panel, borderColor: palette.line }]}>
      <View style={styles.monthSummaryTop}>
        <View>
          <Text style={[styles.controlLabel, { color: palette.textFaint }]}>MONTH OUTLOOK</Text>
          <Text style={[styles.monthSummaryValue, { color: month.kind === 'past' ? realizedColor : projectedColor }]}>
            {projectionMoney(month.endingWallet)}
          </Text>
          <Text style={[styles.monthSummaryCaption, { color: palette.textSoft }]}>
            {month.kind === 'past' ? 'Closing balance' : 'Expected closing balance'}
          </Text>
        </View>
        <View style={[styles.kindBadge, { backgroundColor: month.kind === 'past' ? palette.greenSoft : scenarioSoftColor(palette, scenario) }]}>
          <Text style={[styles.kindBadgeText, { color: month.kind === 'past' ? palette.green : projectedColor }]}>{typeLabel}</Text>
        </View>
      </View>
      <View style={[styles.summaryRule, { backgroundColor: palette.line }]} />
      <View style={styles.summaryMetrics}>
        <View style={styles.summaryMetric}>
          <Text style={[styles.summaryMetricLabel, { color: palette.textFaint }]}>OPENED AT</Text>
          <Text style={[styles.summaryMetricValue, { color: palette.text }]}>{projectionMoney(month.openingWallet)}</Text>
        </View>
        <View style={styles.summaryMetric}>
          <Text style={[styles.summaryMetricLabel, { color: palette.textFaint }]}>REALIZED</Text>
          <Text style={[styles.summaryMetricValue, { color: realizedColor }]}>
            {month.realized === null ? '—' : projectionCompactMoney(month.realized)}
          </Text>
        </View>
        <View style={styles.summaryMetric}>
          <Text style={[styles.summaryMetricLabel, { color: palette.textFaint }]}>PROJECTED</Text>
          <Text style={[styles.summaryMetricValue, { color: projectedColor }]}>
            {month.projected === null || month.rate === null ? '—' : projectionCompactMoney(month.projected)}
          </Text>
        </View>
        <View style={styles.summaryMetric}>
          <Text style={[styles.summaryMetricLabel, { color: palette.textFaint }]}>RETURN</Text>
          <Text style={[styles.summaryMetricValue, { color: month.kind === 'past' ? realizedColor : projectedColor }]}>
            {projectionPercent(month.monthlyReturnPct)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function DailyCalendar({ calendar, scenario, onShift }: {
  calendar: ProjectionCalendar;
  scenario: ProjectionScenario;
  onShift: (delta: number) => void;
}) {
  const { palette } = useTheme();
  const month = useMemo(() => buildProjectionMonth(calendar, scenario), [calendar, scenario]);
  const scenarioTone = scenarioColor(palette, scenario);
  const [todayYear, todayMonth] = calendar.today.split('-').map(Number);
  const viewedAbsolute = calendar.year * 12 + calendar.month - 1;
  const todayAbsolute = todayYear! * 12 + todayMonth! - 1;
  const canGoBack = viewedAbsolute > todayAbsolute - 14;
  const canGoForward = viewedAbsolute < todayAbsolute + 72;

  return (
    <View style={[styles.calendarCard, { backgroundColor: palette.panel, borderColor: palette.line }]}>
      <View style={styles.calendarHeader}>
        <Pressable
          disabled={!canGoBack}
          accessibilityLabel="Previous month"
          onPress={() => onShift(-1)}
          style={[styles.monthArrow, { backgroundColor: palette.panelStrong, opacity: canGoBack ? 1 : 0.3 }]}
        >
          <Ionicons name="chevron-back" size={18} color={palette.text} />
        </Pressable>
        <View style={styles.calendarTitleBlock}>
          <Text style={[styles.calendarTitle, { color: palette.text }]}>{projectionMonthLabel(calendar.year, calendar.month)}</Text>
          <Text style={[styles.calendarSubtitle, { color: palette.textFaint }]}>UTC · PROFIT BY CLOSE DATE</Text>
        </View>
        <Pressable
          disabled={!canGoForward}
          accessibilityLabel="Next month"
          onPress={() => onShift(1)}
          style={[styles.monthArrow, { backgroundColor: palette.panelStrong, opacity: canGoForward ? 1 : 0.3 }]}
        >
          <Ionicons name="chevron-forward" size={18} color={palette.text} />
        </Pressable>
      </View>
      <View style={[styles.calendarRule, { backgroundColor: palette.line }]} />
      <View style={styles.weekRow}>
        {WEEKDAYS.map((weekday, index) => (
          <Text key={`${weekday}-${index}`} style={[styles.weekday, { color: palette.textFaint }]}>{weekday}</Text>
        ))}
      </View>
      <View style={styles.dayGrid}>
        {Array.from({ length: month.firstWeekday }).map((_, index) => <View key={`lead-${index}`} style={styles.dayCell} />)}
        {month.days.map((day) => {
          const isProjected = day.kind === 'projected';
          const isToday = day.kind === 'today';
          const amountColor = isProjected
            ? scenarioTone
            : (day.amount ?? 0) > 0 ? palette.green : (day.amount ?? 0) < 0 ? palette.red : palette.textFaint;
          const showAmount = day.kind !== 'empty' && !(isProjected && month.rate === null);
          return (
            <View
              key={day.day}
              style={[
                styles.dayCell,
                styles.dayCellFilled,
                { borderColor: isToday ? palette.green : palette.line },
                isProjected && { backgroundColor: scenarioSoftColor(palette, scenario) },
                isToday && { borderWidth: 1.5 },
              ]}
            >
              <View style={styles.dayNumberRow}>
                <Text style={[styles.dayNumber, { color: isToday ? palette.green : palette.textSoft }]}>{day.day}</Text>
                {isProjected ? <View style={[styles.projectedDot, { backgroundColor: scenarioTone }]} /> : null}
              </View>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.dayAmount, { color: amountColor }]}>
                {showAmount ? projectionCompactMoney(day.amount) : ''}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={[styles.calendarLegend, { borderTopColor: palette.line }]}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: palette.green }]} /><Text style={[styles.legendText, { color: palette.textSoft }]}>Realized</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: scenarioTone }]} /><Text style={[styles.legendText, { color: palette.textSoft }]}>Projected</Text></View>
        <Text style={[styles.legendNote, { color: palette.textFaint }]}>{calendar.scenarios.days_observed} observed days</Text>
      </View>
    </View>
  );
}

function ProfitFundingCard({ calendar, additional, onAdditionalChange }: {
  calendar: ProjectionCalendar;
  additional: string;
  onAdditionalChange: (value: string) => void;
}) {
  const { palette } = useTheme();
  const investment = useMemo(
    () => projectionInvestment(calendar, additional),
    [additional, calendar],
  );
  const milestones = useMemo(
    () => projectionCapitalMilestones(calendar, additional),
    [additional, calendar],
  );

  return (
    <View style={[styles.fundingCard, { backgroundColor: palette.panel, borderColor: palette.line }]}>
      <View style={styles.fundingHeader}>
        <View style={styles.fundingTitleRow}>
          <View style={[styles.fundingIcon, { backgroundColor: palette.greenSoft }]}>
            <Ionicons name="flag-outline" size={18} color={palette.green} />
          </View>
          <View>
            <Text style={[styles.fundingTitle, { color: palette.text }]}>Profit-funded milestone</Text>
            <Text style={[styles.fundingCopy, { color: palette.textSoft }]}>When profit can replace personal capital.</Text>
          </View>
        </View>
        {investment.available ? (
          <View style={[styles.autoBadge, { backgroundColor: investment.isComplete ? palette.greenSoft : palette.amberSoft }]}>
            <Text style={[styles.autoBadgeText, { color: investment.isComplete ? palette.green : palette.amber }]}>
              {investment.isComplete ? 'AUTO' : 'PARTIAL'}
            </Text>
          </View>
        ) : null}
      </View>

      {investment.available ? (
        <>
          <View style={[styles.fundingRule, { backgroundColor: palette.line }]} />
          <View style={styles.fundingGrid}>
            <View style={styles.fundingMetric}>
              <Text style={[styles.fundingMetricLabel, { color: palette.textFaint }]}>PERSONAL INVESTMENT</Text>
              <Text style={[styles.fundingMetricValue, { color: palette.text }]}>{projectionMoney(investment.autoBasis)}</Text>
              <Text style={[styles.fundingMetricCopy, { color: palette.textFaint }]}>Auto-assessed</Text>
            </View>
            <View style={styles.fundingMetric}>
              <Text style={[styles.fundingMetricLabel, { color: palette.textFaint }]}>PROFIT STILL NEEDED</Text>
              <Text style={[styles.fundingMetricValue, { color: palette.text }]}>{projectionMoney(investment.needed)}</Text>
              <Text style={[styles.fundingMetricCopy, { color: palette.textFaint }]}>Above simulated wallet</Text>
            </View>
            <View style={styles.fundingMetric}>
              <Text style={[styles.fundingMetricLabel, { color: palette.textFaint }]}>PROFIT-FUNDED TARGET</Text>
              <Text style={[styles.fundingMetricValue, { color: palette.green }]}>{projectionMoney(investment.target)}</Text>
              <Text style={[styles.fundingMetricCopy, { color: palette.textFaint }]}>2× net investment</Text>
            </View>
            <View style={styles.fundingMetric}>
              <Text style={[styles.fundingMetricLabel, { color: palette.textFaint }]}>ADDITIONAL · WHAT-IF</Text>
              <View style={[styles.investmentInput, { backgroundColor: palette.panelStrong, borderColor: palette.line }]}>
                <Text style={[styles.inputCurrency, { color: palette.textFaint }]}>$</Text>
                <TextInput
                  value={additional}
                  onChangeText={onAdditionalChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={palette.textFaint}
                  accessibilityLabel="Hypothetical additional investment"
                  style={[styles.input, { color: palette.text }]}
                />
                {investment.additional > 0 ? (
                  <Pressable accessibilityLabel="Clear additional investment" onPress={() => onAdditionalChange('')}>
                    <Ionicons name="close-circle" size={17} color={palette.textFaint} />
                  </Pressable>
                ) : null}
              </View>
              <Text style={[styles.fundingMetricCopy, { color: palette.textFaint }]}>Temporary simulation</Text>
            </View>
          </View>
          <View style={[styles.fundingRule, { backgroundColor: palette.line }]} />
          <View style={styles.fundingPaths}>
            {milestones.map((milestone) => {
              const tone = scenarioColor(palette, milestone.scenario);
              return (
                <View key={milestone.scenario} style={styles.fundingPath}>
                  <View style={styles.fundingPathTop}>
                    <View style={styles.fundingPathName}>
                      <View style={[styles.pathDot, { backgroundColor: tone }]} />
                      <Text style={[styles.fundingPathLabel, { color: tone }]}>
                        {projectionScenarioLabel(milestone.scenario).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.fundingPathRate, { color: palette.textFaint }]}>
                      {projectionDailyRate(milestone.rate === null ? null : String(milestone.rate))}
                    </Text>
                  </View>
                  <Text style={[
                    styles.fundingPathDate,
                    { color: milestone.state === 'projected' || milestone.state === 'reached' ? tone : palette.textSoft },
                  ]}>
                    {milestone.date}
                  </Text>
                  <Text style={[styles.fundingPathDetail, { color: palette.textFaint }]}>{milestone.detail}</Text>
                </View>
              );
            })}
          </View>
          <View style={[styles.fundingFooter, { backgroundColor: palette.panelStrong, borderTopColor: palette.line }]}>
            <Ionicons name="flag" size={15} color={palette.green} />
            <Text style={[styles.fundingFooterText, { color: palette.textSoft }]}>
              At target, withdraw {projectionMoney(investment.basis)} and keep the same amount trading entirely on profit.
            </Text>
          </View>
          {!investment.isComplete ? (
            <View style={[styles.partialWarning, { borderTopColor: palette.line }]}>
              <Ionicons name="alert-circle-outline" size={16} color={palette.amber} />
              <Text style={[styles.partialWarningText, { color: palette.textSoft }]}>
                {investment.missingPnl} closed {investment.missingPnl === 1 ? 'position is' : 'positions are'} awaiting exchange P&L. This estimate will refine.
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <View style={[styles.fundingUnavailable, { borderTopColor: palette.line }]}>
          <Ionicons name="hourglass-outline" size={18} color={palette.textFaint} />
          <Text style={[styles.fundingUnavailableText, { color: palette.textSoft }]}>
            The milestone appears after the first account balance snapshot.
          </Text>
        </View>
      )}
    </View>
  );
}

function MilestoneCard({ milestone, scenario }: {
  milestone: ProjectionMilestone;
  scenario: ProjectionScenario;
}) {
  const { palette } = useTheme();
  const tone = scenarioColor(palette, scenario);
  const profitNegative = String(milestone.projected_profit ?? '').startsWith('-');

  return (
    <View style={[styles.milestone, { backgroundColor: palette.panel, borderColor: palette.line }]}>
      <View style={[styles.yearStamp, { backgroundColor: scenarioSoftColor(palette, scenario) }]}>
        <Text style={[styles.yearStampValue, { color: tone }]}>{milestone.year}</Text>
        <Text style={[styles.yearStampDays, { color: palette.textSoft }]}>{milestone.days} DAYS</Text>
      </View>
      <View style={styles.milestoneBody}>
        <Text style={[styles.milestoneLabel, { color: palette.textSoft }]}>{milestone.label.toUpperCase()}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.milestoneWallet, { color: palette.text }]}>
          {projectionMoney(milestone.end_wallet)}
        </Text>
        <View style={styles.milestoneStats}>
          <Text style={[styles.milestoneProfit, { color: profitNegative ? palette.red : palette.green }]}>
            {projectionMoney(milestone.projected_profit, true)}
          </Text>
          <Text style={[styles.milestoneStat, { color: tone }]}>{projectionPercent(milestone.growth_pct)}</Text>
          <Text style={[styles.milestoneStat, { color: palette.textSoft }]}>{projectionMultiple(milestone.multiple)}</Text>
        </View>
      </View>
    </View>
  );
}

function YearlyOutlook({ yearly, scenario }: {
  yearly: ProjectionYearly;
  scenario: ProjectionScenario;
}) {
  const { palette } = useTheme();
  const selected = yearly.outlook.scenarios[scenario];
  const tone = scenarioColor(palette, scenario);
  const unavailable = selected.reason === 'no_wallet'
    ? 'A wallet snapshot is needed before yearly compounding can start.'
    : selected.reason === 'invalid_rate'
      ? 'This observed rate is outside a meaningful compounding range.'
      : 'More realized trading days are needed to build this outlook.';

  return (
    <>
      <View style={[styles.portfolioCard, { backgroundColor: palette.panel, borderColor: palette.line }]}>
        <View style={styles.portfolioHero}>
          <Text style={[styles.controlLabel, { color: palette.textFaint }]}>PORTFOLIO NOW</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.portfolioValue, { color: palette.text }]}>
            {projectionMoney(yearly.current_wallet)}
          </Text>
          <Text style={[styles.portfolioCopy, { color: palette.textSoft }]}>Compounding starts here · {yearly.today}</Text>
        </View>
        <View style={[styles.portfolioRule, { backgroundColor: palette.line }]} />
        <View style={styles.portfolioMetrics}>
          <View style={styles.portfolioMetric}>
            <Text style={[styles.portfolioMetricValue, { color: palette.text }]}>{yearly.account_count}</Text>
            <Text style={[styles.portfolioMetricLabel, { color: palette.textFaint }]}>ACCOUNTS</Text>
          </View>
          <View style={styles.portfolioMetric}>
            <Text style={[styles.portfolioMetricValue, { color: palette.text }]}>{yearly.days_observed}</Text>
            <Text style={[styles.portfolioMetricLabel, { color: palette.textFaint }]}>OBSERVED DAYS</Text>
          </View>
          <View style={styles.portfolioMetric}>
            <Text style={[styles.portfolioMetricValue, { color: tone }]}>{yearly.outlook.years}</Text>
            <Text style={[styles.portfolioMetricLabel, { color: palette.textFaint }]}>YEAR HORIZON</Text>
          </View>
        </View>
      </View>

      {selected.available ? (
        <View style={styles.milestones}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Capital horizon</Text>
              <Text style={[styles.sectionCopy, { color: palette.textSoft }]}>Daily compounding to each year-end.</Text>
            </View>
            <View style={[styles.pathBadge, { backgroundColor: scenarioSoftColor(palette, scenario) }]}>
              <View style={[styles.pathDot, { backgroundColor: tone }]} />
              <Text style={[styles.pathText, { color: tone }]}>{projectionScenarioLabel(scenario).toUpperCase()}</Text>
            </View>
          </View>
          {selected.milestones.map((milestone) => (
            <MilestoneCard key={milestone.end_date} milestone={milestone} scenario={scenario} />
          ))}
        </View>
      ) : (
        <View style={[styles.empty, { backgroundColor: palette.panel, borderColor: palette.line }]}>
          <View style={[styles.emptyIcon, { backgroundColor: palette.amberSoft }]}>
            <Ionicons name="hourglass-outline" size={24} color={palette.amber} />
          </View>
          <Text style={[styles.emptyTitle, { color: palette.text }]}>Outlook is still forming</Text>
          <Text style={[styles.emptyCopy, { color: palette.textSoft }]}>{unavailable}</Text>
        </View>
      )}
    </>
  );
}

export function ProjectionsScreen() {
  const { palette, toggle } = useTheme();
  const { expireSession, user } = useAuth();
  const insets = useSafeAreaInsets();
  const now = new Date();
  const [tab, setTab] = useState<ProjectionTab>('daily');
  const [scenario, setScenario] = useState<ProjectionScenario>('neutral');
  const [additionalInvestment, setAdditionalInvestment] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [calendar, setCalendar] = useState<ProjectionCalendar | null>(null);
  const [yearly, setYearly] = useState<ProjectionYearly | null>(null);
  const [viewed, setViewed] = useState({ year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (
    accountId: number | null,
    year: number,
    month: number,
    refresh = false,
  ) => {
    const id = ++requestId.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = [`year=${year}`, `month=${month}`];
      if (accountId) params.unshift(`account_id=${accountId}`);
      const response = await api.get<ProjectionsResponse>(`/projections?${params.join('&')}`);
      if (id !== requestId.current) return;

      setAccounts(response.data.accounts);
      setSelectedId(response.data.selected_account_id);
      setCalendar(response.data.calendar);
      setYearly(response.data.yearly);
      if (response.data.calendar) {
        setViewed({ year: response.data.calendar.year, month: response.data.calendar.month });
      }
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
        await load(null, year, month, refresh);
        return;
      }
      if (id === requestId.current) {
        setError(caught instanceof ApiError ? caught.message : 'Unable to load projection data.');
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [expireSession]);

  useEffect(() => {
    let alive = true;
    void SecureStore.getItemAsync(ACCOUNT_KEY).then((storedAccount) => {
      if (alive) void load(storedAccount ? Number(storedAccount) : null, viewed.year, viewed.month);
    });
    return () => { alive = false; };
  }, [load]);

  const selectAccount = (accountId: number) => {
    setPickerOpen(false);
    setSelectedId(accountId);
    setAdditionalInvestment('');
    void load(accountId, viewed.year, viewed.month);
  };

  const shiftMonth = (delta: number) => {
    const next = shiftProjectionMonth(viewed.year, viewed.month, delta);
    setViewed(next);
    void load(selectedId, next.year, next.month);
  };

  const selectedAccount = accounts.find((account) => account.id === selectedId);
  const calendarRates: Record<ProjectionScenario, string | null> = {
    pessimistic: calendar?.scenarios.pessimistic_pct ?? null,
    neutral: calendar?.scenarios.neutral_pct ?? null,
    optimistic: calendar?.scenarios.optimistic_pct ?? null,
  };
  const yearlyRates: Record<ProjectionScenario, string | null> = {
    pessimistic: yearly?.outlook.scenarios.pessimistic.daily_pct ?? null,
    neutral: yearly?.outlook.scenarios.neutral.daily_pct ?? null,
    optimistic: yearly?.outlook.scenarios.optimistic.daily_pct ?? null,
  };
  const monthKind = calendar ? buildProjectionMonth(calendar, scenario).kind : null;

  return (
    <View style={[styles.screen, { backgroundColor: palette.canvas, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 105 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(selectedId, viewed.year, viewed.month, true)} tintColor={palette.green} />}
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
            <Text style={[styles.pageEyebrow, { color: palette.green }]}>PERFORMANCE MODEL</Text>
            <Text style={[styles.pageTitle, { color: palette.text }]}>Projections</Text>
            <Text style={[styles.pageCopy, { color: palette.textSoft }]}>Real results. Forward paths.</Text>
          </View>
          <View style={[styles.horizonBadge, { backgroundColor: palette.panel, borderColor: palette.line }]}>
            <Ionicons name="compass-outline" size={14} color={palette.textSoft} />
            <Text style={[styles.horizonBadgeText, { color: palette.textSoft }]}>OUTLOOK</Text>
          </View>
        </View>

        <PageTabs selected={tab} onSelect={setTab} />

        {tab === 'daily' ? (
          <Pressable
            onPress={() => setPickerOpen(true)}
            disabled={accounts.length < 2}
            style={[styles.accountSelector, { backgroundColor: palette.panel, borderColor: palette.line }]}
          >
            <View style={[styles.accountSignal, { backgroundColor: selectedAccount?.is_trading ? palette.green : palette.amber }]} />
            <View style={styles.selectorCopy}>
              <Text style={[styles.selectorLabel, { color: palette.textFaint }]}>DAILY PROFIT CALENDAR</Text>
              <Text style={[styles.selectorValue, { color: palette.text }]}>
                {selectedAccount ? `${selectedAccount.name} · ${selectedAccount.exchange}` : 'No trading account'}
              </Text>
            </View>
            {accounts.length > 1 ? <Ionicons name="chevron-down" size={19} color={palette.textSoft} /> : null}
          </Pressable>
        ) : null}

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={palette.green} />
            <Text style={[styles.loadingText, { color: palette.textSoft }]}>Compounding the outlook</Text>
          </View>
        ) : null}

        {!loading && accounts.length > 0 && (calendar || yearly) ? (
          <>
            <ScenarioSelector
              selected={scenario}
              rates={tab === 'daily' ? calendarRates : yearlyRates}
              disabled={tab === 'daily' && monthKind === 'past'}
              onSelect={setScenario}
            />

            {tab === 'daily' && calendar ? (
              <>
                <CalendarSummary calendar={calendar} scenario={scenario} />
                <ProfitFundingCard
                  calendar={calendar}
                  additional={additionalInvestment}
                  onAdditionalChange={setAdditionalInvestment}
                />
                <DailyCalendar calendar={calendar} scenario={scenario} onShift={shiftMonth} />
              </>
            ) : null}

            {tab === 'yearly' && yearly ? <YearlyOutlook yearly={yearly} scenario={scenario} /> : null}

            <View style={[styles.disclaimer, { backgroundColor: palette.panelStrong, borderColor: palette.line }]}>
              <Ionicons name="information-circle-outline" size={18} color={palette.textSoft} />
              <Text style={[styles.disclaimerText, { color: palette.textSoft }]}>
                Illustrative only. Rates come from this month’s realized trading days and are compounded as constant; markets and risk controls will change actual results.
              </Text>
            </View>
          </>
        ) : null}

        {!loading && accounts.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: palette.panel, borderColor: palette.line }]}>
            <View style={[styles.emptyIcon, { backgroundColor: palette.amberSoft }]}>
              <Ionicons name="link-outline" size={24} color={palette.amber} />
            </View>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>No trading account</Text>
            <Text style={[styles.emptyCopy, { color: palette.textSoft }]}>Connect an account before projections can appear.</Text>
          </View>
        ) : null}
      </ScrollView>

      {error ? <NoticeOverlay tone="error" title="Projections unavailable" message={error} icon="cloud-offline-outline" actionLabel="Retry projections" actionIcon="refresh" onAction={() => void load(selectedId, viewed.year, viewed.month)} onDismiss={() => setError(null)} /> : null}

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
  horizonBadge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  horizonBadgeText: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 1 },
  tabs: { minHeight: 52, borderWidth: 1, borderRadius: radius.control, padding: 4, flexDirection: 'row', gap: 4 },
  tab: { flex: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabText: { fontFamily: fonts.monoBold, fontSize: 9.5, letterSpacing: 0.4 },
  accountSelector: { minHeight: 62, borderWidth: 1, borderRadius: radius.control, paddingHorizontal: spacing(1.5), flexDirection: 'row', alignItems: 'center', gap: spacing(1.25) },
  accountSignal: { width: 8, height: 34, borderRadius: radius.pill },
  selectorCopy: { flex: 1, gap: 3 },
  selectorLabel: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 1.2 },
  selectorValue: { fontFamily: fonts.medium, fontSize: 15 },
  loading: { minHeight: 310, alignItems: 'center', justifyContent: 'center', gap: spacing(1.25) },
  loadingText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },
  scenarioBlock: { gap: spacing(0.75) },
  scenarioHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  controlLabel: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 1.15 },
  scenarioRate: { fontFamily: fonts.monoBold, fontSize: 10 },
  scenarios: { height: 44, borderWidth: 1, borderRadius: 14, padding: 3, flexDirection: 'row', gap: 3 },
  scenario: { flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scenarioText: { fontFamily: fonts.monoBold, fontSize: 8.7, letterSpacing: 0.15 },
  disabled: { opacity: 0.62 },
  pressed: { opacity: 0.78 },
  monthSummary: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  monthSummaryTop: { minHeight: 108, padding: spacing(2), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthSummaryValue: { maxWidth: 250, fontFamily: fonts.monoBold, fontSize: 30, letterSpacing: -1.2, marginTop: 7 },
  monthSummaryCaption: { fontFamily: fonts.regular, fontSize: 11.5, marginTop: 3 },
  kindBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 7 },
  kindBadgeText: { fontFamily: fonts.monoBold, fontSize: 8.5, letterSpacing: 0.9 },
  summaryRule: { height: StyleSheet.hairlineWidth },
  summaryMetrics: { minHeight: 75, flexDirection: 'row', paddingHorizontal: 4, paddingVertical: spacing(1.25) },
  summaryMetric: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 5 },
  summaryMetricLabel: { fontFamily: fonts.monoBold, fontSize: 7.1, letterSpacing: 0.5 },
  summaryMetricValue: { width: '100%', textAlign: 'center', fontFamily: fonts.monoBold, fontSize: 11.5 },
  calendarCard: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  calendarHeader: { minHeight: 70, paddingHorizontal: spacing(1.25), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthArrow: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  calendarTitleBlock: { alignItems: 'center', gap: 3 },
  calendarTitle: { fontFamily: fonts.display, fontSize: 18, letterSpacing: -0.35 },
  calendarSubtitle: { fontFamily: fonts.monoBold, fontSize: 7.3, letterSpacing: 0.75 },
  calendarRule: { height: StyleSheet.hairlineWidth },
  weekRow: { height: 34, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7 },
  weekday: { width: '14.2857%', textAlign: 'center', fontFamily: fonts.monoBold, fontSize: 8.5 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 7, paddingBottom: 7 },
  dayCell: { width: '14.2857%', height: 58 },
  dayCellFilled: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 9, paddingHorizontal: 4, paddingVertical: 5, justifyContent: 'space-between' },
  dayNumberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayNumber: { fontFamily: fonts.monoBold, fontSize: 8.5 },
  projectedDot: { width: 3.5, height: 3.5, borderRadius: 2 },
  dayAmount: { width: '100%', fontFamily: fonts.monoBold, fontSize: 8.2, letterSpacing: -0.35 },
  calendarLegend: { minHeight: 46, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing(1.5), flexDirection: 'row', alignItems: 'center', gap: spacing(1.25) },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontFamily: fonts.mono, fontSize: 8.5 },
  legendNote: { flex: 1, textAlign: 'right', fontFamily: fonts.mono, fontSize: 8 },
  fundingCard: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  fundingHeader: { minHeight: 76, paddingHorizontal: spacing(1.5), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing(1) },
  fundingTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  fundingIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  fundingTitle: { fontFamily: fonts.medium, fontSize: 14 },
  fundingCopy: { fontFamily: fonts.regular, fontSize: 10.5, marginTop: 2 },
  autoBadge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 5 },
  autoBadgeText: { fontFamily: fonts.monoBold, fontSize: 7.5, letterSpacing: 0.8 },
  fundingRule: { height: StyleSheet.hairlineWidth },
  fundingGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  fundingMetric: { width: '50%', minHeight: 102, paddingHorizontal: spacing(1.5), paddingVertical: spacing(1.25), justifyContent: 'center', gap: 5 },
  fundingMetricLabel: { fontFamily: fonts.monoBold, fontSize: 7.2, letterSpacing: 0.55 },
  fundingMetricValue: { fontFamily: fonts.monoBold, fontSize: 18, letterSpacing: -0.5 },
  fundingMetricCopy: { fontFamily: fonts.mono, fontSize: 7.5 },
  investmentInput: { height: 36, borderWidth: 1, borderRadius: 11, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  inputCurrency: { fontFamily: fonts.monoBold, fontSize: 12 },
  input: { flex: 1, height: 34, padding: 0, fontFamily: fonts.monoBold, fontSize: 13 },
  fundingPaths: { paddingHorizontal: spacing(1.5), paddingVertical: spacing(0.5) },
  fundingPath: { minHeight: 80, paddingVertical: spacing(1.1), justifyContent: 'center' },
  fundingPathTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fundingPathName: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fundingPathLabel: { fontFamily: fonts.monoBold, fontSize: 8.2, letterSpacing: 0.65 },
  fundingPathRate: { fontFamily: fonts.mono, fontSize: 8 },
  fundingPathDate: { fontFamily: fonts.monoBold, fontSize: 16, letterSpacing: -0.25, marginTop: 6 },
  fundingPathDetail: { fontFamily: fonts.mono, fontSize: 8.2, marginTop: 2 },
  fundingFooter: { minHeight: 64, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing(1.5), flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  fundingFooterText: { flex: 1, fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 15 },
  partialWarning: { minHeight: 54, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing(1.5), flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  partialWarningText: { flex: 1, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14 },
  fundingUnavailable: { minHeight: 68, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing(1.5), flexDirection: 'row', alignItems: 'center', gap: spacing(1) },
  fundingUnavailableText: { flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16 },
  portfolioCard: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  portfolioHero: { minHeight: 118, padding: spacing(2), justifyContent: 'center' },
  portfolioValue: { maxWidth: '100%', fontFamily: fonts.monoBold, fontSize: 32, letterSpacing: -1.2, marginTop: 8 },
  portfolioCopy: { fontFamily: fonts.regular, fontSize: 11.5, marginTop: 4 },
  portfolioRule: { height: StyleSheet.hairlineWidth },
  portfolioMetrics: { minHeight: 76, flexDirection: 'row', paddingVertical: spacing(1) },
  portfolioMetric: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  portfolioMetricValue: { fontFamily: fonts.monoBold, fontSize: 18 },
  portfolioMetricLabel: { fontFamily: fonts.monoBold, fontSize: 7.5, letterSpacing: 0.7 },
  milestones: { gap: spacing(1) },
  sectionHeading: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.display, fontSize: 23, letterSpacing: -0.7 },
  sectionCopy: { fontFamily: fonts.regular, fontSize: 12, marginTop: 3 },
  pathBadge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  pathDot: { width: 5, height: 5, borderRadius: 3 },
  pathText: { fontFamily: fonts.monoBold, fontSize: 7.5, letterSpacing: 0.6 },
  milestone: { minHeight: 116, borderWidth: 1, borderRadius: radius.control, padding: spacing(1.25), flexDirection: 'row', gap: spacing(1.25) },
  yearStamp: { width: 72, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 5 },
  yearStampValue: { fontFamily: fonts.monoBold, fontSize: 17 },
  yearStampDays: { fontFamily: fonts.monoBold, fontSize: 6.8, letterSpacing: 0.45 },
  milestoneBody: { flex: 1, minWidth: 0, justifyContent: 'center' },
  milestoneLabel: { fontFamily: fonts.monoBold, fontSize: 7.8, letterSpacing: 0.75 },
  milestoneWallet: { maxWidth: '100%', fontFamily: fonts.monoBold, fontSize: 22, letterSpacing: -0.8, marginTop: 6 },
  milestoneStats: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 8 },
  milestoneProfit: { fontFamily: fonts.monoBold, fontSize: 9.5 },
  milestoneStat: { fontFamily: fonts.monoBold, fontSize: 8.5 },
  disclaimer: { borderWidth: 1, borderRadius: radius.control, padding: spacing(1.5), flexDirection: 'row', alignItems: 'flex-start', gap: spacing(1) },
  disclaimerText: { flex: 1, fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16 },
  empty: { borderWidth: 1, borderRadius: radius.card, padding: spacing(3), alignItems: 'center' },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fonts.display, fontSize: 19, marginTop: spacing(1.5) },
  emptyCopy: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 4 },
});

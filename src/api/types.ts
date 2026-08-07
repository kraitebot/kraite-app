export type Trader = {
  id: number;
  name: string;
  email: string;
};

export type AppNotificationSeverity = 'critical' | 'high' | 'medium' | 'info';

export type AppNotification = {
  id: string;
  canonical: string;
  title: string;
  body: string;
  severity: AppNotificationSeverity;
  status: string;
  is_read?: boolean;
  sent_at: string;
};

export type NotificationsResponse = {
  data: {
    notifications: AppNotification[];
    unread_count?: number;
    pending_notification?: AppNotification | null;
    next_cursor: string | null;
  };
};

export type MarkNotificationsReadResponse = {
  data: {
    unread_count: number;
  };
};

export type Account = {
  id: number;
  name: string;
  exchange: string;
  is_trading: boolean;
};

export type AccountConnectivityHealth = {
  kind: 'healthy' | 'degraded' | 'critical' | 'unconfigured';
  label: string;
  blocked_servers: number;
  total_servers: number;
};

export type ManagedAccount = Account & {
  exchange_canonical: string | null;
  is_active: boolean;
  disabled_reason: string | null;
  disabled_at: string | null;
  has_credentials: boolean;
  requires_passphrase: boolean;
  connectivity_health: AccountConnectivityHealth;
  subscription_active: boolean;
  open_positions_count: number;
  portfolio_quote: string;
  trading_quote: string;
  can_trade: boolean;
  profit_percentage: string;
  stop_market_initial_percentage: string;
  total_positions_long: number;
  total_positions_short: number;
  position_leverage_long: number;
  position_leverage_short: number;
  margin_percentage_long: string;
  margin_percentage_short: string;
  configuration_locked: boolean;
  quotes_locked: boolean;
  can_enable_trading: boolean;
};

export type AccountConfigurationOptions = {
  profit_percentage: string[];
  stop_market_initial_percentage: string[];
  total_positions: number[];
  position_leverage: number[];
  margin_percentage: string[];
};

export type AccountsResponse = {
  data: {
    accounts: ManagedAccount[];
    options: AccountConfigurationOptions;
  };
};

export type AccountQuotesResponse = {
  account_id: number;
  assets: string[];
};

export type AccountConfigurationPayload = {
  account_id: number;
  name: string;
  portfolio_quote: string;
  trading_quote: string;
  can_trade: boolean;
  profit_percentage: string;
  stop_market_initial_percentage: string;
  total_positions_long: number;
  total_positions_short: number;
  position_leverage_long: number;
  position_leverage_short: number;
  margin_percentage_long: string;
  margin_percentage_short: string;
};

export type DashboardKpis = {
  balance: string | null;
  balance_delta_24h_pct: number | null;
  balance_spark: number[];
  pnl_today: string | null;
  pnl_today_pct: number | null;
  pnl_30d: string | null;
  pnl_30d_pct: number | null;
  pnl_30d_spark: number[];
  open_count: number;
  long_count: number;
  short_count: number;
};

/**
 * One of the five warning signals behind the score. `value` sits on the
 * signal's own scale (ratios, a correlation, a signed percentage), so the
 * tile shows the raw figure and the fired state rather than normalising
 * them into one bar. Null value means the signal had no reading.
 */
export type BscsComponent = {
  key: string;
  label: string;
  value: number | null;
  fired: boolean;
};

export type BscsSummary = {
  score: number | null;
  band: 'calm' | 'elevated' | 'fragile' | 'critical' | null;
  blocked: boolean;
  /**
   * Pause surface across all three sources: 'shock' (fast 1-minute
   * breaker), 'regime' (slow score gate), 'monitor' (error-storm latch —
   * holds until an operator clears it, so it carries no until-time).
   * Optional: an older server omits them; fall back to `blocked`.
   */
  paused?: boolean;
  pause_reason?: 'shock' | 'regime' | 'monitor' | null;
  cooldown_remaining?: string | null;
  cooldown_until?: string | null;
  status: string;
  is_stale: boolean;
  block_threshold: number;
  computed_ago: string | null;
  /**
   * Countdown to the next hourly score recompute ("in 37m" / "about now").
   * Optional: an older server omits it and the tile drops the promise.
   */
  next_compute_in?: string | null;
  position_cap?: {
    long: { effective: number; maximum: number };
    short: { effective: number; maximum: number };
    ratio_percent: number;
  };
  /** Empty before the first compute; absent on an older server. */
  components?: BscsComponent[];
};

export type TimeframeDot = {
  timeframe: string;
  direction: 'up' | 'down' | 'flat' | 'none';
};

export type BtcSummary = {
  token: 'BTC';
  name: string;
  image: string | null;
  mark: string | null;
  day_change_pct: string | null;
  spark_4h: number[];
  dots: TimeframeDot[];
};

export type PositionTrack = {
  tp_pct: number;
  px_pct: number;
  sl_pct: number;
  gain_left: number;
  gain_width: number;
  rungs: { index: number; pct: number }[];
};

export type Position = {
  id: number;
  status: string;
  symbol: string;
  token: string | null;
  token_name: string | null;
  token_image: string | null;
  direction: 'LONG' | 'SHORT';
  leverage: number;
  opened_at: string | null;
  age_human: string | null;
  current_price: string | null;
  entry_label: string;
  entry_price: string | null;
  profit_price: string | null;
  take_profit_distance_pct?: string | null;
  next_limit_price: string | null;
  next_limit_distance_pct?: string | null;
  stop_loss_price: string | null;
  alpha_path_pct: string;
  alpha_limit_pct: string;
  size: string | null;
  pnl: string | number | null;
  max_pain: string | null;
  max_pain_formatted?: string | null;
  filled_count: number;
  total_limits: number;
  track: PositionTrack | null;
  timeframe_dots: TimeframeDot[];
};

/**
 * A one-time offer to move the trading day basis after the trader turns up in
 * a different country. Offered, never applied on our side: the basis is set to
 * match the trader's exchange, and that setting does not travel with them.
 */
export type DayBasisHint = {
  country_code: string;
  country_name: string;
  suggested_offset_minutes: number;
  suggested_label: string;
  current_label: string;
};

export type Dashboard = {
  account: Pick<Account, 'id' | 'name' | 'exchange'>;
  kpis: DashboardKpis;
  day_basis_hint?: DayBasisHint | null;
  btc?: BtcSummary | null;
  bscs?: BscsSummary;
  last_position_closed_at?: string | null;
  positions: Position[];
  generated_at: string;
};

export type DashboardResponse = {
  data: {
    accounts: Account[];
    selected_account_id: number | null;
    dashboard: Dashboard | null;
  };
};

export type PositionHistorySummary = {
  count: number;
  long: number;
  short: number;
  wins: number;
  losses: number;
  realized_pnl: string | null;
};

export type PositionHistory = {
  id: number;
  symbol: string;
  token: string | null;
  token_name: string | null;
  token_image: string | null;
  direction: 'LONG' | 'SHORT';
  leverage: number;
  opened_at: string | null;
  closed_at: string | null;
  duration_seconds: number | null;
  entry_price: string | null;
  exit_price: string | null;
  quantity: string | null;
  margin: string | null;
  pnl: string | null;
  return_pct: number | null;
  was_waped: boolean;
  was_fast_traded: boolean;
};

export type PositionHistoryPage = {
  summary: PositionHistorySummary;
  positions: PositionHistory[];
  next_cursor: string | null;
  generated_at: string;
};

export type PositionsResponse = {
  data: {
    accounts: Account[];
    selected_account_id: number | null;
    history: PositionHistoryPage | null;
  };
};

export type ProjectionScenario = 'pessimistic' | 'neutral' | 'optimistic';

export type ProjectionScenarioRates = {
  pessimistic_pct: string | null;
  neutral_pct: string | null;
  optimistic_pct: string | null;
  days_observed: number;
  days_with_revenue: number;
};

export type ProjectionInvestmentBasis = {
  amount: string | null;
  known_realized_pnl: string | null;
  tracking_started_at: string | null;
  tracking_ended_at: string | null;
  closed_positions: number;
  missing_pnl_positions: number;
  is_complete: boolean;
};

export type ProjectionCalendar = {
  account_id: number;
  year: number;
  month: number;
  actuals: Record<string, string>;
  current_wallet: string | null;
  month_start_wallet: string | null;
  scenarios: ProjectionScenarioRates;
  investment_basis: ProjectionInvestmentBasis;
  /** The trader's current date on their own day basis, not the device's. */
  today: string;
  /** Minutes from UTC at which their trading day rolls over. */
  utc_offset_minutes?: number;
  /** That basis in the wording exchanges use, e.g. `UTC+02:00`. */
  day_basis_label?: string;
};

export type ProjectionMilestone = {
  year: number;
  label: string;
  end_date: string;
  days: number;
  end_wallet: string | null;
  projected_profit: string | null;
  growth_pct: string | null;
  multiple: string | null;
};

export type ProjectionYearlyScenario = {
  daily_pct: string | null;
  available: boolean;
  reason: 'no_wallet' | 'no_observations' | 'invalid_rate' | null;
  milestones: ProjectionMilestone[];
};

export type ProjectionYearly = {
  account_count: number;
  current_wallet: string | null;
  days_observed: number;
  today: string;
  outlook: {
    years: number;
    scenarios: Record<ProjectionScenario, ProjectionYearlyScenario>;
  };
};

export type ProjectionsResponse = {
  data: {
    accounts: Account[];
    selected_account_id: number | null;
    calendar: ProjectionCalendar | null;
    yearly: ProjectionYearly;
  };
};

export type LoginResponse = {
  token: string;
  token_type: 'Bearer';
  expires_at: string;
  passkeys_enabled: boolean;
  user: Trader;
};

export type PasskeySummary = {
  id: number;
  name: string;
  authenticator: string | null;
  last_used_at: string | null;
  created_at: string | null;
};

export type PasskeyListResponse = {
  data: PasskeySummary[];
};

export type PasskeyOptionsResponse<T> = {
  challenge_id: string;
  options: T;
};

export type PasskeyCreateResponse = {
  data: PasskeySummary;
};

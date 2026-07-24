export type Trader = {
  id: number;
  name: string;
  email: string;
};

export type Account = {
  id: number;
  name: string;
  exchange: string;
  is_trading: boolean;
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

export type BscsSummary = {
  score: number | null;
  band: 'calm' | 'elevated' | 'fragile' | 'critical' | null;
  blocked: boolean;
  status: string;
  is_stale: boolean;
  block_threshold: number;
  computed_ago: string | null;
  position_cap?: {
    long: { effective: number; maximum: number };
    short: { effective: number; maximum: number };
    ratio_percent: number;
  };
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
  next_limit_price: string | null;
  stop_loss_price: string | null;
  alpha_path_pct: string;
  alpha_limit_pct: string;
  size: string | null;
  pnl: string | number | null;
  filled_count: number;
  total_limits: number;
  track: PositionTrack | null;
  timeframe_dots: { timeframe: string; direction: 'up' | 'down' | 'flat' | 'none' }[];
};

export type Dashboard = {
  account: Pick<Account, 'id' | 'name' | 'exchange'>;
  kpis: DashboardKpis;
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
  today: string;
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

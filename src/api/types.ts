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

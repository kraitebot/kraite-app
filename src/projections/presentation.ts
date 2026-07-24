import type {
  ProjectionCalendar,
  ProjectionScenario,
  ProjectionScenarioRates,
} from '../api/types';

export type ProjectionMonthKind = 'past' | 'current' | 'future';
export type ProjectionDayKind = 'empty' | 'realized' | 'today' | 'projected';

export type ProjectionDay = {
  day: number;
  kind: ProjectionDayKind;
  amount: number | null;
  hasActual: boolean;
};

export type ProjectionMonth = {
  kind: ProjectionMonthKind;
  days: ProjectionDay[];
  firstWeekday: number;
  openingWallet: number | null;
  realized: number | null;
  projected: number | null;
  endingWallet: number | null;
  monthlyReturnPct: number | null;
  rate: number | null;
};

export type ProjectionInvestment = {
  available: boolean;
  autoBasis: number | null;
  additional: number;
  basis: number | null;
  wallet: number | null;
  target: number | null;
  needed: number | null;
  isComplete: boolean;
  missingPnl: number;
};

export type ProjectionCapitalMilestone = {
  scenario: ProjectionScenario;
  rate: number | null;
  state: 'unavailable' | 'reached' | 'unreachable' | 'projected';
  date: string;
  detail: string;
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const PROJECTION_SCENARIOS: ProjectionScenario[] = [
  'pessimistic',
  'neutral',
  'optimistic',
];

export function projectionScenarioLabel(scenario: ProjectionScenario): string {
  return scenario[0]!.toUpperCase() + scenario.slice(1);
}

export function projectionScenarioRate(
  rates: ProjectionScenarioRates,
  scenario: ProjectionScenario,
): number | null {
  const raw = rates[`${scenario}_pct`];
  if (raw === null) return null;

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function projectionMonthLabel(year: number, month: number): string {
  return `${MONTHS[month - 1] ?? 'Unknown'} ${year}`;
}

export function shiftProjectionMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const absolute = year * 12 + month - 1 + delta;
  return {
    year: Math.floor(absolute / 12),
    month: ((absolute % 12) + 12) % 12 + 1,
  };
}

export function buildProjectionMonth(
  calendar: ProjectionCalendar,
  scenario: ProjectionScenario,
): ProjectionMonth {
  const { year, month } = calendar;
  const [todayYear, todayMonth, todayDay] = calendar.today.split('-').map(Number);
  const viewedAbsolute = year * 12 + month - 1;
  const todayAbsolute = todayYear! * 12 + todayMonth! - 1;
  const kind: ProjectionMonthKind = viewedAbsolute < todayAbsolute
    ? 'past'
    : viewedAbsolute > todayAbsolute ? 'future' : 'current';
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const rate = projectionScenarioRate(calendar.scenarios, scenario);
  const compoundRate = rate ?? 0;
  const currentWallet = finiteNumber(calendar.current_wallet);
  const monthStartWallet = finiteNumber(calendar.month_start_wallet);
  const key = (day: number) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const actual = (day: number) => finiteNumber(calendar.actuals[key(day)]);
  const hasActual = (day: number) => Object.prototype.hasOwnProperty.call(calendar.actuals, key(day));
  const realized = Object.values(calendar.actuals).reduce((sum, value) => sum + (finiteNumber(value) ?? 0), 0);
  const days: ProjectionDay[] = [];
  let openingWallet: number | null = null;
  let projected: number | null = null;
  let endingWallet: number | null = null;

  if (kind === 'past') {
    for (let day = 1; day <= dayCount; day += 1) {
      days.push({
        day,
        kind: hasActual(day) ? 'realized' : 'empty',
        amount: actual(day),
        hasActual: hasActual(day),
      });
    }
    openingWallet = monthStartWallet;
    endingWallet = monthStartWallet === null ? null : monthStartWallet + realized;
  } else if (kind === 'current') {
    for (let day = 1; day <= dayCount; day += 1) {
      if (day < todayDay!) {
        days.push({
          day,
          kind: hasActual(day) ? 'realized' : 'empty',
          amount: actual(day),
          hasActual: hasActual(day),
        });
      } else if (day === todayDay) {
        days.push({
          day,
          kind: 'today',
          amount: actual(day) ?? 0,
          hasActual: hasActual(day),
        });
      } else {
        const elapsed = day - todayDay!;
        days.push({
          day,
          kind: 'projected',
          amount: currentWallet === null
            ? null
            : currentWallet * Math.pow(1 + compoundRate, elapsed)
              - currentWallet * Math.pow(1 + compoundRate, elapsed - 1),
          hasActual: false,
        });
      }
    }
    openingWallet = monthStartWallet;
    endingWallet = currentWallet === null
      ? null
      : currentWallet * Math.pow(1 + compoundRate, dayCount - todayDay!);
    projected = endingWallet === null ? null : endingWallet - currentWallet!;
  } else {
    for (let day = 1; day <= dayCount; day += 1) {
      const elapsed = utcDayDifference(calendar.today, key(day));
      days.push({
        day,
        kind: 'projected',
        amount: currentWallet === null
          ? null
          : currentWallet * Math.pow(1 + compoundRate, elapsed)
            - currentWallet * Math.pow(1 + compoundRate, elapsed - 1),
        hasActual: false,
      });
    }
    const firstElapsed = utcDayDifference(calendar.today, key(1));
    const lastElapsed = utcDayDifference(calendar.today, key(dayCount));
    openingWallet = currentWallet === null
      ? null
      : currentWallet * Math.pow(1 + compoundRate, firstElapsed - 1);
    endingWallet = currentWallet === null
      ? null
      : currentWallet * Math.pow(1 + compoundRate, lastElapsed);
    projected = openingWallet === null || endingWallet === null
      ? null
      : endingWallet - openingWallet;
  }

  return {
    kind,
    days,
    firstWeekday: (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7,
    openingWallet,
    realized: kind === 'future' ? null : realized,
    projected: kind === 'past' ? null : projected,
    endingWallet,
    monthlyReturnPct: openingWallet && endingWallet !== null
      ? (endingWallet / openingWallet - 1) * 100
      : null,
    rate,
  };
}

export function projectionDailyRate(rate: string | null): string {
  if (rate === null || !Number.isFinite(Number(rate))) return '—';
  const percentage = Number(rate) * 100;
  return `${percentage > 0 ? '+' : percentage < 0 ? '−' : ''}${Math.abs(percentage).toFixed(2)}% / day`;
}

export function projectionInvestment(
  calendar: ProjectionCalendar,
  additionalValue: string,
): ProjectionInvestment {
  const autoBasis = finiteNumber(calendar.investment_basis.amount);
  const currentWallet = finiteNumber(calendar.current_wallet);
  const parsedAdditional = Number(additionalValue);
  const additional = Number.isFinite(parsedAdditional) && parsedAdditional > 0 ? parsedAdditional : 0;

  if (autoBasis === null || currentWallet === null) {
    return {
      available: false,
      autoBasis: null,
      additional: 0,
      basis: null,
      wallet: null,
      target: null,
      needed: null,
      isComplete: false,
      missingPnl: 0,
    };
  }

  const basis = Math.max(0, autoBasis) + additional;
  const wallet = currentWallet + additional;
  const target = basis * 2;

  return {
    available: true,
    autoBasis,
    additional,
    basis,
    wallet,
    target,
    needed: Math.max(0, target - wallet),
    isComplete: calendar.investment_basis.is_complete,
    missingPnl: calendar.investment_basis.missing_pnl_positions,
  };
}

export function projectionCapitalMilestones(
  calendar: ProjectionCalendar,
  additionalValue: string,
): ProjectionCapitalMilestone[] {
  const investment = projectionInvestment(calendar, additionalValue);

  return PROJECTION_SCENARIOS.map((scenario) => {
    const rate = projectionScenarioRate(calendar.scenarios, scenario);
    const row: ProjectionCapitalMilestone = {
      scenario,
      rate,
      state: 'unavailable',
      date: '—',
      detail: '',
    };

    if (!investment.available) {
      row.detail = 'No wallet history';
      return row;
    }

    if (investment.basis! <= 0 || investment.wallet! >= investment.target!) {
      row.state = 'reached';
      row.date = 'Milestone reached';
      row.detail = 'Personal capital is already covered';
      return row;
    }

    if (calendar.scenarios.days_observed < 1 || rate === null) {
      row.date = 'Not enough data';
      row.detail = 'No observed trading days this month';
      return row;
    }

    if (rate <= 0 || investment.wallet! <= 0) {
      row.state = 'unreachable';
      row.date = 'Not reachable';
      row.detail = 'At the current daily rate';
      return row;
    }

    const days = Math.max(0, Math.ceil(
      Math.log(investment.target! / investment.wallet!) / Math.log1p(rate),
    ));
    if (!Number.isFinite(days)) {
      row.state = 'unreachable';
      row.date = 'Not reachable';
      row.detail = 'At the current daily rate';
      return row;
    }

    const [year, month, day] = calendar.today.split('-').map(Number);
    const projectedDate = new Date(Date.UTC(year!, month! - 1, day!));
    projectedDate.setUTCDate(projectedDate.getUTCDate() + days);
    row.state = 'projected';
    row.date = projectedDate.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
    row.detail = projectionDuration(days);

    return row;
  });
}

export function projectionMoney(value: string | number | null, signed = false): string {
  const decimal = projectionDecimal(value);
  if (!decimal) return '—';

  const sign = decimal.negative ? '−' : signed && !decimal.isZero ? '+' : '';
  return `${sign}$${decimal.formatted}`;
}

export function projectionCompactMoney(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const absolute = Math.abs(value);

  if (absolute < 1000) return `${sign}$${absolute.toFixed(2)}`;

  for (const [suffix, threshold] of [
    ['T', 1e12],
    ['B', 1e9],
    ['M', 1e6],
    ['K', 1e3],
  ] as const) {
    if (absolute >= threshold) return `${sign}$${(absolute / threshold).toFixed(1)}${suffix}`;
  }

  return `${sign}$${absolute.toFixed(0)}`;
}

export function projectionPercent(value: string | number | null): string {
  const decimal = projectionDecimal(value);
  if (!decimal) return '—';

  return `${decimal.negative ? '−' : decimal.isZero ? '' : '+'}${decimal.formatted}%`;
}

export function projectionMultiple(value: string | null): string {
  const decimal = projectionDecimal(value);
  if (!decimal) return '—';

  return `${decimal.negative ? '−' : ''}${decimal.formatted}×`;
}

function finiteNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function utcDayDifference(from: string, until: string): number {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [untilYear, untilMonth, untilDay] = until.split('-').map(Number);

  return Math.round((
    Date.UTC(untilYear!, untilMonth! - 1, untilDay!)
    - Date.UTC(fromYear!, fromMonth! - 1, fromDay!)
  ) / 86_400_000);
}

function projectionDecimal(value: string | number | null): {
  negative: boolean;
  isZero: boolean;
  formatted: string;
} | null {
  if (value === null || value === '') return null;
  const raw = String(value);
  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [wholeRaw, fraction = ''] = unsigned.split('.');
  const whole = (wholeRaw ?? '0').replace(/^0+(?=\d)/, '') || '0';
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) return null;

  const isZero = /^0*$/.test(whole) && /^0*$/.test(fraction);
  if (whole.length > 15) {
    return {
      negative,
      isZero,
      formatted: `${whole[0]}.${whole.slice(1, 3).padEnd(2, '0')}e+${whole.length - 1}`,
    };
  }

  const numeric = Number(`${negative ? '-' : ''}${whole}.${fraction}`);
  if (!Number.isFinite(numeric)) return null;

  return {
    negative,
    isZero,
    formatted: Math.abs(numeric).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  };
}

function projectionDuration(days: number): string {
  if (days === 0) return 'Milestone reached';

  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const remainingDays = days - years * 365 - months * 30;
  const parts: string[] = [];

  if (years) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (months && parts.length < 2) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (!parts.length || (remainingDays && parts.length < 2)) {
    parts.push(`${remainingDays} ${remainingDays === 1 ? 'day' : 'days'}`);
  }

  return `in ${parts.join(' and ')}`;
}

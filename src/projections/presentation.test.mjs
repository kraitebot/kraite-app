import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProjectionMonth,
  projectionCapitalMilestones,
  projectionCompactMoney,
  projectionDailyRate,
  projectionInvestment,
  projectionMoney,
  projectionMonthLabel,
  projectionMultiple,
  projectionPercent,
  projectionScenarioRate,
  shiftProjectionMonth,
} from './presentation.ts';

const calendar = {
  account_id: 1,
  year: 2026,
  month: 7,
  actuals: {
    '2026-07-23': '4.0000',
    '2026-07-24': '6.0000',
  },
  current_wallet: '1010',
  month_start_wallet: '1000',
  scenarios: {
    pessimistic_pct: '-0.005000',
    neutral_pct: '0.010000',
    optimistic_pct: '0.020000',
    days_observed: 2,
    days_with_revenue: 2,
  },
  investment_basis: {
    amount: '1000',
    known_realized_pnl: '10',
    tracking_started_at: '2026-07-01T00:00:00Z',
    tracking_ended_at: '2026-07-24T12:00:00Z',
    closed_positions: 2,
    missing_pnl_positions: 0,
    is_complete: true,
  },
  today: '2026-07-24',
};

test('builds the hybrid daily calendar with realized and compounded future profit', () => {
  const month = buildProjectionMonth(calendar, 'neutral');

  assert.equal(month.kind, 'current');
  assert.equal(month.firstWeekday, 2);
  assert.equal(month.realized, 10);
  assert.equal(month.openingWallet, 1000);
  assert.equal(month.days[22].kind, 'realized');
  assert.equal(month.days[22].amount, 4);
  assert.equal(month.days[23].kind, 'today');
  assert.equal(month.days[23].amount, 6);
  assert.equal(month.days[24].kind, 'projected');
  assert.ok(Math.abs(month.days[24].amount - 10.1) < 0.000001);
  assert.ok(Math.abs(month.endingWallet - 1010 * Math.pow(1.01, 7)) < 0.000001);
});

test('keeps scenario, month navigation, and labels aligned with admin semantics', () => {
  assert.equal(projectionScenarioRate(calendar.scenarios, 'pessimistic'), -0.005);
  assert.equal(projectionScenarioRate(calendar.scenarios, 'neutral'), 0.01);
  assert.deepEqual(shiftProjectionMonth(2026, 1, -1), { year: 2025, month: 12 });
  assert.deepEqual(shiftProjectionMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.equal(projectionMonthLabel(2026, 7), 'July 2026');
  assert.equal(projectionDailyRate('0.010000'), '+1.00% / day');
  assert.equal(projectionCompactMoney(10.1), '+$10.10');
  assert.equal(projectionCompactMoney(-1532), '−$1.5K');
});

test('formats exact yearly values without converting enormous wallets to infinity', () => {
  assert.equal(projectionMoney('3030.00000000'), '$3,030.00');
  assert.equal(projectionMoney('-19.90000000', true), '−$19.90');
  assert.equal(projectionMoney('201234567890123456789.00000000'), '$2.01e+20');
  assert.equal(projectionPercent('201234567890123456789.00000000'), '+2.01e+20%');
  assert.equal(projectionMultiple('201234567890123456789.00000000'), '2.01e+20×');
});

test('replicates the profit-funded target and scenario milestone logic', () => {
  const investment = projectionInvestment(calendar, '100');
  const milestones = projectionCapitalMilestones(calendar, '100');

  assert.deepEqual(investment, {
    available: true,
    autoBasis: 1000,
    additional: 100,
    basis: 1100,
    wallet: 1110,
    target: 2200,
    needed: 1090,
    isComplete: true,
    missingPnl: 0,
  });
  assert.equal(milestones[0].state, 'unreachable');
  assert.equal(milestones[0].date, 'Not reachable');
  assert.equal(milestones[1].state, 'projected');
  assert.equal(milestones[2].state, 'projected');
});

test('marks profit funding reached and keeps missing wallet history unavailable', () => {
  const reached = {
    ...calendar,
    current_wallet: '2500',
  };
  const missing = {
    ...calendar,
    current_wallet: null,
    investment_basis: { ...calendar.investment_basis, amount: null },
  };

  assert.equal(projectionCapitalMilestones(reached, '')[1].state, 'reached');
  assert.equal(projectionInvestment(missing, '500').available, false);
  assert.equal(projectionCapitalMilestones(missing, '500')[1].detail, 'No wallet history');
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  accountDraft,
  accountErrorMessage,
  accountHasChanges,
  accountPayload,
} from './presentation.ts';

const account = {
  id: 7,
  name: 'Main',
  exchange: 'Binance',
  is_trading: false,
  exchange_canonical: 'binance',
  is_active: true,
  disabled_reason: null,
  disabled_at: null,
  has_credentials: true,
  requires_passphrase: false,
  connectivity_health: {
    kind: 'healthy',
    label: 'No active server blocks',
    blocked_servers: 0,
    total_servers: 3,
  },
  subscription_active: true,
  open_positions_count: 0,
  portfolio_quote: 'USDT',
  trading_quote: 'USDT',
  can_trade: false,
  profit_percentage: '0.380',
  stop_market_initial_percentage: '5.00',
  total_positions_long: 5,
  total_positions_short: 4,
  position_leverage_long: 15,
  position_leverage_short: 10,
  margin_percentage_long: '5.00',
  margin_percentage_short: '4.00',
  configuration_locked: false,
  quotes_locked: false,
  can_enable_trading: true,
};

test('builds an exact account configuration payload', () => {
  const draft = accountDraft(account);

  assert.deepEqual(accountPayload(account.id, { ...draft, name: ' Main renamed ' }), {
    account_id: 7,
    ...draft,
    name: 'Main renamed',
  });
});

test('detects only persisted account configuration changes', () => {
  const draft = accountDraft(account);

  assert.equal(accountHasChanges(account, draft), false);
  assert.equal(accountHasChanges(account, { ...draft, name: ' Main ' }), false);
  assert.equal(accountHasChanges(account, { ...draft, position_leverage_short: 15 }), true);
});

test('surfaces the first server validation error', () => {
  assert.equal(
    accountErrorMessage({ can_trade: ['Trading cannot be enabled.'] }, 'Save failed.'),
    'Trading cannot be enabled.',
  );
  assert.equal(accountErrorMessage(undefined, 'Save failed.'), 'Save failed.');
});

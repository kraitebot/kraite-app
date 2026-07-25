import type {
  AccountConfigurationPayload,
  ManagedAccount,
} from '../api/types';

export type AccountDraft = Omit<AccountConfigurationPayload, 'account_id'>;

export function accountDraft(account: ManagedAccount): AccountDraft {
  return {
    name: account.name,
    portfolio_quote: account.portfolio_quote,
    trading_quote: account.trading_quote,
    can_trade: account.can_trade,
    profit_percentage: account.profit_percentage,
    stop_market_initial_percentage: account.stop_market_initial_percentage,
    total_positions_long: account.total_positions_long,
    total_positions_short: account.total_positions_short,
    position_leverage_long: account.position_leverage_long,
    position_leverage_short: account.position_leverage_short,
    margin_percentage_long: account.margin_percentage_long,
    margin_percentage_short: account.margin_percentage_short,
  };
}

export function accountPayload(
  accountId: number,
  draft: AccountDraft,
): AccountConfigurationPayload {
  return {
    account_id: accountId,
    ...draft,
    name: draft.name.trim(),
  };
}

export function accountHasChanges(account: ManagedAccount, draft: AccountDraft): boolean {
  return JSON.stringify(accountDraft(account)) !== JSON.stringify({
    ...draft,
    name: draft.name.trim(),
  });
}

export function accountErrorMessage(
  errors: Record<string, string[]> | undefined,
  fallback: string,
): string {
  const first = errors ? Object.values(errors).flat()[0] : undefined;
  return first ?? fallback;
}

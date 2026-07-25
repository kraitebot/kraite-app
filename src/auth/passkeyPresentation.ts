export type PasskeyFailure = {
  error?: unknown;
  message?: unknown;
};

export function isPasskeyCancellation(failure: unknown): boolean {
  return typeof failure === 'object'
    && failure !== null
    && (failure as PasskeyFailure).error === 'UserCancelled';
}

export function passkeyErrorMessage(failure: unknown): string {
  const code = typeof failure === 'object' && failure !== null
    ? (failure as PasskeyFailure).error
    : undefined;

  switch (code) {
    case 'NotSupported':
      return 'Passkeys are not supported on this device.';
    case 'NoCredentials':
      return 'No Kraite passkey is available. Sign in with your password first.';
    case 'BadConfiguration':
      return 'Kraite passkeys are not ready on this device yet.';
    case 'CredentialAlreadyExists':
      return 'This device already has a Kraite passkey.';
    case 'Interrupted':
      return 'Passkey authentication was interrupted. Please try again.';
    case 'TimedOut':
      return 'Passkey authentication timed out. Please try again.';
    default:
      return 'Unable to use this passkey. Please try again.';
  }
}

/**
 * `accountHasPasskey` is the login response's `passkeys_enabled`, which the
 * server resolves from whether the trader already owns at least one passkey —
 * not from a feature switch. The invite is therefore offered only to accounts
 * that have none yet.
 */
export function shouldOfferPasskey(
  supported: boolean,
  accountHasPasskey: boolean,
  invitationDismissed: boolean,
): boolean {
  return supported && !accountHasPasskey && !invitationDismissed;
}

/**
 * Formats a passkey timestamp for display. Returns an em dash for an absent or
 * malformed value: `Intl.DateTimeFormat` throws a RangeError on an invalid date
 * rather than degrading, which would take the whole row down.
 *
 * `locale` and `timeZone` are injectable so the output can be asserted without
 * depending on the host machine's settings.
 */
export function passkeyDate(
  value: string | null | undefined,
  locale?: string,
  timeZone?: string,
): string {
  if (!value) return '—';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  }).format(parsed);
}

export function passkeyUsage(
  lastUsedAt: string | null | undefined,
  locale?: string,
  timeZone?: string,
): string {
  const formatted = passkeyDate(lastUsedAt, locale, timeZone);
  return formatted === '—' ? 'Never used' : `Used ${formatted}`;
}

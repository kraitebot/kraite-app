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

export function shouldOfferPasskey(
  supported: boolean,
  accountHasPasskey: boolean,
  invitationDismissed: boolean,
): boolean {
  return supported && !accountHasPasskey && !invitationDismissed;
}

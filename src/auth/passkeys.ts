import {
  Passkey,
  PasskeyCreateRequest,
  PasskeyCreateResult,
  PasskeyGetRequest,
  PasskeyGetResult,
} from 'react-native-passkey';

import { api } from '../api/client';
import {
  LoginResponse,
  PasskeyCreateResponse,
  PasskeyListResponse,
  PasskeyOptionsResponse,
} from '../api/types';

export const PASSKEYS_ENABLED = false;

export function isPasskeySupported(): boolean {
  return PASSKEYS_ENABLED && Passkey.isSupported();
}

export async function registerPasskey(name = 'Kraite on iPhone'): Promise<PasskeyCreateResponse> {
  const ceremony = await api.get<PasskeyOptionsResponse<PasskeyCreateRequest>>('/passkeys/register/options');
  const credential: PasskeyCreateResult = await Passkey.create(ceremony.options);

  return api.post<PasskeyCreateResponse>('/passkeys', {
    name,
    challenge_id: ceremony.challenge_id,
    credential,
  });
}

export async function authenticateWithPasskey(): Promise<LoginResponse> {
  const ceremony = await api.get<PasskeyOptionsResponse<PasskeyGetRequest>>('/auth/passkey/options');
  const credential: PasskeyGetResult = await Passkey.get(ceremony.options);

  return api.post<LoginResponse>('/auth/passkey/token', {
    challenge_id: ceremony.challenge_id,
    credential,
    device_name: 'Kraite iPhone · Passkey',
  });
}

export function listPasskeys(): Promise<PasskeyListResponse> {
  return api.get<PasskeyListResponse>('/passkeys');
}

export function deletePasskey(passkeyId: number): Promise<void> {
  return api.delete<void>(`/passkeys/${passkeyId}`);
}

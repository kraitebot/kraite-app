import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import * as SecureStore from 'expo-secure-store';

import { api, getToken, setToken } from '../api/client';
import { LoginResponse, Trader } from '../api/types';
import { isPasskeySupported } from './passkeys';
import { shouldOfferPasskey } from './passkeyPresentation';

type AuthContextValue = {
  user: Trader | null;
  booting: boolean;
  passkeyInvitePending: boolean;
  authenticate: (email: string, password: string) => Promise<LoginResponse>;
  activateSession: (session: LoginResponse, offerPasskey?: boolean) => Promise<void>;
  dismissPasskeyInvite: () => Promise<void>;
  completePasskeyInvite: () => Promise<void>;
  logout: () => Promise<void>;
  expireSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const USER_KEY = 'kraite.cachedUser';
const PASSKEY_INVITE_KEY_PREFIX = 'kraite.passkeyInviteDismissed.';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Trader | null>(null);
  const [booting, setBooting] = useState(true);
  const [passkeyInvitePending, setPasskeyInvitePending] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.all([getToken(), SecureStore.getItemAsync(USER_KEY)]).then(([token, cachedUser]) => {
      if (alive && token) {
        try {
          setUser(cachedUser ? JSON.parse(cachedUser) as Trader : { id: 0, name: 'Trader', email: '' });
        } catch {
          setUser({ id: 0, name: 'Trader', email: '' });
        }
      }
    }).finally(() => {
      if (alive) setBooting(false);
    });

    return () => { alive = false; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    booting,
    passkeyInvitePending,
    authenticate: async (email, password) => api.post<LoginResponse>('/auth/token', {
        email: email.trim().toLowerCase(),
        password,
        device_name: 'Kraite iPhone',
    }),
    activateSession: async (session, offerPasskey = false) => {
      await setToken(session.token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
      setUser(session.user);

      const invitationDismissed = await SecureStore.getItemAsync(`${PASSKEY_INVITE_KEY_PREFIX}${session.user.id}`);
      setPasskeyInvitePending(offerPasskey && shouldOfferPasskey(
        isPasskeySupported(),
        session.passkeys_enabled,
        invitationDismissed === '1',
      ));
    },
    dismissPasskeyInvite: async () => {
      if (user) {
        await SecureStore.setItemAsync(`${PASSKEY_INVITE_KEY_PREFIX}${user.id}`, '1');
      }
      setPasskeyInvitePending(false);
    },
    completePasskeyInvite: async () => {
      if (user) {
        await SecureStore.setItemAsync(`${PASSKEY_INVITE_KEY_PREFIX}${user.id}`, '1');
      }
      setPasskeyInvitePending(false);
    },
    logout: async () => {
      await api.delete('/auth/token').catch(() => undefined);
      await Promise.all([setToken(null), SecureStore.deleteItemAsync(USER_KEY)]);
      setPasskeyInvitePending(false);
      setUser(null);
    },
    expireSession: async () => {
      await Promise.all([setToken(null), SecureStore.deleteItemAsync(USER_KEY)]);
      setPasskeyInvitePending(false);
      setUser(null);
    },
  }), [user, booting, passkeyInvitePending]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

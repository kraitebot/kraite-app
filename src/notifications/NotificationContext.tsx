import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';

import { api, ApiError } from '../api/client';
import { AppNotification, NotificationsResponse } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { openDashboard } from '../navigation/navigationRef';
import {
  mergeNotifications,
  mergeReadIds,
  newestUnreadNotification,
  parsePushNotification,
  unreadNotificationCount,
} from './notificationState';
import { storeExpoPushToken } from './pushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type NotificationContextValue = {
  notifications: AppNotification[];
  readIds: string[];
  unreadCount: number;
  overlay: AppNotification | null;
  loading: boolean;
  refreshing: boolean;
  hasNextPage: boolean;
  dismissOverlay: () => void;
  markVisible: (ids: string[]) => void;
  refresh: () => Promise<void>;
  loadNext: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);
const READ_KEY_PREFIX = 'kraite.notificationReadIds.';

function easProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as {
    eas?: { projectId?: string };
    projectId?: string;
  } | undefined;

  return process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    ?? Constants.easConfig?.projectId
    ?? extra?.eas?.projectId
    ?? extra?.projectId
    ?? null;
}

function notificationFromExpo(notification: Notifications.Notification): AppNotification {
  return parsePushNotification(
    notification.request.content,
    notification.request.identifier,
    new Date().toISOString(),
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, expireSession } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [overlay, setOverlay] = useState<AppNotification | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const notificationsRef = useRef<AppNotification[]>([]);
  const readIdsRef = useRef<string[]>([]);
  const loadingNext = useRef(false);
  const handledResponseId = useRef<string | null>(null);

  const refreshNotifications = useCallback(async (presentLatestUnread = false): Promise<void> => {
    if (!user || Platform.OS !== 'ios') return;

    setRefreshing(true);
    try {
      const response = await api.get<NotificationsResponse>('/notifications');
      const merged = mergeNotifications(notificationsRef.current, response.data.notifications);
      notificationsRef.current = merged;
      setNotifications(merged);
      setNextCursor(response.data.next_cursor);

      if (presentLatestUnread) {
        const latestUnread = newestUnreadNotification(merged, readIdsRef.current);
        if (latestUnread) {
          setOverlay(latestUnread);
          openDashboard();
        }
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await expireSession();
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [expireSession, user]);

  const refresh = useCallback(
    async (): Promise<void> => refreshNotifications(false),
    [refreshNotifications],
  );

  const loadNext = useCallback(async (): Promise<void> => {
    if (!nextCursor || loadingNext.current || Platform.OS !== 'ios') return;

    loadingNext.current = true;
    try {
      const response = await api.get<NotificationsResponse>(
        `/notifications?cursor=${encodeURIComponent(nextCursor)}`,
      );
      const merged = mergeNotifications(notificationsRef.current, response.data.notifications);
      notificationsRef.current = merged;
      setNotifications(merged);
      setNextCursor(response.data.next_cursor);
    } finally {
      loadingNext.current = false;
    }
  }, [nextCursor]);

  const registerPhone = useCallback(async (): Promise<void> => {
    if (!user || Platform.OS !== 'ios') return;

    const projectId = easProjectId();
    if (!projectId) return;

    try {
      let permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') {
        permission = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
      }
      if (permission.status !== 'granted') return;

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      await api.put('/push-devices/current', {
        expo_push_token: token,
        platform: 'ios',
        device_name: Constants.deviceName ?? 'Kraite iPhone',
        app_version: Constants.expoConfig?.version ?? null,
      });
      await storeExpoPushToken(token);
    } catch {
      // Permission, simulator, connectivity, and provisioning failures must not
      // block Dashboard. Registration retries on the next foreground activation.
    }
  }, [user]);

  const markVisible = useCallback((ids: string[]): void => {
    if (!user || Platform.OS !== 'ios' || ids.length === 0) return;

    const next = mergeReadIds(readIdsRef.current, ids);
    readIdsRef.current = next;
    setReadIds(next);
    void SecureStore.setItemAsync(`${READ_KEY_PREFIX}${user.id}`, JSON.stringify(next));
  }, [user]);

  const receive = useCallback((incoming: Notifications.Notification): void => {
    const parsed = notificationFromExpo(incoming);
    const merged = mergeNotifications(notificationsRef.current, [parsed]);
    notificationsRef.current = merged;
    setNotifications(merged);
    setOverlay(parsed);
    openDashboard();
  }, []);

  const respond = useCallback((response: Notifications.NotificationResponse): void => {
    const responseId = response.notification.request.identifier;
    if (handledResponseId.current === responseId) return;

    handledResponseId.current = responseId;
    receive(response.notification);
  }, [receive]);

  useEffect(() => {
    if (!user || Platform.OS !== 'ios') {
      setNotifications([]);
      setReadIds([]);
      notificationsRef.current = [];
      readIdsRef.current = [];
      setOverlay(null);
      setNextCursor(null);
      setLoading(false);
      return;
    }

    let active = true;
    setNotifications([]);
    setReadIds([]);
    notificationsRef.current = [];
    readIdsRef.current = [];
    setOverlay(null);
    setNextCursor(null);
    setLoading(true);

    void SecureStore.getItemAsync(`${READ_KEY_PREFIX}${user.id}`).then(async (stored) => {
      if (!active) return;
      try {
        const storedReadIds = stored ? JSON.parse(stored) as string[] : [];
        readIdsRef.current = storedReadIds;
        setReadIds(storedReadIds);
      } catch {
        readIdsRef.current = [];
        setReadIds([]);
      }

      if (active) await refreshNotifications(true);
    });
    void registerPhone();
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (active && response) {
        respond(response);
        Notifications.clearLastNotificationResponse();
      }
    });

    return () => {
      active = false;
    };
  }, [refreshNotifications, registerPhone, respond, user]);

  useEffect(() => {
    if (!user || Platform.OS !== 'ios') return;

    const receivedSubscription = Notifications.addNotificationReceivedListener(receive);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(respond);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void registerPhone();
        void refreshNotifications(true);
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
      appStateSubscription.remove();
    };
  }, [receive, refreshNotifications, registerPhone, respond, user]);

  const unreadCount = useMemo(
    () => Platform.OS === 'ios' ? unreadNotificationCount(notifications, readIds) : 0,
    [notifications, readIds],
  );

  useEffect(() => {
    if (Platform.OS === 'ios') {
      void Notifications.setBadgeCountAsync(unreadCount).catch(() => undefined);
    }
  }, [unreadCount]);

  const value = useMemo<NotificationContextValue>(() => ({
    notifications,
    readIds,
    unreadCount,
    overlay,
    loading,
    refreshing,
    hasNextPage: nextCursor !== null,
    dismissOverlay: () => setOverlay(null),
    markVisible,
    refresh,
    loadNext,
  }), [
    notifications,
    readIds,
    unreadCount,
    overlay,
    loading,
    refreshing,
    nextCursor,
    markVisible,
    refresh,
    loadNext,
  ]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used within NotificationProvider');

  return value;
}

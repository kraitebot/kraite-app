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
import {
  AppNotification,
  MarkNotificationsReadResponse,
  NotificationsResponse,
} from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { openDashboard, openNotifications } from '../navigation/navigationRef';
import {
  mergeNotifications,
  mergeReadIds,
  pendingNotificationPresentation,
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
  const [readyUserId, setReadyUserId] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const notificationsRef = useRef<AppNotification[]>([]);
  const readIdsRef = useRef<string[]>([]);
  const pendingCountRef = useRef(0);
  const readStateReadyRef = useRef(false);
  const loadingNext = useRef(false);
  const handledResponseId = useRef<string | null>(null);

  const presentPendingNotifications = useCallback((
    available: AppNotification[],
    count = pendingCountRef.current,
  ): void => {
    if (!readStateReadyRef.current) return;

    const presentation = pendingNotificationPresentation(available, readIdsRef.current, count);
    setOverlay(presentation.overlay);

    if (presentation.destination === 'dashboard') {
      openDashboard();
    } else if (presentation.destination === 'notifications') {
      openNotifications();
    }
  }, []);

  const refreshNotifications = useCallback(async (presentLatestUnread = false): Promise<void> => {
    if (!user || Platform.OS !== 'ios') return;

    setRefreshing(true);
    try {
      const response = await api.get<NotificationsResponse>('/notifications');
      const serverNotifications = response.data.pending_notification
        ? [...response.data.notifications, response.data.pending_notification]
        : response.data.notifications;
      const merged = mergeNotifications(notificationsRef.current, serverNotifications);
      const serverReadIds = serverNotifications
        .filter((notification) => notification.is_read === true)
        .map((notification) => notification.id);
      const nextReadIds = mergeReadIds(readIdsRef.current, serverReadIds);
      const nextPendingCount = typeof response.data.unread_count === 'number'
        ? response.data.unread_count
        : unreadNotificationCount(merged, nextReadIds);
      notificationsRef.current = merged;
      readIdsRef.current = nextReadIds;
      pendingCountRef.current = nextPendingCount;
      setNotifications(merged);
      setReadIds(nextReadIds);
      setPendingCount(nextPendingCount);
      setNextCursor(response.data.next_cursor);

      if (presentLatestUnread) {
        presentPendingNotifications(merged, nextPendingCount);
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        await expireSession();
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [expireSession, presentPendingNotifications, user]);

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
      const serverReadIds = response.data.notifications
        .filter((notification) => notification.is_read === true)
        .map((notification) => notification.id);
      const nextReadIds = mergeReadIds(readIdsRef.current, serverReadIds);
      notificationsRef.current = merged;
      readIdsRef.current = nextReadIds;
      setNotifications(merged);
      setReadIds(nextReadIds);
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

    const read = new Set(readIdsRef.current);
    const newlyVisible = [...new Set(ids)].filter((id) => !read.has(id));
    if (newlyVisible.length === 0) return;

    const next = mergeReadIds(readIdsRef.current, newlyVisible);
    const nextPendingCount = Math.max(0, pendingCountRef.current - newlyVisible.length);
    readIdsRef.current = next;
    pendingCountRef.current = nextPendingCount;
    setReadIds(next);
    setPendingCount(nextPendingCount);
    void SecureStore.setItemAsync(`${READ_KEY_PREFIX}${user.id}`, JSON.stringify(next));
    void api.patch<MarkNotificationsReadResponse>('/notifications/read', {
      event_ids: newlyVisible,
    }).then((response) => {
      pendingCountRef.current = response.data.unread_count;
      setPendingCount(response.data.unread_count);
    }).catch(async (caught) => {
      if (caught instanceof ApiError && caught.status === 401) {
        await expireSession();
      }
    });
  }, [expireSession, user]);

  const storeIncoming = useCallback((incoming: Notifications.Notification): AppNotification[] => {
    const parsed = notificationFromExpo(incoming);
    const merged = mergeNotifications(notificationsRef.current, [parsed]);
    notificationsRef.current = merged;
    setNotifications(merged);
    return merged;
  }, []);

  const receive = useCallback((incoming: Notifications.Notification): void => {
    const badge = incoming.request.content.badge;
    const nextPendingCount = typeof badge === 'number'
      ? Math.max(0, badge)
      : pendingCountRef.current + 1;
    pendingCountRef.current = nextPendingCount;
    setPendingCount(nextPendingCount);
    presentPendingNotifications(storeIncoming(incoming), nextPendingCount);
  }, [presentPendingNotifications, storeIncoming]);

  const respond = useCallback((response: Notifications.NotificationResponse): void => {
    const responseId = response.notification.request.identifier;
    if (handledResponseId.current === responseId) return;

    handledResponseId.current = responseId;
    storeIncoming(response.notification);

    if (readStateReadyRef.current) {
      void refreshNotifications(true);
    }
  }, [refreshNotifications, storeIncoming]);

  useEffect(() => {
    if (!user || Platform.OS !== 'ios') {
      setNotifications([]);
      setReadIds([]);
      notificationsRef.current = [];
      readIdsRef.current = [];
      pendingCountRef.current = 0;
      readStateReadyRef.current = false;
      setOverlay(null);
      setNextCursor(null);
      setLoading(false);
      setReadyUserId(null);
      setPendingCount(0);
      return;
    }

    let active = true;
    setNotifications([]);
    setReadIds([]);
    notificationsRef.current = [];
    readIdsRef.current = [];
    pendingCountRef.current = 0;
    readStateReadyRef.current = false;
    setOverlay(null);
    setNextCursor(null);
    setLoading(true);
    setReadyUserId(null);
    setPendingCount(0);

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

      readStateReadyRef.current = true;
      if (active) {
        await refreshNotifications(true);
        if (active) setReadyUserId(user.id);
      }
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
      readStateReadyRef.current = false;
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

  const unreadCount = Platform.OS === 'ios' ? pendingCount : 0;

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    if (!user) {
      void Notifications.setBadgeCountAsync(0).catch(() => undefined);
      return;
    }

    if (readyUserId !== user.id) return;

    void Notifications.setBadgeCountAsync(unreadCount).catch(() => undefined);
  }, [readyUserId, unreadCount, user]);

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

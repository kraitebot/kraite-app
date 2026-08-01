import type { AppNotification, AppNotificationSeverity } from '../api/types';
import type { NoticeTone } from '../components/noticePresentation';

const READ_ID_LIMIT = 200;
const SEVERITIES = new Set<AppNotificationSeverity>(['critical', 'high', 'medium', 'info']);

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function parsePushNotification(
  content: { title?: string | null; body?: string | null; data?: Record<string, unknown> },
  fallbackId: string,
  receivedAt: string,
): AppNotification {
  const data = content.data ?? {};
  const severity = stringValue(data.severity);

  return {
    id: stringValue(data.event_id) ?? fallbackId,
    canonical: stringValue(data.canonical) ?? 'uncategorized_notification',
    title: stringValue(data.title) ?? stringValue(content.title) ?? 'Kraite notification',
    body: stringValue(data.body) ?? stringValue(content.body) ?? '',
    severity: severity && SEVERITIES.has(severity as AppNotificationSeverity)
      ? severity as AppNotificationSeverity
      : 'info',
    status: 'delivered',
    sent_at: stringValue(data.sent_at) ?? receivedAt,
  };
}

export function mergeNotifications(
  current: AppNotification[],
  incoming: AppNotification[],
): AppNotification[] {
  const byId = new Map<string, AppNotification>();

  [...incoming, ...current].forEach((notification) => {
    if (!byId.has(notification.id)) byId.set(notification.id, notification);
  });

  return [...byId.values()].sort((left, right) => (
    new Date(right.sent_at).getTime() - new Date(left.sent_at).getTime()
  ));
}

export function mergeReadIds(current: string[], visible: string[], limit = READ_ID_LIMIT): string[] {
  return [...new Set([...visible, ...current])].slice(0, limit);
}

export function unreadNotificationCount(notifications: AppNotification[], readIds: string[]): number {
  const read = new Set(readIds);

  return notifications.reduce((count, notification) => count + (read.has(notification.id) ? 0 : 1), 0);
}

export function newestUnreadNotification(
  notifications: AppNotification[],
  readIds: string[],
): AppNotification | null {
  const read = new Set(readIds);

  return notifications.find((notification) => !read.has(notification.id)) ?? null;
}

export function notificationTone(severity: AppNotificationSeverity): NoticeTone {
  if (severity === 'critical') return 'error';
  if (severity === 'high') return 'warning';

  return 'info';
}

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mergeNotifications,
  mergeReadIds,
  newestUnreadNotification,
  notificationTone,
  parsePushNotification,
  unreadNotificationCount,
} from './notificationState.ts';

test('parses a Kraite push payload using the cross-channel event identity', () => {
  assert.deepEqual(parsePushNotification({
    title: 'Fallback title',
    body: 'Fallback body',
    data: {
      event_id: 'event-123',
      canonical: 'market_regime_critical',
      title: 'BSCS Critical',
      body: 'Opens paused for 12h',
      severity: 'high',
    },
  }, 'native-id', '2026-07-30T20:00:00.000Z'), {
    id: 'event-123',
    canonical: 'market_regime_critical',
    title: 'BSCS Critical',
    body: 'Opens paused for 12h',
    severity: 'high',
    status: 'delivered',
    sent_at: '2026-07-30T20:00:00.000Z',
  });
});

test('falls back safely when a push contains unknown or incomplete data', () => {
  const parsed = parsePushNotification({
    title: 'Position closed',
    body: 'BTCUSDT closed',
    data: { severity: 'impossible' },
  }, 'native-id', '2026-07-30T20:00:00.000Z');

  assert.equal(parsed.id, 'native-id');
  assert.equal(parsed.canonical, 'uncategorized_notification');
  assert.equal(parsed.severity, 'info');
  assert.equal(parsed.title, 'Position closed');
  assert.equal(parsed.body, 'BTCUSDT closed');
});

test('merges live and history notifications without duplicate events and keeps newest first', () => {
  const old = {
    id: 'one',
    canonical: 'position_closed',
    title: 'Old',
    body: 'Old',
    severity: 'info',
    status: 'delivered',
    sent_at: '2026-07-30T19:00:00.000Z',
  };
  const newest = {
    ...old,
    id: 'two',
    title: 'Newest',
    sent_at: '2026-07-30T21:00:00.000Z',
  };

  assert.deepEqual(
    mergeNotifications([old], [newest, { ...old, title: 'History copy' }]).map(({ id, title }) => ({ id, title })),
    [
      { id: 'two', title: 'Newest' },
      { id: 'one', title: 'History copy' },
    ],
  );
});

test('marks only visible notifications read locally and bounds retained identities', () => {
  const notifications = ['one', 'two', 'three'].map((id) => ({
    id,
    canonical: 'position_closed',
    title: id,
    body: id,
    severity: 'info',
    status: 'delivered',
    sent_at: '2026-07-30T20:00:00.000Z',
  }));

  assert.equal(unreadNotificationCount(notifications, ['one']), 2);
  assert.deepEqual(mergeReadIds(['one', 'legacy'], ['two'], 3), ['two', 'one', 'legacy']);
  assert.deepEqual(mergeReadIds(['one', 'legacy'], ['two', 'three'], 3), ['two', 'three', 'one']);
});

test('selects the newest unread notification for dashboard replay', () => {
  const notifications = [
    ['newest', '2026-07-30T21:00:00.000Z'],
    ['next', '2026-07-30T20:00:00.000Z'],
    ['oldest', '2026-07-30T19:00:00.000Z'],
  ].map(([id, sent_at]) => ({
    id,
    canonical: 'position_closed',
    title: id,
    body: id,
    severity: 'info',
    status: 'delivered',
    sent_at,
  }));

  assert.equal(newestUnreadNotification(notifications, ['newest'])?.id, 'next');
  assert.equal(newestUnreadNotification(notifications, ['newest', 'next', 'oldest']), null);
});

test('maps breaker urgency to the existing dashboard overlay tones', () => {
  assert.equal(notificationTone('critical'), 'error');
  assert.equal(notificationTone('high'), 'warning');
  assert.equal(notificationTone('medium'), 'info');
  assert.equal(notificationTone('info'), 'info');
});

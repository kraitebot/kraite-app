import assert from 'node:assert/strict';
import test from 'node:test';

import { lastPositionClosedLabel } from './positionTimeline.ts';

const now = Date.parse('2026-07-21T12:00:00Z');

test('formats the time since the last position closed', () => {
  assert.equal(lastPositionClosedLabel('2026-07-21T11:55:00Z', now), 'Last position closed 5 minutes ago');
  assert.equal(lastPositionClosedLabel('2026-07-21T11:59:00Z', now), 'Last position closed 1 minute ago');
  assert.equal(lastPositionClosedLabel('2026-07-21T10:00:00Z', now), 'Last position closed 2 hours ago');
  assert.equal(lastPositionClosedLabel('2026-07-19T12:00:00Z', now), 'Last position closed 2 days ago');
});

test('handles empty, unavailable, and future close times', () => {
  assert.equal(lastPositionClosedLabel(null, now), 'No positions closed yet');
  assert.equal(lastPositionClosedLabel(undefined, now), 'Last position close unavailable');
  assert.equal(lastPositionClosedLabel('not-a-date', now), 'Last position close unavailable');
  assert.equal(lastPositionClosedLabel('2026-07-21T12:01:00Z', now), 'Last position closed just now');
});

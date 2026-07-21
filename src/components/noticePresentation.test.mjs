import assert from 'node:assert/strict';
import test from 'node:test';

import { NOTICE_OVERLAY_PLACEMENT, NOTICE_TONE_ICONS } from './noticePresentation.ts';

test('keeps every notice outside the screen layout flow', () => {
  assert.deepEqual(NOTICE_OVERLAY_PLACEMENT, {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1100,
    elevation: 1100,
  });
  assert.equal('height' in NOTICE_OVERLAY_PLACEMENT, false);
  assert.equal('marginTop' in NOTICE_OVERLAY_PLACEMENT, false);
});

test('supports every notification tone through the same overlay', () => {
  assert.deepEqual(NOTICE_TONE_ICONS, {
    error: 'alert-circle-outline',
    warning: 'warning-outline',
    info: 'information-circle-outline',
    success: 'checkmark-circle-outline',
  });
});

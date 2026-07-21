import assert from 'node:assert/strict';
import test from 'node:test';

import { SCREEN_TRANSITION_MS } from './timing.ts';

test('keeps screen changes fast while giving the reveal more time', () => {
  assert.deepEqual(SCREEN_TRANSITION_MS, { cover: 120, reveal: 180 });
  assert.equal(SCREEN_TRANSITION_MS.cover + SCREEN_TRANSITION_MS.reveal, 300);
  assert.equal(SCREEN_TRANSITION_MS.reveal > SCREEN_TRANSITION_MS.cover, true);
});

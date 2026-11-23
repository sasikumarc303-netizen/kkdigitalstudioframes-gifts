import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeReference } from './helpers.js';

test('new human-readable references use a 32-bit random suffix', () => {
  assert.match(makeReference('ORD'), /^KK-ORD-\d{6}-[A-F0-9]{8}$/);
});

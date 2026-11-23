/** The fix calendar must reach its real store, not a refused name. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('FixScheduleItem is mapped to the fix-schedule route', async () => {
  const text = await readFile(new URL('../src/api/base44Client.js', import.meta.url), 'utf8');
  assert.match(text, /FixScheduleItem: \{ path: "\/fix-schedule" \}/);
});

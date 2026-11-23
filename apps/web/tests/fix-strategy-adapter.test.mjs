/** The strategy library must reach its real store. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('FixStrategy is mapped to the fix-strategies route', async () => {
  const text = await readFile(new URL('../src/api/base44Client.js', import.meta.url), 'utf8');
  assert.match(text, /FixStrategy: \{ path: "\/fix-strategies" \}/);
});

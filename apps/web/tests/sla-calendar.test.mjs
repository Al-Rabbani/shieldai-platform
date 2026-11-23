/** The SLA calendar panel must state an absent integration, not render it as zero events. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rendered = async () => {
  const text = await readFile(new URL('../src/components/fixes/SlaCalendarSyncPanel.jsx', import.meta.url), 'utf8');
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
};

test('the panel offers no sync and claims no schedule', async () => {
  const text = await rendered();
  assert.ok(!text.includes('Sync now'), 'a button that cannot sync must not be offered');
  assert.ok(!text.includes('06:00'), 'no scheduled sync exists on this host');
  assert.ok(!text.includes('functions.invoke'));
  assert.match(text, /not connected/);
});

/** The auto-remediation panel must not claim an automation that does not exist. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rendered = async () => {
  const text = await readFile(new URL('../src/components/fixes/AutoRemediationToggles.jsx', import.meta.url), 'utf8');
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
};

test('the panel reads no refused entity and claims no auto-patch', async () => {
  const text = await rendered();
  assert.ok(!text.includes('AutoRemediationPolicy'));
  assert.ok(!text.includes('auto-patch'));
  assert.match(text, /Not automated/);
});

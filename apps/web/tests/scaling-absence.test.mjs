/**
 * The scaling page offered Save and Run over a function and an entity that do not exist.
 *
 * Measured 22 Nov 2026: grep for "autoscal" across apps/api/gds_api and scripts/ops returns NOTHING - no backlog watcher,
 * no process manager, no scaling engine - and FleetScalingConfig has no table, so the policy form could not be saved
 * either. Both buttons ran a try/finally with no catch, so a click failed silently and looked like a no-op.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const SOURCE = new URL('../src/api/base44Client.js', import.meta.url);
const PAGE = new URL('../src/pages/settings/FleetScalingPage.jsx', import.meta.url);

test('the autoscale refusal names the missing engine and the missing store', async () => {
  const source = await readFile(SOURCE, 'utf8');
  const dir = await mkdtemp(join(tmpdir(), 'scaling-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  global.fetch = async () => ({ ok: true, status: 200, headers: { get: () => 'application/json' },
    text: async () => '{}', json: async () => ({}) });
  const { base44 } = await import(pathToFileURL(file).href);
  await assert.rejects(
    () => base44.functions.invoke('gdsFleetAutoscale', { action: 'run' }),
    (error) => {
      assert.match(error.message, /No autoscaler exists/);
      assert.match(error.message, /max_concurrency/, 'the real registry fact must be named');
      assert.match(error.message, /nowhere to be stored/);
      return true;
    },
  );
});

test('the page states the absence instead of describing capacity following a backlog', async () => {
  const page = await readFile(PAGE, 'utf8');
  assert.ok(!page.includes('Capacity follows the task backlog'), 'that sentence described a mechanism that does not exist');
  assert.match(page, /There is no autoscaler on this platform/);
  assert.match(page, /no scaling policy is stored here/);
});

test('the controls that cannot work are disabled and say why', async () => {
  const page = await readFile(PAGE, 'utf8');
  assert.match(page, /Save policy \(no store\)/);
  assert.match(page, /Run scaling \(no autoscaler\)/);
  const disabled = page.match(/disabled\s*\n?\s*title=/g) || [];
  assert.equal(disabled.length, 2, 'both buttons must be disabled with a title explaining it');
});

test('no sentence describes a formula, a burst agent or a schedule that does not exist', async () => {
  const page = await readFile(PAGE, 'utf8');
  for (const claim of [
    'Desired fleet = open tasks',
    'One is added automatically',
    'scheduled run fires every 15 minutes',
  ]) {
    assert.ok(!page.includes(claim), `still claims: ${claim}`);
  }
  assert.match(page, /No formula is evaluated anywhere/);
  assert.match(page, /nothing on this platform creates one automatically/);
  assert.match(page, /No scheduled scaling run exists/);
});

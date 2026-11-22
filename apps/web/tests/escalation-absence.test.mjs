/**
 * gdsVulnEscalation: the refusal must name what is missing, because two thirds of the feature exists.
 *
 * Measured 22 Nov 2026: the host holds only SLACK_WEBHOOK_URL (a webhook can post, it cannot enumerate channels), there
 * is no department or threshold table at all, and escalation RULES are real and served through
 * VulnEscalationRule -> /siem/correlation/rules. A generic "not served yet" told an operator nothing about which half
 * was missing, so the same question was re-measured from scratch.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const SOURCE = new URL('../src/api/base44Client.js', import.meta.url);

async function loadAdapter() {
  const source = await readFile(SOURCE, 'utf8');
  const dir = await mkdtemp(join(tmpdir(), 'adapter-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  return import(pathToFileURL(file).href);
}

global.fetch = async () => ({
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  text: async () => '{}',
  json: async () => ({}),
});

test('the escalation refusal names the webhook and the missing threshold store', async () => {
  const { base44 } = await loadAdapter();
  await assert.rejects(
    () => base44.functions.invoke('gdsVulnEscalation', { action: 'channels' }),
    (error) => {
      assert.match(error.message, /bot token/i);
      assert.match(error.message, /threshold store/i);
      assert.match(error.message, /correlation rules/i, 'the served half must be named too');
      assert.equal(error.detail.includes('webhook'), true);
      return true;
    },
  );
});

test('a function with no measured reason keeps the plain message', async () => {
  const { base44 } = await loadAdapter();
  await assert.rejects(
    () => base44.functions.invoke('gdsForensicChain', {}),
    (error) => {
      assert.match(error.message, /is not served by the GDSA Radar API yet\.$/);
      assert.equal(error.detail, null);
      return true;
    },
  );
});

test('the risk-limits page states the absence instead of offering a working check', async () => {
  const page = await readFile(new URL('../src/pages/RiskThresholdsPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /no department threshold store/i);
  assert.match(page, /bot\s*\n?\s*token|bot token/i);
});

test('the posture card offers a typed channel when no list exists, and says why', async () => {
  const card = await readFile(new URL('../src/components/settings/PostureDropAlertCard.jsx', import.meta.url), 'utf8');
  assert.match(card, /channels\.length > 0 \?/);
  assert.match(card, /placeholder="Channel ID/);
  assert.match(card, /bot token this platform does not hold/);
});

test('the escalation settings page shows the channel reason outside the form', async () => {
  const page = await readFile(new URL('../src/pages/EscalationSettingsPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /\{channelError && \(/);
  assert.match(page, /typed by hand/);
});

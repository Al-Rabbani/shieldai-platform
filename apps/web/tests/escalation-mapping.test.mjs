/**
 * AssignmentRulesPage's escalate button, pinned to the route that now answers it.
 *
 * Measured 22 Nov 2026: the page called gdsAutoAssignFindings, which the adapter refused, while the platform had been
 * running the age policy from cron all along. These tests keep the mapping, keep the explicit apply, and keep every
 * other action refused.
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

function stubFetch(responses) {
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body });
    const body = responses.shift() ?? {};
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      text: async () => JSON.stringify(body),
      json: async () => body,
    };
  };
  return calls;
}

const RESULT = {
  checked: 849,
  stale: 28,
  applied: true,
  escalated: 28,
  notifications_raised: 28,
  by_band: { policy: 28 },
  by_severity: { high: 6, medium: 22 },
  slack_delivered: false,
  delivery: 'in-app notifications only; this route sends no Slack message',
};

test('escalate_stale posts to the escalation route with apply set by the caller', async () => {
  const calls = stubFetch([RESULT]);
  const { base44 } = await loadAdapter();
  const res = await base44.functions.invoke('gdsAutoAssignFindings', { action: 'escalate_stale', apply: true });
  assert.equal(calls[0].url, '/api/findings/escalate-stale');
  assert.equal(calls[0].method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].body), { apply: true });
  assert.equal(res.data.stale, 28);
  assert.equal(res.data.slack_delivered, false);
});

test('a preview request asks for no write', async () => {
  const calls = stubFetch([{ ...RESULT, applied: false, escalated: 0, notifications_raised: 0 }]);
  const { base44 } = await loadAdapter();
  await base44.functions.invoke('gdsAutoAssignFindings', { action: 'escalate_stale', apply: false });
  assert.deepEqual(JSON.parse(calls[0].body), { apply: false });
});

test('any other action is refused rather than quietly posting apply:false', async () => {
  stubFetch([{}]);
  const { base44 } = await loadAdapter();
  await assert.rejects(
    () => base44.functions.invoke('gdsAutoAssignFindings', { action: 'assign_all' }),
    /not served|not on this platform|NotOnThisPlatform|gdsAutoAssignFindings/i,
  );
});

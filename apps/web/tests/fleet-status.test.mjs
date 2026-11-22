/**
 * gdsFleetStatus: a route that has answered since item 11, reached through a name the adapter refused.
 *
 * Measured 22 Nov 2026: GET /agents/fleet/status returns {tenant_id, freshness:{fresh_within_seconds,
 * stale_after_seconds}, counts, roles[]}. Both components gate on `payload.success`, which the route never sends, so the
 * fleet panel rendered "unknown - backend status unavailable" over a 200 with 23 registered roles. The mapping below
 * adds only facts the payload contains: success means the route answered, the release sha comes from the newest
 * heartbeat, and checked_at is the newest heartbeat RECEIPT rather than a server-side check time that does not exist.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const SOURCE = new URL('../src/api/base44Client.js', import.meta.url);
const PANEL = new URL('../src/components/settings/FleetStatusPanel.jsx', import.meta.url);

const PAYLOAD = {
  tenant_id: 't1',
  freshness: { fresh_within_seconds: 900, stale_after_seconds: 86400 },
  counts: { offline: 1, unknown: 22 },
  roles: [
    { agent_id: 'blue_team', state: 'offline', last_observed_at: '2026-11-18T02:00:00+00:00',
      last_received_at: '2026-11-18T02:00:05+00:00', release_sha: 'aaa111',
      evidence_source: 'agent_heartbeats (verified) + capability_decisions (executed)', reason: 'no heartbeat in 4 days' },
    { agent_id: 'threat_hunting', state: 'unknown', last_observed_at: null, last_received_at: null, release_sha: null,
      evidence_source: 'agent_heartbeats (verified) + capability_decisions (executed)', reason: 'never reported' },
  ],
};

async function loadAdapter(payload) {
  const source = await readFile(SOURCE, 'utf8');
  const dir = await mkdtemp(join(tmpdir(), 'fleet-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  global.fetch = async (url) => {
    const body = String(url).includes('/agents/fleet/status') ? payload : {};
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
             text: async () => JSON.stringify(body), json: async () => body };
  };
  return import(pathToFileURL(file).href);
}

test('the fleet payload reaches the panel with a success flag the route does not send', async () => {
  const { base44 } = await loadAdapter(PAYLOAD);
  const { data } = await base44.functions.invoke('gdsFleetStatus', {});
  assert.equal(data.success, true, 'the panel gates on this and the route never sends it');
  assert.equal(data.roles.length, 2);
  assert.deepEqual(data.counts, { offline: 1, unknown: 22 });
});

test('checked_at is the newest heartbeat receipt, not an invented check time', async () => {
  const { base44 } = await loadAdapter(PAYLOAD);
  const { data } = await base44.functions.invoke('gdsFleetStatus', {});
  assert.equal(data.checked_at, '2026-11-18T02:00:05+00:00');
  assert.ok(!Number.isNaN(new Date(data.checked_at).getTime()), 'the panel calls toISOString on this');
});

test('a fleet that never reported has no receipt and no release, and says so instead of failing', async () => {
  const { base44 } = await loadAdapter({ counts: { unknown: 23 }, roles: [], freshness: {} });
  const { data } = await base44.functions.invoke('gdsFleetStatus', {});
  assert.equal(data.success, true);
  assert.equal(data.checked_at, null, 'a null here must render "no heartbeat has ever been received"');
  assert.equal(data.release.sha, null);
  assert.equal(data.release.branch, null);
  assert.equal(data.freshness.capable_window_hours, null, 'the route reports no capable window');
});

test('the release sha is the newest one a heartbeat carried', async () => {
  const { base44 } = await loadAdapter(PAYLOAD);
  const { data } = await base44.functions.invoke('gdsFleetStatus', {});
  assert.equal(data.release.sha, 'aaa111');
});

test('the freshness window is translated, not renamed by guess', async () => {
  const { base44 } = await loadAdapter(PAYLOAD);
  const { data } = await base44.functions.invoke('gdsFleetStatus', {});
  assert.equal(data.freshness.fresh_seconds, 900);
  assert.equal(data.freshness.stale_seconds, 86400);
});

test('the panel no longer claims its sha comes from /health/version', async () => {
  const panel = await readFile(PANEL, 'utf8');
  assert.ok(!panel.includes('/health/version'), 'the sha is read from a heartbeat, not that route');
  assert.match(panel, /from the newest heartbeat/);
  assert.match(panel, /no heartbeat has ever been received/);
});

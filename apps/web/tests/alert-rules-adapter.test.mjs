/**
 * AlertRule, mapped end to end.
 *
 * /v2/alerts was refused this name and rendered "not served" over a table that the platform could fill: the
 * alert_rules table holds real rows and GET /alerts/rules already returned them. These tests pin the path and
 * the four column translations, because a silently renamed field is the difference between a rule table and a
 * table of blanks.
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
  const dir = await mkdtemp(join(tmpdir(), 'alert-adapter-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  return import(pathToFileURL(file).href);
}

function stubFetch(responses) {
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET' });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected fetch: ${url}`);
    return {
      ok: next.ok ?? true,
      status: next.status ?? 200,
      headers: { get: () => 'application/json' },
      json: async () => next.body,
      text: async () => JSON.stringify(next.body),
    };
  };
  return calls;
}

const RULE = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Critical finding opened',
  entity_type: 'finding',
  condition_field: 'severity',
  condition_operator: 'eq',
  condition_value: 'critical',
  severity: 'critical',
  channels: ['email', 'slack'],
  cooldown_minutes: 60,
  is_active: true,
  last_fired: null,
  fire_count: 7,
  created_at: '2026-11-01T09:00:00+00:00',
};

test('AlertRule lists /alerts/rules and translates the four column names', async () => {
  const calls = stubFetch([{ body: [RULE] }]);
  const { base44 } = await loadAdapter();

  const rows = await base44.entities.AlertRule.list();

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/alerts\/rules$/);
  assert.equal(rows.length, 1);

  const r = rows[0];
  assert.equal(r.rule_name, 'Critical finding opened', 'rule_name must come from name');
  assert.equal(r.entity_name, 'finding', 'entity_name must come from entity_type');
  assert.deepEqual(r.notification_channels, ['email', 'slack'], 'notification_channels must come from channels');
  assert.equal(r.trigger_count, 7, 'trigger_count must come from fire_count');
  assert.equal(r.condition_field, 'severity');
  assert.equal(r.is_active, true);
  /* applyFields copies; it does not rename. The page column is what matters, and the source column stays
     readable because other pages read the platform's own name. */
  assert.equal(r.name, 'Critical finding opened', 'the source column stays readable beside the page column');
});

test('a refused neighbour is still refused, not invented', async () => {
  stubFetch([]);
  const { base44 } = await loadAdapter();
  const rows = await base44.entities.EscalationPolicy.list();
  assert.deepEqual(rows, [], 'no store exists for escalation policies, so the page must see an absence');
});

/**
 * VulnEscalationRule: the escalation panel's rules are siem_correlation_rules.
 *
 * These pin the five things that were wrong or missing: the path, the two field names the panel reads under
 * different names than the store, that a write is translated back into the platform's column names (a page
 * writing rule_name to an API whose column is `name` was a 422 the user could not act on), that an ambiguous
 * field is left alone rather than guessed, and that a seeded default is distinguishable from a tenant rule.
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
  const dir = await mkdtemp(join(tmpdir(), 'escalation-adapter-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  return import(pathToFileURL(file).href);
}

function stubFetch(responses) {
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected fetch: ${url}`);
    return {
      ok: next.ok ?? true,
      status: next.status ?? 200,
      headers: { get: () => 'application/json' },
      json: async () => next.body,
      text: async () => (next.body === undefined ? '' : JSON.stringify(next.body)),
    };
  };
  return calls;
}

const RULES = [
  {
    id: 'r1',
    name: 'Brute Force Attempt',
    severity: 'high',
    is_active: true,
    fire_count: 0,
    last_fired: null,
    origin: 'seeded',
    engineer_ids: [],
    team_names: [],
  },
];

test('VulnEscalationRule reads /siem/correlation/rules and renames the two fields the panel expects', async () => {
  const calls = stubFetch([{ body: RULES }]);
  const { base44 } = await loadAdapter();

  const rows = await base44.entities.VulnEscalationRule.list('-created_date', 100);

  assert.match(calls[0].url, /\/siem\/correlation\/rules/);
  assert.equal(rows[0].rule_name, 'Brute Force Attempt', 'the card renders rule.rule_name');
  assert.equal(rows[0].severity_threshold, 'high', 'the badge renders rule.severity_threshold');
  assert.equal(rows[0].origin, 'seeded', 'a seeded default must be distinguishable from a tenant rule');
});

test('a pause toggle sends the platform field, not the builder field', async () => {
  const calls = stubFetch([{ body: { ...RULES[0], is_active: false } }]);
  const { base44 } = await loadAdapter();

  await base44.entities.VulnEscalationRule.update('r1', { is_active: false });

  assert.equal(calls[0].method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].body), { is_active: false });
});

test('a create is translated into the column names, so a rule is not posted nameless', async () => {
  const calls = stubFetch([{ body: RULES[0] }]);
  const { base44 } = await loadAdapter();

  await base44.entities.VulnEscalationRule.create({
    rule_name: 'Night shift escalation',
    severity_threshold: 'critical',
    min_risk_score: 7.5,
    slack_channel_id: 'C0123',
    engineer_ids: [],
    team_names: [],
    is_active: true,
  });

  const body = JSON.parse(calls[0].body);
  assert.equal(calls[0].method, 'POST');
  assert.equal(body.name, 'Night shift escalation', 'name is NOT NULL in siem_correlation_rules');
  assert.equal(body.severity, 'critical');
  assert.equal(body.rule_name, undefined, 'the builder field must not be left alongside the platform field');
  assert.equal(body.min_risk_score, 7.5, 'a native field passes through untouched');
  assert.equal(body.slack_channel_id, 'C0123', 'the notification target is a real column since migration 054');
});

test('delete goes to the rule itself', async () => {
  const calls = stubFetch([{ body: undefined, status: 204 }]);
  const { base44 } = await loadAdapter();

  await base44.entities.VulnEscalationRule.delete('r1');

  assert.equal(calls[0].method, 'DELETE');
  assert.match(calls[0].url, /\/siem\/correlation\/rules\/r1$/);
});

test('the un-writable fields are exactly the three known ambiguous ones', async () => {
  const { AMBIGUOUS_REVERSE_FIELDS } = await loadAdapter();

  /* Measured, not assumed:
     - ComplianceChecklistItem: control_ref feeds both `id` and `key`, and `id` is the route's primary key.
     - TriagedFinding and Finding: detected_at feeds both `first_detected` and `last_seen`, because the findings
       table records one detection time and no separate last-seen. Nothing writes findings from a page (the
       scanners do), so leaving that field untranslated costs nothing and inventing a choice would not.
     If this object grows, a field map has become ambiguous and a save would start losing values. */
  assert.deepEqual(AMBIGUOUS_REVERSE_FIELDS, {
    ComplianceChecklistItem: ['control_ref'],
    TriagedFinding: ['detected_at'],
    Finding: ['detected_at'],
  });
});

/**
 * The compliance tracking page used to tick checkboxes over a table that does not exist.
 *
 * GET /compliance/controls answers {"controls": [ {framework, control_ref, title, severity, status, observed,
 * evidence_sha, assessed_at, verdict_source}, ... ]} - 297 catalogued controls whose status is the assessment
 * engine's own verdict (pass 103, fail 23, not_tested 178, not_applicable 11). Rows carry control_ref and no id.
 *
 * These tests pin the route, the envelope and the field translation the page now depends on.
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
  const dir = await mkdtemp(join(tmpdir(), 'compliance-engine-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  return import(pathToFileURL(file).href);
}

function stubFetch(payload, seen = []) {
  global.fetch = async (url) => {
    seen.push(String(url));
    return { status: 200, ok: true, text: async () => JSON.stringify(payload) };
  };
}

const CONTROLS = {
  count: 2,
  controls: [
    { framework: 'iso27001', control_ref: 'A.5.1', title: 'Policies for information security', category: 'Organisational', severity: 'medium', check_key: 'policies', verdict: 'pass', collector: 'gds', observed: 'policy pack present', evidence_sha: 'ab12', assessed_at: '2026-11-20T04:10:00Z', verdict_source: 'engine' },
    { framework: 'iso27001', control_ref: 'A.8.9', title: 'Configuration management', category: 'Technological', severity: 'high', check_key: 'config_baseline', verdict: 'not_tested', collector: null, observed: null, evidence_sha: null, assessed_at: null, verdict_source: null },
  ],
};

test('ComplianceChecklistItem reads the control verdicts route', async () => {
  const { base44 } = await loadAdapter();
  const seen = [];
  stubFetch(CONTROLS, seen);
  const rows = await base44.entities.ComplianceChecklistItem.list('-created_date', 300);
  assert.equal(seen.length, 1);
  assert.match(seen[0], /\/api\/compliance\/controls/);
  assert.equal(rows.length, 2, 'the controls envelope must unwrap');
});

test('a control row carries id, key and label from its own fields', async () => {
  const { base44 } = await loadAdapter();
  stubFetch(CONTROLS);
  const rows = await base44.entities.ComplianceChecklistItem.list('-created_date', 300);
  assert.equal(rows[0].id, 'A.5.1');
  assert.equal(rows[0].key, 'A.5.1');
  assert.equal(rows[0].label, 'Policies for information security');
});

test("the engine's verdict arrives as status, and is never replaced by a default", async () => {
  const { base44 } = await loadAdapter();
  stubFetch(CONTROLS);
  const rows = await base44.entities.ComplianceChecklistItem.list('-created_date', 300);
  assert.equal(rows[0].status, 'pass', 'the route calls it verdict; the pages read status');
  assert.equal(rows[1].status, 'not_tested', 'an unassessed control must stay not_tested, not become pass');
});

test('ComplianceAssessment reads the assessment route and unwraps its envelope', async () => {
  const { base44 } = await loadAdapter();
  const seen = [];
  stubFetch({ count: 1, assessments: [{ id: 'a1', framework: 'iso27001', control_id: 'A.5.1', control_name: 'Policies', status: 'pass', severity: 'medium' }] }, seen);
  const rows = await base44.entities.ComplianceAssessment.list('-created_date', 300);
  assert.match(seen[0], /\/api\/compliance\/assessments/);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].control_name, 'Policies');
});

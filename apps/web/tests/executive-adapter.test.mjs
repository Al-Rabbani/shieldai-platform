/**
 * The two executive sources, mapped end to end.
 *
 * Step 14 built /executive/risk-score and /executive/kpis. Until they were mapped here the dashboard tiles
 * had nothing behind them, so these tests exist to stop the mapping silently rotting: they assert the exact
 * paths, that a single-object response becomes a one-row list rather than being mistaken for empty, and that
 * the API's field names reach the pages under the names the pages actually read
 * (kpi.current_value, risk.current, and the counts flattened out of the nested block).
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
  const dir = await mkdtemp(join(tmpdir(), 'exec-adapter-'));
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

const RISK = {
  overall_score: 76.2,
  grade: 'C',
  trend: 'degrading',
  counts: { open_total: 849, critical: 0, high: 330, kev_open: 0, accepted_risk: 14 },
};

const KPIS = {
  kpis: [
    { key: 'open_findings', label: 'Open findings', value: 849, unit: 'findings', target: null, direction: 'down', status: 'attention' },
    { key: 'mean_age', label: 'Mean age of open findings', value: 6.6, unit: 'days', target: 30, direction: 'down', status: 'good' },
  ],
  calculated_at: '2026-11-22T04:30:00+00:00',
};

test('GlobalRiskScore reads the real endpoint and becomes a one-row list', async () => {
  const calls = stubFetch([{ body: RISK }]);
  const { base44 } = await loadAdapter();
  const rows = await base44.entities.GlobalRiskScore.list();

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/executive\/risk-score$/);
  assert.equal(rows.length, 1, 'a single object must not be read as an empty response');
  assert.equal(rows[0].grade, 'C');
});

test('the nested counts reach the pages under the flat names they read', async () => {
  stubFetch([{ body: RISK }]);
  const { base44 } = await loadAdapter();
  const [row] = await base44.entities.GlobalRiskScore.list();

  assert.equal(row.current, 76.2, 'LeadershipBriefingPage reads risk.current');
  assert.equal(row.high_findings, 330);
  assert.equal(row.critical_findings, 0);
  assert.equal(row.total_open_findings, 849);
  assert.equal(row.accepted_risk, 14, 'accepted criticals must stay visible, not vanish behind the score');
  assert.equal(row.counts.high, 330, 'the original nested block is preserved, not replaced');
});

test('KPI unwraps the kpis key and translates to the names the dashboard reads', async () => {
  const calls = stubFetch([{ body: KPIS }]);
  const { base44 } = await loadAdapter();
  const rows = await base44.entities.KPI.list();

  assert.match(calls[0].url, /\/executive\/kpis$/);
  assert.equal(rows.length, 2, 'the kpis wrapper must be unwrapped');
  assert.equal(rows[0].name, 'Open findings');
  assert.equal(rows[0].current_value, 849);
  assert.equal(rows[0].direction, 'down');
  assert.equal(rows[1].target_value, 30);
  assert.equal(rows[1].unit, 'days');
});

test('an unmapped entity still refuses rather than borrowing these numbers', async () => {
  stubFetch([]);
  const { base44 } = await loadAdapter();
  const rows = await base44.entities.PentestJob.list();
  assert.deepEqual(rows, [], 'a refused source returns nothing and never a fabricated row');
});

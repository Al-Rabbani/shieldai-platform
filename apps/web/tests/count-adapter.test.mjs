/**
 * The count defect: a page of rows must never be presented as a total, and the query that fetches it must
 * actually carry the sort and the limit the page asked for.
 *
 * Measured before the fix: the executive dashboard said 487 open findings while the tenant held 849, because
 * filter(query, sort, limit) had its second and third arguments mangled - a string sort was spread into the
 * query string as numeric params and the limit vanished, so 59 call sites silently lost sorting and paging.
 *
 * These tests pin the call shape the builder's pages use, the object form that came before it, and the KPI
 * field translation the tiles read.
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
  const dir = await mkdtemp(join(tmpdir(), 'count-adapter-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  return import(pathToFileURL(file).href);
}

function stubFetch(payload, seen) {
  global.fetch = async (url) => {
    seen.push(String(url));
    return {
      status: 200,
      ok: true,
      text: async () => JSON.stringify(payload),
    };
  };
}

test('filter(query, sort, limit) sends the sort and the limit, and no numeric keys', async () => {
  const { base44 } = await loadAdapter();
  const seen = [];
  stubFetch([{ id: 'f1', status: 'open' }], seen);

  await base44.entities.TriagedFinding.filter({ status: 'open' }, '-cvss_score', 500);

  const url = seen[0];
  assert.match(url, /[?&]status=open(&|$)/);
  assert.match(url, /[?&]sort=-cvss_score(&|$)/, 'the sort must reach the API');
  assert.match(url, /[?&]limit=500(&|$)/, 'the limit must reach the API');
  assert.doesNotMatch(url, /[?&]0=/, 'a string sort must never be spread into numeric params');
  assert.doesNotMatch(url, /[?&]1=/, 'a string sort must never be spread into numeric params');
});

test('filter(query, sort) without a limit still carries the sort', async () => {
  const { base44 } = await loadAdapter();
  const seen = [];
  stubFetch([], seen);

  await base44.entities.TriagedFinding.filter({ status: 'open' }, '-detected_at');

  assert.match(seen[0], /[?&]sort=-detected_at(&|$)/);
  assert.doesNotMatch(seen[0], /[?&]limit=/, 'no limit was asked for, so none is sent');
});

test('filter(query, options) keeps working for the object form', async () => {
  const { base44 } = await loadAdapter();
  const seen = [];
  stubFetch([], seen);

  await base44.entities.TriagedFinding.filter({ status: 'open' }, { limit: 50 });

  assert.match(seen[0], /[?&]limit=50(&|$)/);
  assert.match(seen[0], /[?&]status=open(&|$)/);
});

test('a KPI row reaches the pages as name and current_value', async () => {
  const { base44 } = await loadAdapter();
  stubFetch(
    { kpis: [{ key: 'open_findings', label: 'Open findings', value: 849, unit: 'findings', target: null, direction: 'down', status: 'attention' }] },
    [],
  );

  const [kpi] = await base44.entities.KPI.list('-last_updated', 100);

  assert.equal(kpi.name, 'Open findings', 'the pages read kpi.name, which is the label a human reads');
  assert.equal(kpi.key, 'open_findings', 'the raw key stays on the row so a lookup by key still works');
  assert.equal(kpi.current_value, 849, 'the pages read kpi.current_value');
  assert.equal(kpi.value, 849, 'the platform field is left intact');
  assert.equal(kpi.target_value, null, 'a null target stays null rather than becoming 0');
});

test('a one-row KPI response is not mistaken for an empty list', async () => {
  const { base44 } = await loadAdapter();
  stubFetch({ kpis: [{ key: 'critical_open', value: 0 }] }, []);

  const rows = await base44.entities.KPI.list('-last_updated', 100);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].current_value, 0, 'zero is a measurement, not an absence');
});

test('$in is expanded into one request per value and merged, because the API takes one value per field', async () => {
  const { base44 } = await loadAdapter();
  const seen = [];
  global.fetch = async (url) => {
    seen.push(String(url));
    const isOpen = /[?&]status=open(&|$)/.test(String(url));
    return {
      status: 200,
      ok: true,
      text: async () => JSON.stringify(isOpen ? [{ id: 'a', status: 'open' }] : [{ id: 'b', status: 'in_remediation' }]),
    };
  };

  const rows = await base44.entities.TriagedFinding.filter(
    { status: { $in: ['open', 'in_remediation'] } },
    '-cvss_score',
    200,
  );

  assert.equal(seen.length, 2, 'one request per value');
  assert.match(seen[0], /[?&]status=open(&|$)/);
  assert.match(seen[1], /[?&]status=in_remediation(&|$)/);
  assert.doesNotMatch(seen[0], /%5B|%22/, 'no JSON array reaches the API');
  assert.equal(rows.length, 2, 'both values are merged into one list');
  assert.deepEqual(rows.map((r) => r.id).sort(), ['a', 'b']);
});

test('summary reads the platform count instead of counting a page', async () => {
  const { base44 } = await loadAdapter();
  const seen = [];
  stubFetch({ total: 1002, open: 849, resolved: 139, critical: 0, high: 330 }, seen);

  const summary = await base44.entities.TriagedFinding.summary();

  assert.match(seen[0], /\/findings\/summary$/);
  assert.equal(summary.open, 849);
});

test('summary refuses where the platform publishes no count', async () => {
  const { base44 } = await loadAdapter();
  await assert.rejects(() => base44.entities.CloudAccount.summary());
});

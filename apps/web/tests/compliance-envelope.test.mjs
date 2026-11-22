/**
 * The dashboard read "0 frameworks, 0% avg" against a platform reporting 10 frameworks at 81.7.
 *
 * GET /compliance/frameworks answers with an envelope: {score_over_assessed, total_assessed, passing,
 * failing, ..., frameworks: [...]}, and each row carries score_over_assessed rather than score. The adapter
 * unwrapped only a fixed list of envelope key names and had no field map for this entity, so a populated
 * response reached the page as an empty list and the tile averaged undefined into 0%.
 *
 * These tests pin both halves: the envelope unwraps whatever its collection is called, and the row's score
 * arrives under the name the pages read.
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
  const dir = await mkdtemp(join(tmpdir(), 'compliance-envelope-'));
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

const ENVELOPE = {
  score_over_assessed: 81.7,
  total_assessed: 126,
  passing: 103,
  failing: 23,
  manual_unevidenced: 0,
  tenant_scoped: false,
  frameworks: [
    { framework: 'cis_v8', name: 'CIS Critical Security Controls v8', official_control_count: 153, assessed: 30, passing: 23, failing: 7, score_over_assessed: 76.7, coverage_pct: 19.6 },
    { framework: 'dora', name: 'DORA (EU) 2022/2554', official_control_count: 58, assessed: 9, passing: 9, failing: 0, score_over_assessed: 100, coverage_pct: 15.5 },
  ],
};

test('list() unwraps an envelope whose collection is not in the fixed key list', async () => {
  const { base44 } = await loadAdapter();
  stubFetch(ENVELOPE);
  const rows = await base44.entities.ComplianceFramework.list('-created_date', 10);
  assert.equal(rows.length, 2, 'a populated envelope must not arrive as an empty page');
  assert.equal(rows[0].framework, 'cis_v8');
});

test('a framework row carries its score under the name the pages read', async () => {
  const { base44 } = await loadAdapter();
  stubFetch(ENVELOPE);
  const rows = await base44.entities.ComplianceFramework.list('-created_date', 10);
  assert.equal(rows[0].score, 76.7, 'score must come from score_over_assessed');
  assert.equal(rows[1].score, 100);
  assert.equal(rows[0].total_controls, 153, 'total_controls must come from official_control_count');
});

test('summary() returns the platform aggregate rather than an average of per-framework rates', async () => {
  const { base44 } = await loadAdapter();
  stubFetch(ENVELOPE);
  const summary = await base44.entities.ComplianceFramework.summary();
  assert.equal(summary.score_over_assessed, 81.7);
  assert.equal(summary.total_assessed, 126);
  assert.equal(summary.frameworks.length, 2);
});

test('an object with two arrays is not guessed at', async () => {
  const { base44 } = await loadAdapter();
  stubFetch({ left: [{ id: 1 }], right: [{ id: 2 }] });
  const rows = await base44.entities.ComplianceFramework.list();
  assert.deepEqual(rows, [], 'two collections are ambiguous, so nothing is invented');
});

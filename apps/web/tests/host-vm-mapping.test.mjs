/**
 * The VM page's mapping, pinned.
 *
 * Measured 22 Nov 2026: no vm_findings or vm_scans table exists on this platform, while findings holds 60 OSV rows
 * for host packages served by GET /host/vulnerabilities. The page previously asked for both absent names and printed
 * "No VM findings found". These tests keep the real mapping and keep VMScan honestly refused.
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
    calls.push({ url: String(url), method: init.method || 'GET' });
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

const SUMMARY = {
  source: 'osv',
  basis: 'OSV advisories for the packages installed in the API virtualenv (/opt/gds-os/apps/api/venv)',
  total: 60,
  open: 5,
  resolved: 55,
  by_severity_open: { critical: 0, high: 3, medium: 2, low: 0 },
  kev_listed: 0,
  packages: 7,
  newest: '2026-11-19T04:46:00+00:00',
  oldest: '2026-11-14T04:40:00+00:00',
  not_measured: {
    instances_scanned: 'no VM or endpoint scan store exists on this platform; packages are read from the API virtualenv',
    endpoint_agents: 'no endpoint agent reports to this platform',
  },
};

const ROW = {
  id: '162',
  title: 'dnspython has excessive memory and CPU use',
  package: 'dnspython',
  severity: 'high',
  status: 'resolved',
  is_open: false,
  cve_id: 'CVE-2026-128089',
  cvss_score: null,
  epss_score: null,
  kev_listed: false,
  remediation: null,
  source: 'osv',
  detected_at: '2026-11-19T04:46:00+00:00',
  resolved_at: '2026-11-20T10:00:00+00:00',
};

test('VMFinding reads the host route and translates its own field names', async () => {
  const calls = stubFetch([{ count: 1, returned: 1, limit: 200, offset: 0, findings: [ROW] }]);
  const { base44 } = await loadAdapter();
  const rows = await base44.entities.VMFinding.list('-cvss_score', 200);
  assert.equal(calls[0].url, '/api/host/vulnerabilities?sort=-cvss_score&limit=200');
  assert.equal(rows.length, 1);
  // package -> package_name and kev_listed -> exploited_in_wild, so the table reads the builder's own names
  assert.equal(rows[0].package_name, 'dnspython');
  assert.equal(rows[0].exploited_in_wild, false);
  assert.equal(rows[0].cve_id, 'CVE-2026-128089');
  // a null stays null: no invented CVSS
  assert.equal(rows[0].cvss_score, null);
});

test('VMFinding.summary reads the host summary, including the named absences', async () => {
  const calls = stubFetch([SUMMARY]);
  const { base44 } = await loadAdapter();
  const sum = await base44.entities.VMFinding.summary();
  assert.equal(calls[0].url, '/api/host/summary');
  assert.equal(sum.total, 60);
  assert.equal(sum.open, 5);
  assert.equal(sum.not_measured.instances_scanned.includes('no VM or endpoint scan store'), true);
});

test('VMScan stays refused rather than mapped to a guess', async () => {
  stubFetch([]);
  const { base44 } = await loadAdapter();
  const scans = await base44.entities.VMScan.list('-scanned_at', 20);
  assert.deepEqual(scans, [], 'an absent store reads as an empty list, never as invented scans');
});

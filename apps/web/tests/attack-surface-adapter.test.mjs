/**
 * AttackSurface, mapped to a route that measures what it can and says so where it cannot.
 *
 * The tab was refused this name, and mapping it to /cloud/assets would have been worse than the banner:
 * CloudAssetOut carries no finding_count, no cve_count and no technology stack, so six of the card's
 * seven fields would have arrived undefined and the card rendered them as 0 and INTERNAL.
 *
 * These tests pin the path, the summary path, the unwrapping of the {assets: [...]} envelope, and the
 * three states that matter: true, false, and null-means-unknown.
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
  const dir = await mkdtemp(join(tmpdir(), 'surface-adapter-'));
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

const ASSETS = [
  {
    id: 'a1',
    name: 'subnet-0a1b',
    asset_type: 'subnet',
    provider: 'aws',
    region: 'eu-west-2',
    is_internet_facing: true,
    last_seen: '2026-11-22T09:00:00+00:00',
    finding_count: 2,
    cve_count: null,
    technologies: null,
    risk_level: 'high',
  },
  {
    id: 'a2',
    name: 'vpc-9f2c',
    asset_type: 'network',
    provider: 'aws',
    region: 'eu-west-2',
    is_internet_facing: null,
    last_seen: '2026-11-22T09:00:00+00:00',
    finding_count: 0,
    cve_count: null,
    technologies: null,
    risk_level: null,
  },
];

test('AttackSurface lists /cloud/attack-surface and unwraps the assets envelope', async () => {
  const calls = stubFetch([{ body: { assets: ASSETS, returned: 2, limit: 20, offset: 0, basis: {} } }]);
  const { base44 } = await loadAdapter();

  const rows = await base44.entities.AttackSurface.list('-last_seen', 20);

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/cloud\/attack-surface/);
  assert.equal(rows.length, 2, 'the envelope must be unwrapped, not treated as empty');
  assert.equal(rows[0].finding_count, 2);
});

test('an unknown exposure survives as null so the card can say EXPOSURE UNKNOWN', async () => {
  stubFetch([{ body: { assets: ASSETS } }]);
  const { base44 } = await loadAdapter();

  const rows = await base44.entities.AttackSurface.list();

  assert.equal(rows[0].is_internet_facing, true);
  assert.equal(rows[1].is_internet_facing, null, 'null must not be coerced to false, which renders as INTERNAL');
});

test('an unmeasured CVE count survives as null rather than becoming zero', async () => {
  stubFetch([{ body: { assets: ASSETS } }]);
  const { base44 } = await loadAdapter();

  const rows = await base44.entities.AttackSurface.list();

  assert.equal(rows[0].cve_count, null, 'cloud assets are not CVE-scanned; the card must print an em dash');
  assert.equal(rows[1].risk_level, null, 'no linked finding means no derived risk level');
});

test('summary reads its own route', async () => {
  const calls = stubFetch([{
    body: {
      assets: 145,
      with_known_exposure: 73,
      measured_internal: 0,
      exposure_unknown: 72,
      assets_with_linked_findings: 1,
      linked_findings: 3,
      basis: {},
    },
  }]);
  const { base44 } = await loadAdapter();

  const summary = await base44.entities.AttackSurface.summary();

  assert.match(calls[0].url, /\/cloud\/attack-surface\/summary$/);
  assert.equal(summary.assets, 145);
  assert.equal(summary.exposure_unknown, 72);
});

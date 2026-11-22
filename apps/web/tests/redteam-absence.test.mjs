/**
 * Red Team Command must not print a zero for a store that does not exist, and must not assert a coverage figure.
 *
 * Measured 22 Nov 2026: no attack-path, simulation, campaign or attack-finding table exists. OffensiveMetricsRow also
 * carried a hardcoded "MITRE Coverage 43%" with no basis anywhere on the platform.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SRC = new URL('../src/', import.meta.url);
const flat = (t) => t.replace(/\s+/g, ' ');

test('the metrics row carries no hardcoded coverage figure', async () => {
  const text = flat(await readFile(new URL('components/redteam/OffensiveMetricsRow.jsx', SRC), 'utf8'));
  assert.ok(!text.includes('43%'), 'a constant coverage figure is a fabricated measurement');
  assert.match(text, /mitreCoverage/);
  assert.match(text, /=== null \|\| value === undefined \? "—"/, 'an absent metric must render as an em dash');
});

test('capability tiles read a null as an absence', async () => {
  const text = flat(await readFile(new URL('components/redteam/HermesCapabilityTiles.jsx', SRC), 'utf8'));
  assert.match(text, /not recorded here/);
  assert.ok(!text.includes('${pathsMapped} paths mapped'), 'a null must not interpolate as "null paths mapped"');
});

test('the page passes real counts and nulls for absent stores', async () => {
  const text = flat(await readFile(new URL('pages/RedTeamCommandPage.jsx', SRC), 'utf8'));
  assert.match(text, /attackPaths=\{null\}/);
  assert.match(text, /exploitsValidated=\{null\}/);
  assert.match(text, /mitreCoverage=\{null\}/);
  assert.match(text, /overview\.engagements_total/);
  assert.match(text, /overview\.authorizations_total/);
});

test('the adapter serves the overview as a single object', async () => {
  const text = await readFile(new URL('api/base44Client.js', SRC), 'utf8');
  assert.match(text, /RedTeamOverview: \{ path: "\/red-team\/overview", single: true \}/);
  assert.match(text, /AuthorizedTarget: \{ path: "\/red-team\/targets" \}/);
});

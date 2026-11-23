/** Three surfaces claimed a clean result where nothing is measured. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SRC = new URL('../src/', import.meta.url);
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
const flat = (t) => t.replace(/\s+/g, ' ');

test('CloudAttackPath maps to the measured route with a summary', async () => {
  const text = await readFile(new URL('api/base44Client.js', SRC), 'utf8');
  assert.match(text, /CloudAttackPath: \{ path: "\/cloud\/attack-paths", summaryPath: "\/cloud\/attack-paths" \}/);
});

test('the attack path page offers no write and states the basis', async () => {
  // This used to read pages/cloud/AttackPathsPage.jsx, which App.jsx never imported: the route renders
  // pages/redteam/AttackPathsPage.jsx, so the assertions protected a dead twin. P0-6 retired the twin.
  const page = strip(await readFile(new URL('pages/redteam/AttackPathsPage.jsx', SRC), 'utf8'));
  assert.ok(!page.includes('CloudAttackPath.update'), 'there is nothing stored to mark mitigated');
  assert.ok(!page.includes('Mark as Mitigated'));
  assert.match(flat(page), /CloudAttackPath\.summary\(\)/);
  assert.match(flat(page), /absence of a path store/, 'the empty state must name the absence, not read as clean');
});

test('the pentest page names both absences instead of counting them', async () => {
  const page = flat(strip(await readFile(new URL('pages/redteam/PentestResultsPage.jsx', SRC), 'utf8')));
  assert.match(page, /Active attack paths", value: "not recorded"/);
  assert.match(page, /Simulations completed", value: "no simulation store"/);
  assert.ok(!page.includes('Attack paths our simulations proved reachable'));
});

test('the dashboard tiles read null as an absence', async () => {
  const row = flat(strip(await readFile(new URL('components/home/SecurityFeaturesRow.jsx', SRC), 'utf8')));
  assert.match(row, /attack paths not recorded/);
  assert.match(row, /runtime threats not recorded/);
  const cc = strip(await readFile(new URL('pages/CommandCenter.jsx', SRC), 'utf8'));
  assert.match(cc, /attackPaths: null/);
  assert.match(cc, /runtimeThreats: null/);
});

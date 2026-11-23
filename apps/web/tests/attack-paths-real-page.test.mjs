/** The routed attack-path page must read the real route, and no debug overlay may print stack traces. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SRC = new URL('../src/', import.meta.url);
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
const flat = (t) => t.replace(/\s+/g, ' ');

test('the routed page (pages/redteam) no longer calls a refused function', async () => {
  const page = strip(await readFile(new URL('pages/redteam/AttackPathsPage.jsx', SRC), 'utf8'));
  assert.ok(!page.includes('gdsHermesOffensive'), 'that function is not served');
  assert.match(flat(page), /CloudAttackPath\.list/);
  assert.match(flat(page), /CloudAttackPath\.summary\(\)/);
  assert.ok(!page.includes('No attack paths discovered yet'));
});

test('the page leaves no promise unhandled', async () => {
  const page = strip(await readFile(new URL('pages/redteam/AttackPathsPage.jsx', SRC), 'utf8'));
  const thens = (page.match(/\.then\(/g) || []).length;
  const catches = (page.match(/\.catch\(/g) || []).length;
  assert.ok(catches >= thens, `every then needs a catch: ${thens} then, ${catches} catch`);
});

test('index.html ships no diagnostic overlay', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.ok(!html.includes('unhandledrejection'), 'a stack trace must never be rendered to a user');
  assert.ok(!html.includes('gds-boot-error'));
  assert.ok(!html.includes('TEMPORARY DIAGNOSTIC'));
});

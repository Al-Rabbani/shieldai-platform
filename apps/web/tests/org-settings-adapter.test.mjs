/** The settings page must reach a real store through a PUT, and read a flat row. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SRC = new URL('../src/api/base44Client.js', import.meta.url);

test('OrgSettings maps to the settings route with a PUT upsert', async () => {
  const text = await readFile(SRC, 'utf8');
  assert.match(text, /path: "\/settings\/org"/);
  assert.match(text, /upsert: "PUT"/);
});

test('the adapter has an upsert and flattens a single-object envelope', async () => {
  const text = await readFile(SRC, 'utf8');
  assert.match(text, /async upsert\(data\)/);
  assert.match(text, /const singleRow = \(route, payload\)/);
  assert.ok(!text.includes('(route.single ? [payload] : rows(payload))'), 'every single-row read must unwrap');
});

test('the page no longer claims a save it cannot verify', async () => {
  const raw = await readFile(new URL('../src/pages/GDSSettingsPage.jsx', import.meta.url), 'utf8');
  const page = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!page.includes('.catch(() => {})'), 'comments name the old pattern; code must not carry it');
  assert.match(page, /OrgSettings\.upsert/);
});

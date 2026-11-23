/** The assignment page must reach a real store and a real apply action. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SRC = new URL('../src/', import.meta.url);
const flat = (t) => t.replace(/\s+/g, ' ');
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');

test('AssignmentRule is mapped with an apply action', async () => {
  const text = await readFile(new URL('api/base44Client.js', SRC), 'utf8');
  assert.match(text, /AssignmentRule: \{ path: "\/assignment-rules", actions: \["apply"\] \}/);
  assert.match(text, /async run\(action, body\)/);
});

test('the page applies through the adapter, not a promise', async () => {
  const page = strip(await readFile(new URL('pages/settings/AssignmentRulesPage.jsx', SRC), 'utf8'));
  assert.match(flat(page), /AssignmentRule\.run\("apply", \{ apply: true \}\)/);
  assert.ok(!page.includes('assigned on discovery'), 'nothing assigns on discovery');
  assert.match(flat(page), /never reassigned/);
});

test('the form collects match keys that exist', async () => {
  const form = flat(strip(await readFile(new URL('components/settings/AssignmentRuleForm.jsx', SRC), 'utf8')));
  assert.match(form, /match_severity/);
  assert.match(form, /match_source/);
  assert.ok(!form.includes('set("asset_type"'), 'a field that cannot match must not be collected');
});

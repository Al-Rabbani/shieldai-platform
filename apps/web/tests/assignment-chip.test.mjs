/** A card must not print UNDEFINED for a field the form no longer collects. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the rule chip reads the match keys and never prints UNDEFINED', async () => {
  const raw = await readFile(new URL('../src/pages/settings/AssignmentRulesPage.jsx', import.meta.url), 'utf8');
  const code = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!code.includes('rule.asset_type'), 'asset_type is no longer collected or returned');
  assert.match(code, /rule\.match_severity/);
  assert.match(code, /ANY SEVERITY/);
});

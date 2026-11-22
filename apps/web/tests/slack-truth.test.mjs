/**
 * No Slack identity is stored anywhere on this platform, so no surface may imply one is.
 *
 * Measured 22 Nov 2026: users carries no Slack column, there is no team_members table, and GET /team/members names
 * slack_user_id as not served. The escalation settings page still said "paste it here so alerts @-mention them" and
 * counted "0 of N with a Slack ID", and the risk thresholds page stated "The Slack member ID is stored on the team
 * member record" - a claim about a store that does not exist.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SRC = new URL('../src/', import.meta.url);
const flat = (text) => text.replace(/\s+/g, ' ');

test('the risk thresholds page no longer claims a stored Slack ID', async () => {
  const text = flat(await readFile(new URL('pages/RiskThresholdsPage.jsx', SRC), 'utf8'));
  assert.ok(!text.includes('Slack member ID is stored on the team member record'));
  assert.match(text, /No Slack member ID is stored for anyone on this platform/);
});

test('the escalation page invites nothing that cannot be saved', async () => {
  const text = flat(await readFile(new URL('pages/EscalationSettingsPage.jsx', SRC), 'utf8'));
  assert.ok(!text.includes('paste it here so alerts @-mention them'));
  assert.ok(!text.includes('with a Slack ID'), 'a count over an absent field is an absence dressed as a zero');
  assert.match(text, /no Slack identity is stored for any of them/);
  assert.match(text, /Nothing typed here is saved/);
});

test('the engineer list marks its save as not persisted', async () => {
  const text = flat(await readFile(new URL('components/settings/EngineerSlackList.jsx', SRC), 'utf8'));
  assert.match(text, /this platform holds no team member store/);
});

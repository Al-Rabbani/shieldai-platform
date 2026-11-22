/**
 * Item 12: the Co-Pilot intel rail.
 *
 * It rendered the top five findings by CVSS under the heading "Critical Findings" while the platform held ZERO open
 * critical findings (14 accepted_risk, 9 resolved); it counted active incidents as status "new"/"investigating" while
 * incidents are stored as "open", hiding two real ones; and its two unserved sources rendered as silence, which reads
 * as "no threats, no leaks".
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(here, '..', 'src/components/copilot/LiveIntelligencePanel.jsx'), 'utf8');

/* Comments stripped: the module's own comment names the old heading and the old status list. */
const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

test('a CVSS-sorted list is not called Critical Findings', () => {
  assert.ok(!code.includes('Critical Findings'), 'the misleading heading is back');
  assert.match(code, /Highest CVSS findings/);
});

test('every finding row states its own status', () => {
  assert.match(code, /f\.status/);
  assert.match(code, /replace\(\/_\/g, " "\)/);
});

test('the rail says the platform holds no open critical finding', () => {
  assert.match(code, /no open critical finding/i);
});

test('active incidents are counted as not-terminal, not by one expected status', () => {
  assert.match(code, /TERMINAL/);
  assert.ok(!code.includes('"investigating"'), 'the old status list is back');
});

test('unserved threat and dark-web sources are stated rather than left silent', () => {
  assert.match(code, /unavailableEntities/);
  assert.match(code, /ThreatIntelFeed/);
  assert.match(code, /DarkWebAlert/);
  assert.match(code, /That is an absence, not a quiet day/);
});

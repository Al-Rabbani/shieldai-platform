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

test('unserved sources are stated rather than left silent', () => {
  assert.match(code, /unavailableEntities/);
  assert.match(code, /DarkWebAlert/);
  /* ThreatIntelFeed IS served (/threat-intel/feed, item 31), so the rail no longer claims it is absent: it states that
   * its rows come from this tenant's own findings and that no advisory, malware, ransomware or dark-web feed exists. */
  assert.doesNotMatch(code, /No threat-intel feed is served here/);
  assert.match(code, /Derived from this tenant's own findings that carry a CVE/);
  assert.match(code, /No advisory, malware, ransomware or dark-web feed/);
  /* An empty rail still says something, but only after the reads settle, and only about the read: an in-flight empty
   * array must not state that the register holds nothing. */
  assert.match(code, /loaded && threats\.length === 0/);
  assert.match(code, /This read returned none, which is not the/);
  assert.doesNotMatch(code, /It is empty because no such finding is/);
});

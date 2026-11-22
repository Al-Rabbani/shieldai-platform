/**
 * Item 9: configuration drift and runtime posture.
 *
 * The runtime page headed itself "eBPF Security Engine" and showed three hardcoded tiles (8 rules active, 3/5 policies
 * enforced, 7 MITRE techniques mapped) over eight invented rule names, on a platform with no eBPF loader, syscall
 * monitor or policy enforcer. These assertions pin the honest version so the claim cannot come back, and pin the four
 * adapter maps that now have real routes behind them.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const code = (rel) => readFileSync(join(here, '..', rel), 'utf8');

test('the four drift and runtime names point at real routes', () => {
  const adapter = code('src/api/base44Client.js');
  assert.match(adapter, /ConfigurationDrift: \{ path: '\/drift\/findings' \}/);
  assert.match(adapter, /ConfigurationBaseline: \{ path: '\/drift\/baselines' \}/);
  assert.match(adapter, /DriftAlertConfig: \{ path: '\/drift\/config', single: true \}/);
  assert.match(adapter, /RuntimeThreat: \{ path: '\/runtime\/posture', summaryPath: '\/runtime\/summary' \}/);
});

test('the runtime page no longer claims an engine this platform does not have', () => {
  const page = code('src/pages/blueteam/RuntimeProtectionPage.jsx');
  assert.ok(!/eBPF Security Engine/i.test(page), 'the eBPF engine claim is back');
  assert.ok(!/8 eBPF Rules Active/.test(page), 'the hardcoded rule count is back');
  assert.ok(!/3\/5/.test(page), 'the hardcoded policy ratio is back');
  assert.ok(!/EBPFRuleList/.test(page), 'the invented rule list is imported again');
});

test('the invented rule list file is gone', () => {
  assert.equal(existsSync(join(here, '..', 'src/components/blueteam/EBPFRuleList.jsx')), false);
});

test('the runtime page states that no process-level sensor exists', () => {
  const page = code('src/pages/blueteam/RuntimeProtectionPage.jsx');
  assert.match(page, /no process-level (runtime )?sensor/i);
  assert.match(page, /RuntimeThreat\.summary\(\)/);
});

test('the runtime page counts what was inspected, not only what was found', () => {
  const page = code('src/pages/blueteam/RuntimeProtectionPage.jsx');
  assert.match(page, /Containers Inspected/);
  assert.match(page, /summary\?\.with_violations/);
});

test('the drift page names the baseline its rows were measured against', () => {
  const page = code('src/pages/ConfigurationDriftPage.jsx');
  assert.match(page, /ConfigurationBaseline\.list/);
  assert.match(page, /has not been approved yet/);
  assert.match(page, /A row appears only when a measured value differs/);
});

/**
 * Item 10: the AI security page read columns nobody measured.
 *
 * It rendered provider_name, eu_ai_act_risk_class, prompt_injection_susceptibility, jailbreak_susceptibility and
 * hallucination_rate_pct over a platform with no susceptibility testing and no hallucination detector. These assertions
 * pin the honest version and the four adapter maps that now have real routes behind them.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import test from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const code = (rel) => readFileSync(join(here, '..', rel), 'utf8');

test('the four AI names point at real routes', () => {
  const adapter = code('src/api/base44Client.js');
  assert.match(adapter, /AIModel: \{ path: '\/ai\/models', summaryPath: '\/ai\/summary' \}/);
  assert.match(adapter, /PromptAttack: \{ path: '\/ai\/attacks' \}/);
  assert.match(adapter, /JailbreakAttempt: \{ path: '\/ai\/jailbreaks' \}/);
  assert.match(adapter, /AIPolicy: \{ path: '\/ai\/policies' \}/);
});

test('the page no longer asks for columns that cannot be measured', () => {
  const page = code('src/pages/dashboards/AISecurityPage.jsx');
  for (const field of ['provider_name', 'eu_ai_act_risk_class', 'prompt_injection_susceptibility',
                       'jailbreak_susceptibility', 'hallucination_rate_pct']) {
    assert.ok(!page.includes(field), `${field} is back`);
  }
});

test('hallucination is stated as unmeasured rather than drawn as zero', () => {
  const page = code('src/pages/dashboards/AISecurityPage.jsx');
  assert.match(page, /Not measured here/);
  assert.match(page, /no hallucination detector/i);
  assert.ok(!/Hallucination\.list/.test(page), 'the absent store is still queried as if it existed');
});

test('the page reads the platform summary rather than counting a page', () => {
  const page = code('src/pages/dashboards/AISecurityPage.jsx');
  assert.match(page, /AIModel\.summary\(\)/);
  assert.match(page, /summary\?\.guard\?\.scope/);
});

test('a refused attack and an allowed one are distinguishable on the page', () => {
  const page = code('src/pages/dashboards/AISecurityPage.jsx');
  assert.match(page, /REFUSED/);
  assert.match(page, /ALLOWED \+ RECORDED/);
});

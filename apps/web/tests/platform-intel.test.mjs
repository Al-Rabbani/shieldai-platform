/**
 * Item 14: the shell's intelligence strip.
 *
 * It called gdsMasterOrchestrator {action:"platform_intel"} on every page load, which has no route here, so the header
 * showed dashes everywhere. These tests stub fetch and pin both halves: platform_intel reads the real aggregate, and
 * execute is refused rather than being pointed at a bridge endpoint that would need the shared key in the browser.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { base44 } from '../src/api/base44Client.js';

function stubFetch(payload = {}) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(payload),
      json: async () => payload,
    };
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

test('platform_intel reads the real aggregate over GET', async () => {
  const stub = stubFetch({ risk: { score: 76.2, grade: 'C' }, defensive: { vuln_total: 849 } });
  try {
    const res = await base44.functions.invoke('gdsMasterOrchestrator', { action: 'platform_intel' });
    assert.equal(stub.calls.length, 1);
    assert.match(stub.calls[0].url, /\/api\/platform\/intel$/);
    assert.equal(stub.calls[0].method, 'GET');
    assert.equal(stub.calls[0].body, null, 'a GET must not carry the action payload as a body');
    assert.equal(res.data.risk.score, 76.2);
  } finally {
    stub.restore();
  }
});

test('the strip payload carries the fields the shell renders', async () => {
  const payload = {
    risk: { score: 76.2, grade: 'C', trend: 'degrading' },
    defensive: {
      cloud_open: 0, cloud_critical: 0, vuln_total: 849, vuln_critical: 0,
      exploited_in_wild: 0, compliance_avg: 81.7,
    },
    basis: { cloud_open: 'absence, not a clean cloud' },
  };
  const stub = stubFetch(payload);
  try {
    const { data } = await base44.functions.invoke('gdsMasterOrchestrator', { action: 'platform_intel' });
    for (const k of ['cloud_open', 'cloud_critical', 'vuln_total', 'vuln_critical', 'exploited_in_wild', 'compliance_avg']) {
      assert.ok(k in data.defensive, `shell reads defensive.${k}`);
    }
    assert.ok('score' in data.risk && 'grade' in data.risk);
    assert.ok(data.basis && Object.keys(data.basis).length > 0, 'a zero must arrive with its basis');
  } finally {
    stub.restore();
  }
});

test('execute is refused, not pointed at the bridge', async () => {
  const stub = stubFetch({});
  try {
    await assert.rejects(
      () => base44.functions.invoke('gdsMasterOrchestrator', { action: 'execute', agent_id: 'ai-vuln-director', task: 'x' }),
      (err) => /gdsMasterOrchestrator\.execute/.test(err.message) && /not served|NotOnThisPlatform|Function/i.test(err.message),
    );
    assert.equal(stub.calls.length, 0, 'no request may leave the browser for a refused action');
  } finally {
    stub.restore();
  }
});

/**
 * Step 18: the billing mapping must reach the platform's own routes, and nothing else.
 *
 * Three things are worth locking down here, each a mistake that would be invisible in a build:
 *   1. a read must be a GET to the route the API actually serves (/billing/plans, not /plans);
 *   2. checkout must POST the plan tier under the name the API expects (plan_tier), because the page's job is
 *      to start a real Stripe session and a wrong field name is a 422 the customer reads as "payment broken";
 *   3. a failed read must surface the server's message rather than resolve with an invented subscription.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const SOURCE = new URL('../src/api/base44Client.js', import.meta.url);

async function loadAdapter() {
  const source = await readFile(SOURCE, 'utf8');
  const dir = await mkdtemp(join(tmpdir(), 'billing-adapter-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  return import(pathToFileURL(file).href);
}

function stubFetch(responses) {
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET', body: init.body });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected fetch: ${url}`);
    return {
      ok: next.status === undefined || next.status < 400,
      status: next.status ?? 200,
      json: async () => next.body,
      text: async () => JSON.stringify(next.body),
    };
  };
  return calls;
}

test('plans and quota read the platform billing routes', async () => {
  const { base44 } = await loadAdapter();
  const calls = stubFetch([
    { body: { plans: [{ tier: 'starter' }], currency: 'GBP', symbol: '£' } },
    { body: { tier: 'starter', period: 'month', limits: {}, usage: {}, decisions: {} } },
  ]);
  const plans = await base44.billing.plans();
  const quota = await base44.billing.quota();
  assert.equal(plans.plans[0].tier, 'starter');
  assert.equal(quota.tier, 'starter');
  assert.match(calls[0].url, /\/billing\/plans$/);
  assert.match(calls[1].url, /\/billing\/quota$/);
  assert.equal(calls[0].method, 'GET');
});

test('checkout posts the tier as plan_tier', async () => {
  const { base44 } = await loadAdapter();
  const calls = stubFetch([{ body: { checkout_url: 'https://checkout.stripe.com/c/pay/x', session_id: 'cs_test_1' } }]);
  const result = await base44.billing.checkout('professional');
  assert.match(result.checkout_url, /^https:\/\/checkout\.stripe\.com\//);
  assert.match(calls[0].url, /\/billing\/checkout$/);
  assert.equal(calls[0].method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].body), { plan_tier: 'professional' });
});

test('portal and cancel post to their own routes', async () => {
  const { base44 } = await loadAdapter();
  const calls = stubFetch([
    { body: { portal_url: 'https://billing.stripe.com/p/session/x' } },
    { body: { status: 'canceled' } },
  ]);
  await base44.billing.portal();
  await base44.billing.cancel(true);
  assert.match(calls[0].url, /\/billing\/portal$/);
  assert.equal(calls[0].method, 'POST');
  assert.match(calls[1].url, /\/billing\/cancel$/);
  assert.deepEqual(JSON.parse(calls[1].body), { immediate: true });
});

test('a failed subscription read surfaces the server message', async () => {
  const { base44 } = await loadAdapter();
  stubFetch([{ status: 503, body: { detail: 'Stripe not configured. Contact admin.' } }]);
  await assert.rejects(() => base44.billing.subscription(), /Stripe not configured/);
});

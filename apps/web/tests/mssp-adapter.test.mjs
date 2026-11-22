/**
 * The MSSP reads: one production customer, the provider excluded, and no invented revenue.
 *
 * These pin the four things that were wrong: three entity names pointed at nothing, the customers payload has two
 * array properties so it must be unwrapped by its own key name rather than guessed, revenue is one object with
 * nulls when no subscription row exists (the page had defaulted that null to 0 and printed "$0K MRR"), and health
 * arrives as a state with a reason rather than a score out of nothing.
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
  const dir = await mkdtemp(join(tmpdir(), 'mssp-adapter-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  return import(pathToFileURL(file).href);
}

function stubFetch(responses) {
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected fetch: ${url}`);
    return {
      ok: next.ok ?? true,
      status: next.status ?? 200,
      headers: { get: () => 'application/json' },
      json: async () => next.body,
      text: async () => (next.body === undefined ? '' : JSON.stringify(next.body)),
    };
  };
  return calls;
}

const CUSTOMER = {
  tenant_id: 't1',
  slug: 'president-59c5e6',
  name: 'president@rabgifgroupltd.com',
  display_name: 'president@rabgifgroupltd.com',
  plan_tier: 'trial',
  subscription_status: 'trialing',
  onboarding_status: 'complete',
  onboarded_at: '2026-11-19T18:39:15+00:00',
  services_provisioned: ['monitoring', 'vulnerability_management', 'compliance_reporting'],
  active_users: 1,
  findings: 0,
  critical_findings: 0,
  missions: 0,
  environment: 'production',
  health: { status: 'not_assessed', reason: 'no telemetry of its own' },
};

const BOOK = {
  customers: [CUSTOMER],
  count: 1,
  onboarded: 1,
  assessed: 0,
  provider_tenant: { tenant_id: 'p1', slug: 'gds', display_name: 'GDSA Radar' },
  non_production: [{ slug: 'test-user-269c6d', name: 'Test User', environment: 'test' }],
  non_production_count: 1,
  note: 'health is derived from each customer own telemetry',
};

test('CustomerTenant reads /mssp/customers and unwraps the customers array, not non_production', async () => {
  const calls = stubFetch([{ body: BOOK }]);
  const { base44 } = await loadAdapter();

  const rows = await base44.entities.CustomerTenant.list('-created_date', 50);

  assert.match(calls[0].url, /\/mssp\/customers/);
  assert.equal(rows.length, 1, 'two arrays are present, so the key name must decide');
  assert.equal(rows[0].slug, 'president-59c5e6');
  assert.equal(rows[0].customer_name, 'president@rabgifgroupltd.com', 'the page renders customer_name');
  assert.equal(rows[0].health.status, 'not_assessed', 'a customer with no scans is not given a score');
});

test('ManagedService reads /mssp/services and keeps the absence list out of the rows', async () => {
  const calls = stubFetch([{
    body: {
      services: [{ id: 'president-59c5e6:monitoring', customer_name: 'president@rabgifgroupltd.com', service_name: 'monitoring' }],
      count: 1,
      customers_covered: 1,
      not_measured: ['events_30d', 'alerts_30d', 'uptime_pct', 'sla_met', 'health_score', 'automation_rate_pct'],
      note: 'no per-service telemetry',
    },
  }]);
  const { base44 } = await loadAdapter();

  const rows = await base44.entities.ManagedService.list('-created_date', 50);

  assert.match(calls[0].url, /\/mssp\/services/);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].service_name, 'monitoring');
});

test('RevenueReport is one object wrapped as a single row, with a null MRR kept null', async () => {
  const calls = stubFetch([{
    body: {
      currency: 'GBP',
      mrr_gbp: null,
      arr_gbp: null,
      nrr_pct: null,
      active_subscriptions: 0,
      total_subscriptions: 0,
      basis: "sum of billing_subscriptions.monthly_amount_gbp where status='active'",
      note: 'no subscription row exists for this tenant, so revenue is not measured rather than zero',
    },
  }]);
  const { base44 } = await loadAdapter();

  const rows = await base44.entities.RevenueReport.list('-created_date', 1);

  assert.match(calls[0].url, /\/mssp\/revenue/);
  assert.equal(rows.length, 1, 'a single object must still arrive as one row');
  assert.equal(rows[0].mrr_gbp, null, 'null must survive as null so the page can say not measured');
  assert.equal(rows[0].active_subscriptions, 0, 'zero subscriptions is a measured zero');
  assert.ok(rows[0].basis, 'the basis travels with the number');
});

test('base44.mssp.overview returns the payload whole, keeping the counts and exclusion reasons', async () => {
  const calls = stubFetch([{ body: BOOK }]);
  const { base44 } = await loadAdapter();

  const book = await base44.mssp.overview();

  assert.match(calls[0].url, /\/mssp\/customers$/);
  assert.equal(book.count, 1, 'the count must survive; unwrapping would have dropped it');
  assert.equal(book.non_production_count, 1, 'and the excluded fixtures must be stated, not dropped');
  assert.equal(book.provider_tenant.slug, 'gds');
  assert.ok(book.note);
});

test('base44.mssp.services and revenue read their own routes', async () => {
  const calls = stubFetch([
    { body: { services: [], count: 0, not_measured: [] } },
    { body: { mrr_gbp: null } },
  ]);
  const { base44 } = await loadAdapter();

  await base44.mssp.services();
  await base44.mssp.revenue();

  assert.match(calls[0].url, /\/mssp\/services$/);
  assert.match(calls[1].url, /\/mssp\/revenue$/);
});

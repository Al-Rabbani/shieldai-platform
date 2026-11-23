/**
 * Tests for the API adapter, run with node --test and no new dependency.
 *
 * The adapter is the single file 799 frontend files read their data through, so a regression in it is
 * a regression everywhere at once. These tests exist to lock in the three behaviours that were each
 * found by a real failure in this session:
 *
 *   1. A refused entity must say so and must not fabricate a row.
 *   2. A refused function must throw, never resolve with an invented object.
 *   3. Sign-in must post to the platform's own /auth/login and must surface the server's message
 *      instead of a generic "Invalid email or password", which is what made a working password look
 *      broken.
 *
 * The adapter is copied to a .mjs file before import because the app's package.json does not declare
 * "type": "module", and adding that to a React build to satisfy a test would be the tail wagging the dog.
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
  const dir = await mkdtemp(join(tmpdir(), 'adapter-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  return import(pathToFileURL(file).href);
}

/** Records every request and answers from a queue, so no network is involved. */
function stubFetch(responses) {
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET', body: init.body, credentials: init.credentials });
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

test('a refused entity returns nothing and records its name', async () => {
  const { base44, unavailableEntities } = await loadAdapter();
  /* DarkWebAlert used to stand here, but item 37 gave it a route (GET /intel/dark-web) that refuses in words. An entity
   * with no route at all is the case this test is about, and SecretLeakageAlert is one: no secret scanner exists. */
  const rows = await base44.entities.SecretLeakageAlert.list();
  assert.deepEqual(rows, []);
  assert.ok(unavailableEntities().includes('SecretLeakageAlert'));
});

test('a refused entity refuses to write', async () => {
  const { base44 } = await loadAdapter();
  await assert.rejects(() => base44.entities.DarkWebAlert.create({ title: 'x' }), /not served/i);
});

test('a refused function throws instead of inventing a result', async () => {
  const { base44 } = await loadAdapter();
  await assert.rejects(() => base44.functions.invoke('gdsDataFabric', {}), /not served/i);
});

test('a mapped entity calls its real path and translates field names', async () => {
  const calls = stubFetch([
    {
      body: [
        { id: 1, title: 'CVE in nginx', severity: 'high', cve: 'CVE-2026-1', target: 'api.example.com', cvss: 7.5, epss: 0.2, kev_listed: true },
      ],
    },
  ]);
  const { base44 } = await loadAdapter();
  const [row] = await base44.entities.TriagedFinding.list('-detected_at', 500);

  assert.equal(calls[0].url, '/api/findings?sort=-detected_at&limit=500');
  assert.equal(calls[0].credentials, 'same-origin');
  // The pages read these names; the API returns the others.
  assert.equal(row.normalized_severity, 'high');
  assert.equal(row.cve_id, 'CVE-2026-1');
  assert.equal(row.asset_name, 'api.example.com');
  assert.equal(row.cvss_score, 7.5);
  assert.equal(row.epss_score, 0.2);
  assert.equal(row.exploited_in_wild, true);
});

test('sign-in posts to the platform login with the credential in the body', async () => {
  const calls = stubFetch([{ body: { user_id: 'u1', email: 'a@b.c' } }]);
  const { base44 } = await loadAdapter();
  await base44.auth.loginViaEmailPassword('a@b.c', 'secret');

  assert.equal(calls[0].url, '/api/auth/login');
  assert.equal(calls[0].method, 'POST');
  assert.equal(calls[0].credentials, 'include');
  assert.deepEqual(JSON.parse(calls[0].body), { email: 'a@b.c', password: 'secret' });
});

test('a refused sign-in surfaces the server message, not a generic one', async () => {
  stubFetch([{ status: 401, body: { detail: 'Invalid email or password' } }]);
  const { base44 } = await loadAdapter();
  await assert.rejects(
    () => base44.auth.loginViaEmailPassword('a@b.c', 'wrong'),
    (error) => {
      assert.equal(error.message, 'Invalid email or password');
      assert.equal(error.status, 401);
      return true;
    },
  );
});

test('mfa_code is only sent when one is supplied', async () => {
  const calls = stubFetch([{ body: {} }, { body: {} }]);
  const { base44 } = await loadAdapter();
  await base44.auth.loginViaEmailPassword('a@b.c', 'secret');
  await base44.auth.loginViaEmailPassword('a@b.c', 'secret', '123456');
  assert.deepEqual(JSON.parse(calls[0].body), { email: 'a@b.c', password: 'secret' });
  assert.deepEqual(JSON.parse(calls[1].body), { email: 'a@b.c', password: 'secret', mfa_code: '123456' });
});

test('signed out is a state, not an error', async () => {
  stubFetch([{ status: 401, body: { detail: 'Not authenticated' } }]);
  const { base44 } = await loadAdapter();
  assert.equal(await base44.auth.isAuthenticated(), false);
});

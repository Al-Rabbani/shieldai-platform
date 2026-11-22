/**
 * The admin portal sources, mapped end to end.
 *
 * Step 10 built the /admin API and step 15 pointed the pages at it. These tests exist for the two ways that
 * mapping can lie:
 *   1. Returning rows that look complete when the request was never made (Tenant has no list endpoint by
 *      design, so it must refuse rather than borrow another source).
 *   2. Presenting a real value under the wrong name, or inventing one. created_at must reach the pages as
 *      created_date, scopes as permissions, and a permission string as { id, name, display_name } - the same
 *      value three ways, which is a rename, not a fabrication.
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
  const dir = await mkdtemp(join(tmpdir(), 'admin-adapter-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  return import(pathToFileURL(file).href);
}

function stubFetch(responses) {
  const calls = [];
  global.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET' });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected fetch: ${url}`);
    return {
      ok: next.ok ?? true,
      status: next.status ?? 200,
      headers: { get: () => 'application/json' },
      json: async () => next.body,
      text: async () => JSON.stringify(next.body),
    };
  };
  return calls;
}

test('User reads the admin endpoint and carries created_date', async () => {
  const calls = stubFetch([{
    body: [{
      id: '2b0d4c22-2c1c-4f2e-9d0f-0d3a1c6b7e11',
      email: 'president@globaldigitalstreams.com',
      role: 'admin',
      is_active: true,
      created_at: '2026-06-20T09:00:00Z',
      mfa_enabled: false,
    }],
  }]);
  const { base44 } = await loadAdapter();
  const rows = await base44.entities.User.list();

  assert.match(calls[0].url, /\/admin\/users$/);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].created_date, '2026-06-20T09:00:00Z');
  assert.equal(rows[0].role, 'admin');
  assert.equal(
    rows[0].full_name,
    undefined,
    'users has no name column, so a name must not be invented for the page to print',
  );
});

test('ApiKey presents scopes as permissions and keeps is_active', async () => {
  const calls = stubFetch([{
    body: [{
      id: 'c1',
      name: 'ci pipeline',
      key_prefix: 'gds_abcd1234',
      scopes: ['findings:read'],
      is_active: false,
      created_at: '2026-11-22T04:00:00Z',
      revoked_at: '2026-11-22T04:30:00Z',
    }],
  }]);
  const { base44 } = await loadAdapter();
  const [key] = await base44.entities.ApiKey.list();

  assert.match(calls[0].url, /\/admin\/api-keys$/);
  assert.deepEqual(key.permissions, ['findings:read']);
  assert.equal(key.is_active, false);
  assert.equal(key.created_date, '2026-11-22T04:00:00Z');
  assert.equal(key.expires_at, undefined, 'api_keys has no expiry, so none may appear');
});

test('Permission unwraps the permissions key and names each string', async () => {
  const calls = stubFetch([{ body: { permissions: ['users:manage', 'findings:read'], count: 2 } }]);
  const { base44 } = await loadAdapter();
  const rows = await base44.entities.Permission.list();

  assert.match(calls[0].url, /\/admin\/permissions$/);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { id: 'users:manage', name: 'users:manage', display_name: 'users:manage' });
});

test('Role reads the roles endpoint', async () => {
  const calls = stubFetch([{ body: [{ id: 'r1', name: 'admin', permissions: ['users:manage'], member_count: 1 }] }]);
  const { base44 } = await loadAdapter();
  const [role] = await base44.entities.Role.list();

  assert.match(calls[0].url, /\/admin\/roles$/);
  assert.equal(role.member_count, 1);
});

test('Tenant still refuses instead of presenting one scoped row as a list', async () => {
  const calls = stubFetch([]);
  const { base44 } = await loadAdapter();
  const rows = await base44.entities.Tenant.list();

  assert.deepEqual(rows, []);
  assert.equal(calls.length, 0, 'no request may be made for a source with no list endpoint');
});

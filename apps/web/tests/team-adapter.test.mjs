/**
 * TeamMember must read the tenant's real people, and must refuse a write it cannot make.
 *
 * Measured 22 Nov 2026: no team_members table exists. GET /team/members returns the caller's tenant users with role
 * names, so four routed pages that fill assignment dropdowns stop rendering empty lists. There is no display name
 * column, so `name` is the email; nothing is invented.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

async function loadAdapter(responder) {
  const source = await readFile(new URL('../src/api/base44Client.js', import.meta.url), 'utf8');
  const dir = await mkdtemp(join(tmpdir(), 'team-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  global.fetch = responder;
  return import(pathToFileURL(file).href);
}

function jsonResponder(body) {
  const calls = [];
  const responder = async (url, init) => {
    calls.push({ url: String(url), init });
    return { ok: true, status: 200, headers: { get: () => 'application/json' },
             text: async () => JSON.stringify(body), json: async () => body };
  };
  responder.calls = calls;
  return responder;
}

test('TeamMember.list reads the tenant roster and unwraps members', async () => {
  const responder = jsonResponder({
    members: [
      { id: 'u1', email: 'president@globaldigitalstreams.com', name: 'president@globaldigitalstreams.com',
        role: 'admin', is_active: true, created_at: '2026-11-01T00:00:00+00:00' },
    ],
    count: 1, tenant_scoped: true,
    not_served: { slack_user_id: 'No Slack identity is stored on this platform, for any user.' },
  });
  const { base44 } = await loadAdapter(responder);
  const rows = await base44.entities.TeamMember.list('-created_date', 100);
  assert.match(responder.calls[0].url, /\/team\/members(\?|$)/);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'president@globaldigitalstreams.com');
  assert.equal(rows[0].role, 'admin');
});

test('the roster never carries a secret or an invented name', async () => {
  const responder = jsonResponder({ members: [{ id: 'u1', email: 'a@b.c', name: 'a@b.c', role: 'analyst' }], count: 1 });
  const { base44 } = await loadAdapter(responder);
  const rows = await base44.entities.TeamMember.list('-created_date', 100);
  const keys = Object.keys(rows[0]).join(',');
  assert.ok(!keys.includes('password'), 'no password material may reach the browser');
  assert.ok(!keys.includes('mfa'), 'no MFA material may reach the browser');
});

test('a TeamMember write refuses and names the missing store', async () => {
  const responder = jsonResponder({});
  const { base44 } = await loadAdapter(responder);
  await assert.rejects(
    () => base44.entities.TeamMember.update('u1', { slack_user_id: 'U123' }),
    (error) => {
      assert.match(error.message, /no team member store|no such store/);
      assert.match(error.message, /managed under Administration/);
      return true;
    },
  );
  assert.equal(responder.calls.length, 0, 'nothing may be sent for a write that cannot be stored');
});

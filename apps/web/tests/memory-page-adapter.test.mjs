/**
 * Item 41: the memory page's three calls must hit the real routes, with the right method and body.
 *
 * These assert on the request the adapter actually builds, not on the value it returns, because the earlier
 * reverse-map defect in this codebase was invisible from the return value alone.
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
  const dir = await mkdtemp(join(tmpdir(), 'adapter-memory-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  return import(pathToFileURL(file).href);
}

function stubFetch(payload, status = 200) {
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET', body: options.body });
    return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
  };
  return calls;
}

test('memories() reads the store the planner is given', async () => {
  const calls = stubFetch({ count: 1, memories: [{ id: 'm1', kind: 'preference', key: 'briefing_style', value: 'Lead with the number.' }] });
  const { base44 } = await loadAdapter();
  const result = await base44.platform.memories();
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.endsWith('/copilot/memory'), `expected /copilot/memory, got ${calls[0].url}`);
  assert.equal(calls[0].method, 'GET');
  assert.equal(result.memories[0].key, 'briefing_style');
});

test('remember() posts the kind, key and value the store expects', async () => {
  const calls = stubFetch({ id: 'm2', created: true });
  const { base44 } = await loadAdapter();
  await base44.platform.remember({ kind: 'instruction', key: 'always_check_kev', value: 'Check KEV first.' });
  assert.ok(calls[0].url.endsWith('/copilot/memory'));
  assert.equal(calls[0].method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].body), { kind: 'instruction', key: 'always_check_kev', value: 'Check KEV first.' });
});

test('forget() deletes by id and never falls back to a bare collection delete', async () => {
  const calls = stubFetch({ deleted: true, id: 'm3' });
  const { base44 } = await loadAdapter();
  await base44.platform.forget('m3');
  assert.ok(calls[0].url.endsWith('/copilot/memory/m3'), `expected the id in the path, got ${calls[0].url}`);
  assert.equal(calls[0].method, 'DELETE');
});

test('a refusal is surfaced rather than reported as success', async () => {
  stubFetch({ detail: 'No memory with that id belongs to this tenant' }, 404);
  const { base44 } = await loadAdapter();
  await assert.rejects(() => base44.platform.forget('nope'), /No memory with that id belongs to this tenant/);
});

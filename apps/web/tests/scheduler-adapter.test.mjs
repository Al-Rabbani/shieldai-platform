/** Item 42: the scheduler page's calls must reach the real routes with the right method. */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const SOURCE = new URL('../src/api/base44Client.js', import.meta.url);

async function loadAdapter() {
  const source = await readFile(SOURCE, 'utf8');
  const dir = await mkdtemp(join(tmpdir(), 'adapter-sched-'));
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

test('scheduler() reads the loop status', async () => {
  const calls = stubFetch({ scheduler: { exists: true }, entries: [], runs: [] });
  const { base44 } = await loadAdapter();
  const out = await base44.platform.scheduler();
  assert.ok(calls[0].url.endsWith('/copilot/scheduler'));
  assert.equal(calls[0].method, 'GET');
  assert.equal(out.scheduler.exists, true);
});

test('pauseSchedule posts to the named schedule, url-encoded', async () => {
  const calls = stubFetch({ paused: true });
  const { base44 } = await loadAdapter();
  await base44.platform.pauseSchedule('platform posture/check');
  assert.ok(calls[0].url.endsWith('/copilot/scheduler/platform%20posture%2Fcheck/pause'), calls[0].url);
  assert.equal(calls[0].method, 'POST');
});

test('resumeSchedule posts to the resume route', async () => {
  const calls = stubFetch({ paused: false, interval_seconds: 21600 });
  const { base44 } = await loadAdapter();
  const out = await base44.platform.resumeSchedule('platform-posture-check');
  assert.ok(calls[0].url.endsWith('/copilot/scheduler/platform-posture-check/resume'));
  assert.equal(calls[0].method, 'POST');
  assert.equal(out.interval_seconds, 21600);
});

test('a 403 on a control is surfaced, never reported as applied', async () => {
  stubFetch({ detail: 'Missing permission: scheduler:write' }, 403);
  const { base44 } = await loadAdapter();
  await assert.rejects(() => base44.platform.pauseSchedule('x'), /Missing permission: scheduler:write/);
});

/**
 * P0-2: a page that asks for a store the platform does not have must SAY SO, per page.
 *
 * MEASURED 23 Nov 2026: 44 entity names are asked for by routed modules with no route behind them at 58 call
 * sites, and 31 of those modules rendered the empty result silently - "No business units", "No teams", "0
 * alerts" over a store that does not exist. The adapter already returned [] and recorded the name, but the
 * banner that reads that record was session-wide and mounted on one page of 102, so nothing reached the screen.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const SRC = new URL('../src/', import.meta.url);
const read = (p) => readFile(new URL(p, SRC), 'utf8');
const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '');

test('the adapter can clear its refusal record, which is what makes a per-page note possible', async () => {
  const text = await read('api/base44Client.js');
  assert.match(text, /export function resetUnavailable\(\)/);
  assert.match(text, /unmapped\.clear\(\)/);
  // the existing reader must survive: pages that state an absence themselves still use it
  assert.match(text, /export function unavailableEntities\(\)/);
});

test('the shell remounts the banner on every navigation', async () => {
  const shell = await read('components/platform/PlatformShell.jsx');
  assert.match(shell, /<DataAvailabilityBanner key=\{location\.pathname\} pathname=\{location\.pathname\} \/>/);
  assert.match(shell, /useLocation/);
});

test('the banner speaks about this page, not the whole app', async () => {
  const banner = strip(await read('components/platform/DataAvailabilityBanner.jsx'));
  assert.match(banner, /export default function DataAvailabilityBanner\(\{ pathname \}\)/);
  assert.match(banner, /unavailableEntities\(\)/);
  assert.match(banner, /asked for/);
  assert.ok(!banner.includes('this app are not served'), 'the session-wide wording must be gone');
  // two samples, because a slow request that lands after the first is still this page's absence
  assert.match(banner, /setTimeout\(read, 900\)/);
  assert.match(banner, /setTimeout\(read, 3200\)/);
  assert.ok(!banner.includes('Math.random'), 'an absence note must not animate over invented data');
});

test('the banner cannot be dismissed into silence without leaving a marker', async () => {
  const banner = strip(await read('components/platform/DataAvailabilityBanner.jsx'));
  assert.match(banner, /setHidden\(true\)/);
  assert.match(banner, /collapse/);
  assert.match(banner, /asked for here are not served/);
});

test('the worst page no longer claims measured emptiness over five absent stores', async () => {
  const page = await read('pages/dashboards/OrganizationManagementPage.jsx');
  for (const claim of ['message="No business units"', 'message="No teams"', 'message="No MSSP clients"']) {
    assert.ok(!page.includes(claim), `${claim} reads as a measured zero`);
  }
  assert.match(page, /No business-unit store on this platform/);
  assert.match(page, /No team store on this platform/);
  assert.match(page, /\/mssp\/customers serves the real five/);
});

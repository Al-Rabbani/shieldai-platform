/**
 * The six functions still refused from routed pages, each refused with a measured reason.
 *
 * Measured 22 Nov 2026, before writing a word of this file:
 *   - gdsScheduledReports (5 call sites), saveReportToDrive and gdsCompliancePortalSync all need Google Drive or an
 *     external portal, and this host holds no Google service account.
 *   - gdsApplyRiskScoring: cloud_assets has no risk_score/base_risk_score column, 0 of 145 assets join to any finding
 *     by name, and the seven weighted types do not occur among the ten measured categories (subnet 56, network 17,
 *     security_group 17, region 17, firewall 17 ...).
 *   - gdsDataFabric: data_sources, data_catalog, data_lakes and data_quality_rules do not exist as tables.
 *   - gdsCleanup: called on EVERY page load by PlatformContext and its failure swallowed; there is no such function
 *     and nothing to clean, so it only added a name to the unserved list the availability banner reads.
 */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const SRC = new URL('../src/', import.meta.url);
const ADAPTER = new URL('api/base44Client.js', SRC);

async function loadAdapter() {
  const source = await readFile(ADAPTER, 'utf8');
  const dir = await mkdtemp(join(tmpdir(), 'cluster-'));
  const file = join(dir, 'adapter.mjs');
  await writeFile(file, source);
  global.fetch = async () => { throw new Error('nothing may be sent for a refused function'); };
  return import(pathToFileURL(file).href);
}

const REASONS = {
  gdsScheduledReports: [/Google service account/, /no folder can be listed/],
  saveReportToDrive: [/service account/, /exported as CSV or PDF/],
  gdsCompliancePortalSync: [/no external compliance portal/, /nothing to sync with/],
  gdsApplyRiskScoring: [/0 of 145 assets link to any finding by name/, /no risk_score or base_risk_score column/, /would be invented/],
  gdsDataFabric: [/do not exist as tables/, /data_sources, data_catalog, data_lakes and data_quality_rules/],
  gdsCleanup: [/nothing for one to clean/],
};

test('every refused function carries a reason naming what was measured', async () => {
  const { base44 } = await loadAdapter();
  for (const [name, patterns] of Object.entries(REASONS)) {
    await assert.rejects(
      () => base44.functions.invoke(name, {}),
      (error) => {
        for (const pattern of patterns) assert.match(error.message, pattern, `${name} must mention ${pattern}`);
        return true;
      },
    );
  }
});

test('the app shell no longer calls a cleanup function that does not exist', async () => {
  const source = await readFile(new URL('context/PlatformContext.jsx', SRC), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!code.includes('gdsCleanup'), 'the call must be gone, not merely commented');
  assert.match(code, /setCleanupDone\(true\)/, 'the refresh it gated must still run');
});

test('the pages whose controls would look merely unsaved state why', async () => {
  const checks = [
    ['pages/settings/RiskScoringPage.jsx', /0 of 145 assets link to any finding by name/, /no scoring-config store/],
    ['pages/datafabric/DataFabricPage.jsx', /no data source, catalog, lake or quality-rule tables/],
    ['pages/DriveReportsPage.jsx', /no service account is installed/, /only the Drive step is missing/],
  ];
  for (const [rel, ...patterns] of checks) {
    const text = (await readFile(new URL(rel, SRC), 'utf8')).replace(/\s+/g, ' ');
    for (const pattern of patterns) assert.match(text, pattern, `${rel} must state ${pattern}`);
  }
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* ScanJob was mapped at /missions and drew nine completed agent missions as queued scan work. These pin the fix so it
 * cannot quietly revert, and they pin the decision NOT to translate status <- state.
 *
 * Every component assertion runs against comment-stripped source. Three earlier versions of this file failed because
 * they forbade a word that the docstring legitimately quotes while explaining the removed defect: `s.repo_name`,
 * "⏳ Queued", `ScanJob.update(id, ...)`. A file that documents a defect must be free to name it, so the check belongs
 * on the code.
 */

const source = readFileSync(new URL("../src/api/base44Client.js", import.meta.url), "utf8");

/** Remove block and line comments so assertions describe behaviour rather than prose. */
function code(path) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

test("ScanJob reads the scan activity route, not the missions store", () => {
  assert.match(source, /ScanJob: \{ path: '\/scans\/activity' \}/);
  assert.doesNotMatch(source, /ScanJob: \{ path: '\/missions' \}/);
});

test("schedules is a named collection key, because the payload carries counts and queue objects too", () => {
  assert.match(source, /'customers', 'services', 'schedules'\]/);
});

test("ScanJob has no field map that would silently lose the route's own status", () => {
  /* applyFields only fills a builder field that is ABSENT, so a status <- state entry would be ignored while looking
   * like a translation. The route's status (active/disabled) is real and must survive. */
  const block = source.split("const FIELD_MAPS = {")[1].split("\n};")[0];
  assert.doesNotMatch(block, /\n  ScanJob: \{/);
});

test("the adapter exposes scans.activity and cloud discovery", () => {
  assert.match(source, /scans: \{\s*\n\s*async activity\(\)/);
  assert.match(source, /async startDiscovery\(environmentId/);
  assert.match(source, /body: \{ environment_id: environmentId, discovery_categories: categories \}/);
});

test("the scan panels read the route's vocabulary instead of the builder's", () => {
  for (const path of ["../src/components/commandcenter/ScanStatusBar.jsx",
                      "../src/components/commandcenter/CloudAndScansColumn.jsx"]) {
    const body = code(path);
    assert.match(body, /\b(?:schedule|s)\.state\b/, `${path} must read the derived state`);
    assert.doesNotMatch(body, /\b\w+\.repo_name\b/, `${path} must not read a missions field`);
    /* The old components painted an unknown status as a queued pill, which is what turned finished missions into
     * queued work. The rendered label must not come back. */
    assert.doesNotMatch(body, /— Queued/, `${path} must not label anything queued`);
  }
});

test("the overdue banner offers no control that writes a status it cannot change", () => {
  const banner = code("../src/components/commandcenter/ScanJobStuckBanner.jsx");
  assert.doesNotMatch(banner, /await\s+base44\.entities\.ScanJob\.update/);
  assert.doesNotMatch(banner, /onClick=\{/);
});

test("Run Cloud Scan starts a real discovery job instead of writing a fake scan row", () => {
  const bar = code("../src/components/commandcenter/QuickActionsBar.jsx");
  assert.match(bar, /base44\.cloud\.startDiscovery\(/);
  assert.doesNotMatch(bar, /await\s+base44\.entities\.ScanJob\.create/);
  assert.doesNotMatch(bar, /toast\.success\("Cloud scan queued"\)/);
  /* A swallowed error is how the old button failed without saying anything. */
  assert.match(bar, /catch \(error\)/);
});

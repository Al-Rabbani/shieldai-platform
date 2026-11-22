import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/* Item 7: four entity names whose store exists and holds rows had no read route. Two routes were missing and are now
 * served by gds_api/store_reads_api.py; two already existed.
 *
 * The point of these assertions is that a page reading one of these names gets the field names the COMPONENT uses, not
 * the column names of the table. lib/attackPaths.js and pages/Assets.jsx both read dependency.asset_name and
 * dependency.depends_on_name, while the table stores source_asset_id and target_asset_id.
 */

const adapter = readFileSync(new URL("../src/api/base44Client.js", import.meta.url), "utf8");
const api = readFileSync(new URL("../../api/gds_api/store_reads_api.py", import.meta.url), "utf8");

test("the four names with a real store are mapped to routes", () => {
  assert.match(adapter, /WebhookEndpoint: \{ path: '\/webhooks' \}/);
  assert.match(adapter, /RemediationPlan: \{ path: '\/remediation\/plans' \}/);
  assert.match(adapter, /LinearIssueLink: \{ path: '\/integrations\/linear\/links' \}/);
  assert.match(adapter, /AssetDependency: \{ path: '\/cloud\/relationships' \}/);
});

test("the dependency route speaks the components' vocabulary, not the table's", () => {
  /* The graph builder and the Assets page both key on these three names. */
  for (const field of ['"asset_name"', '"depends_on_name"', '"dependency_type"']) {
    assert.ok(api.includes(field), `route must return ${field}`);
  }
  /* And it must name the endpoints from the inventory rather than leaving a caller to join. */
  assert.match(api, /LEFT JOIN cloud_assets sa ON sa\.id = r\.source_asset_id/);
  assert.match(api, /LEFT JOIN cloud_assets ta ON ta\.id = r\.target_asset_id/);
});

test("both new routes carry an explicit tenant predicate in addition to FORCE RLS", () => {
  const predicates = api.match(/tenant_id = \{TENANT\}/g) || [];
  assert.equal(predicates.length, 2, "each query filters on the bound tenant");
  assert.match(api, /NULLIF\(current_setting\('gds\.tenant_id', true\), ''\)::uuid/);
});

test("an unresolved endpoint reports null names instead of a fabricated label", () => {
  /* The names come straight from the join, so an endpoint that is not in the inventory arrives as null. Counting those
   * rows is the honest alternative to inventing a label for them. */
  assert.match(api, /"asset_name": r\["asset_name"\]/);
  assert.match(api, /"depends_on_name": r\["depends_on_name"\]/);
  assert.match(api, /with_unresolved_endpoint": unnamed/);
  assert.doesNotMatch(api, /asset_name"\]\s+or\s+"(unknown|unresolved|n\/a)"/i);
});

test("the webhook list counts deliveries instead of leaving the page to print undefined", () => {
  const webhooks = readFileSync(new URL("../../api/gds_api/webhooks.py", import.meta.url), "utf8");
  assert.match(webhooks, /AS delivery_count/);
  assert.match(webhooks, /LEFT JOIN webhook_deliveries d ON d\.endpoint_id = e\.id/);
  /* A default of 0 would hide the difference between "no deliveries" and "not counted". */
  assert.doesNotMatch(webhooks, /coalesce\(count\(d\.id\), 0\)/i);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { webcrypto } from 'node:crypto';
const source = fs.readFileSync('base44/functions/gdsAgentOS/entry.ts', 'utf8').replace(/^import .*createClientFromRequest.*;\n/m, '');
const code = stripTypeScriptTypes(source);
let user, readFailure, writeFailure, llmFailure, updates, critical;
function reset() { user = {id: 'user-1', role: 'user', email: 'test@example.invalid'}; readFailure = writeFailure = llmFailure = false; updates = 0; critical = false; }
const entities = Object.fromEntries(['CloudFinding','TriagedFinding','ComplianceFramework','DarkWebEvent','CIEMFinding','Organization','Incident','CopilotApproval','CopilotSession'].map(name => [name, {
 list: async () => { if (readFailure) throw new Error('source unavailable'); return name === 'TriagedFinding' && critical ? [{status:'open', normalized_severity:'critical'}] : []; },
 update: async () => { if (writeFailure) throw new Error('write unavailable'); updates++; return {}; },
 create: async () => { if (writeFailure) throw new Error('write unavailable'); return {id:'record-1'}; },
}]));
let handler;
vm.runInNewContext(code, {Deno:{serve: h => handler = h}, createClientFromRequest: () => ({auth:{me: async () => user}, entities, integrations:{Core:{InvokeLLM: async () => { if (llmFailure) throw new Error('model unavailable'); return 'Stored-record briefing'; }}}}), crypto: webcrypto, Response, Date, console});
async function invoke(body) { const response = await handler(new Request('https://test.invalid', {method:'POST', body:JSON.stringify(body)})); return {status:response.status, body:await response.json()}; }
let passed = 0;
async function check(name, fn) { reset(); await fn(); console.log('PASS', name); passed++; }
await check('failed source read cannot produce healthy posture', async () => { readFailure = true; const r = await invoke({action:'health'}); assert.equal(r.status, 500); assert.equal(r.body.success, false); });
await check('no historical comparison means trend unknown', async () => { const r = await invoke({action:'health'}); assert.equal(r.body.live_data.trend,'unknown'); assert.equal(r.body.live_data.score_method,'heuristic_v1'); });
await check('declared MCP tools are not verified connections', async () => { const r = await invoke({action:'list_tools'}); assert.equal(r.body.verified_connected_count,0); assert.ok(r.body.tools.every(t => t.connected === false && t.status === 'declared_unverified')); });
await check('non-admin cannot approve', async () => { const r = await invoke({action:'approve',approval_id:'x',decision:'approved'}); assert.equal(r.status,403); assert.equal(updates,0); });
await check('invalid decision cannot update an approval', async () => { user.role = 'admin'; const r = await invoke({action:'approve',approval_id:'x',decision:'invalid'}); assert.equal(r.status,400); assert.equal(updates,0); });
await check('failed approval persistence cannot return success', async () => { user.role = 'admin'; writeFailure = true; const r = await invoke({action:'approve',approval_id:'x',decision:'approved'}); assert.equal(r.status,500); assert.equal(r.body.success,false); });
await check('model failure cannot report generated code', async () => { llmFailure = true; const r = await invoke({action:'generate_code',task:'draft a monitoring script'}); assert.equal(r.status,503); assert.equal(r.body.code_output,null); });
await check('locked agent override rejected', async () => { const r = await invoke({action:'command',input:'review posture',agent_key:'redteam'}); assert.equal(r.status,403); });
await check('summaries do not report tool execution or random duration', async () => { const r = await invoke({action:'command',input:'review posture'}); assert.equal(r.status,200); assert.equal(r.body.execution_mode,'stored_record_summary'); assert.equal(r.body.tool_calls,0); assert.equal(r.body.mcp_tools_available,0); assert.ok(r.body.agent_steps.every(s => s.tool_calls === 0 && s.duration_ms >= 0 && s.duration_ms <= r.body.total_duration_ms)); assert.match(r.body.mission_id,/^mission-[0-9a-f-]{36}$/); });
await check('failed session persistence cannot report successful command', async () => { writeFailure = true; const r = await invoke({action:'command',input:'review posture'}); assert.equal(r.status,500); assert.equal(r.body.success,false); });
console.log(`${passed} contract tests passed; SDK/provider behavior mocked; no live cloud verification.`);

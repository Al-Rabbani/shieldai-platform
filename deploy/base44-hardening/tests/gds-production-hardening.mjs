import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
let passed = 0;
async function boot(name, options = {}) {
 let handler; const writes = [];
 const row = options.row || { name:'ThreatMonitor', status:'online', last_heartbeat:'2026-06-09T12:00:00Z' };
 const entities = new Proxy({}, {get:(_, key)=>({
   list: async()=>{if(options.readFailure)throw new Error('private failure');return key==='Agent'?[row]:[];},
   filter:async()=>{if(options.readFailure)throw new Error('private failure');return [];},
   create:async data=>{writes.push({key,data});return {id:'created',...data};},
   update:async(id,data)=>{writes.push({key,id,data});return {id,...data};},
 })});
 const user = options.user === undefined ? {id:'admin-1',role:'admin',email:'admin@example.invalid'} : options.user;
 const code = fs.readFileSync(new URL(`../base44/functions/${name}/entry.ts`,import.meta.url),'utf8').replace(/^import .*?;\s*/m,'');
 vm.runInNewContext(stripTypeScriptTypes(code), {Deno:{serve:f=>handler=f,env:{get:()=>undefined}},createClientFromRequest:()=>({auth:{me:async()=>user},entities,asServiceRole:{entities}}),Response,Date,JSON,Math,Set,Number,console});
 return {writes,invoke:async body=>{const r=await handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify(body)}));return {status:r.status,body:await r.json()};}};
}
async function check(name,fn){await fn();passed++;console.log('PASS',name);}
await check('legacy worker refuses production writes',async()=>{const b=await boot('agentWorker');const r=await b.invoke({agent_type:'runtime'});assert.equal(r.status,409);assert.equal(b.writes.length,0);});
await check('simulation preview never writes alerts or findings',async()=>{const b=await boot('agentWorker');const r=await b.invoke({simulation_preview:true});assert.equal(r.body.provenance,'simulation');assert.equal(r.body.persisted,false);assert.equal(b.writes.length,0);});
await check('anonymous worker denied',async()=>{const b=await boot('agentWorker',{user:null});assert.equal((await b.invoke({simulation_preview:true})).status,401);assert.equal(b.writes.length,0);});
await check('analyst cannot use privileged gateways',async()=>{for(const name of ['agentWorker','gdsAgentRuntime','gdsKernelGateway','gdsRealSOAR','shieldDarkWebMonitor','gdsLiveAgentEngine','gdsPlatformHealthMonitor']){const b=await boot(name,{user:{id:'viewer',role:'user'}});assert.equal((await b.invoke({action:'health_check'})).status,403,name);assert.equal(b.writes.length,0);}});
await check('legacy approval cannot advance session or claim approval',async()=>{const b=await boot('gdsKernelGateway');const r=await b.invoke({action:'approve',session_id:'s',approval_action:'approve',approver_id:'forged'});assert.equal(r.status,503);assert.equal(r.body.approval_recorded,false);assert.equal(b.writes.length,0);});
await check('invalid approval rejected without writes',async()=>{const b=await boot('gdsKernelGateway');assert.equal((await b.invoke({action:'approve',approval_action:'yes'})).status,400);assert.equal(b.writes.length,0);});
await check('kernel draft derives actor from authenticated identity',async()=>{const b=await boot('gdsKernelGateway');const r=await b.invoke({action:'start',intent:'review',actor_role:'root',actor_id:'forged'});assert.equal(r.body.status,'draft');const s=b.writes.find(x=>x.key==='KernelSession').data;assert.equal(s.actor_id,'admin-1');assert.equal(s.actor_role,'admin');assert.equal(s.status,'draft');});
await check('stale heartbeat overrides online label',async()=>{const b=await boot('gdsAgentRuntime');const r=await b.invoke({action:'health_check'});assert.equal(r.body.registered_health[0].status,'offline');assert.equal(r.body.registered_health[0].health_score,null);assert.ok(r.body.catalog_health.every(x=>x.status==='declared_unverified'));});
await check('missing or future heartbeat never establishes liveness',async()=>{for(const last_heartbeat of [null,'invalid','2999-01-01T00:00:00Z']){const b=await boot('gdsAgentRuntime',{row:{status:'online',last_heartbeat}});assert.equal((await b.invoke({action:'health_check'})).body.registered_health[0].status,'unknown');}});
await check('fresh heartbeat is distinct from verified tools',async()=>{const b=await boot('gdsAgentRuntime',{row:{status:'online',last_heartbeat:new Date().toISOString()}});const r=await b.invoke({action:'health_check'});assert.equal(r.body.registered_health[0].status,'alive');assert.equal(r.body.tool_execution_verified,false);});
await check('runtime errors never become healthy empty data',async()=>{const b=await boot('gdsAgentRuntime',{readFailure:true});assert.equal((await b.invoke({action:'health_check'})).status,503);});
await check('unsupported runtime mutations fail honestly',async()=>{for(const action of ['start','register','heartbeat','message','cancel_job']){const b=await boot('gdsAgentRuntime');const r=await b.invoke({action});assert.equal(r.status,503);assert.equal(b.writes.length,0);}});
await check('SOAR cannot invent execution or audit success',async()=>{const b=await boot('gdsRealSOAR');const r=await b.invoke({action:'run_case',playbook_id:'CRITICAL_CVE'});assert.equal(r.status,503);assert.equal(r.body.real_execution,false);assert.equal(b.writes.length,0);});
await check('dark web summary does not claim fresh collection',async()=>{const b=await boot('shieldDarkWebMonitor');const r=await b.invoke({});assert.equal(r.body.scanned_at,null);assert.equal(r.body.collection_verified,false);});
await check('agent catalog has no fabricated live counts',async()=>{const b=await boot('gdsLiveAgentEngine');const r=await b.invoke({action:'get_agents'});assert.equal(r.body.online,0);assert.ok(r.body.agents.every(a=>a.status==='declared_unverified'&&a.health_score===null&&a.executions_total===null));});
await check('live engine cannot pretend to launch mission',async()=>{const b=await boot('gdsLiveAgentEngine');assert.equal((await b.invoke({action:'launch_mission',mission:'scan'})).status,503);assert.equal(b.writes.length,0);});
await check('health monitor exposes missing measurements',async()=>{const b=await boot('gdsPlatformHealthMonitor');const r=await b.invoke({action:'health_check'});assert.equal(r.body.platform_health_score,null);assert.equal(r.body.automations.runs_last_24h,null);assert.ok((await b.invoke({action:'platform_kpis'})).body.kpis.every(k=>k.actual===null));});
await check('source errors are not healthy',async()=>{const b=await boot('gdsPlatformHealthMonitor',{readFailure:true});assert.equal((await b.invoke({action:'health_check'})).status,503);});
await check('second simulator cannot mutate production or resolve threats',async()=>{const b=await boot('agentSimulator');assert.equal((await b.invoke({})).status,409);assert.equal(b.writes.length,0);});
console.log(`${passed} production hardening contracts passed; SDK and services mocked.`);

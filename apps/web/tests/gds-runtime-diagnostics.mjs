import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync(new URL('../base44/functions/gds-runtime-diagnostics/entry.ts',import.meta.url),'utf8').replace(/^import .*?;\s*/m,'');
async function run({role='admin',key='test-only-key',reply,body={}}={}){
 let handler;const calls=[];
 vm.runInNewContext(stripTypeScriptTypes(source),{Deno:{serve:f=>handler=f,env:{get:()=>key}},
 createClientFromRequest:()=>({auth:{me:async()=>role?{id:'admin-test',role}:null}}),
 fetch:async(url,options)=>{calls.push({url,options});return reply?reply(url,options):Response.json({schema_version:1,registry_counts:{agents:23,tools:48},release_sha:'a'.repeat(40),production_ready:true});},
 Response,AbortSignal,TextDecoder,Uint8Array,Error,Number,JSON,Date});
 const response=await handler(new Request('https://test.invalid',{method:'POST',body:JSON.stringify(body)}));
 return {status:response.status,data:await response.json(),calls};
}
let passed=0;async function check(name,fn){await fn();passed++;console.log('PASS',name);}
await check('missing key returns blocked without network',async()=>{const r=await run({key:''});assert.equal(r.status,503);assert.equal(r.calls.length,0);});
await check('non-admin and anonymous callers cannot use bridge',async()=>{for(const role of ['user',null]){const r=await run({role});assert.ok([401,403].includes(r.status));assert.equal(r.calls.length,0);}});
await check('caller URL is ignored and redirects disabled',async()=>{const r=await run({body:{target_url:'https://other.invalid'}});assert.equal(r.calls[0].url,'https://api.globaldigitalsecurity.io/bridge/diagnostics');assert.equal(r.calls[0].options.redirect,'manual');});
await check('metadata does not certify readiness or expose secret',async()=>{const r=await run();assert.equal(r.status,200);assert.equal(r.data.production_ready,false);assert.equal(r.data.execution_verified,false);assert.ok(!JSON.stringify(r.data).includes('test-only-key'));});
await check('legacy roster fallback stays read-only',async()=>{const r=await run({reply:url=>url.endsWith('/diagnostics')?new Response('',{status:404}):Response.json({agents:[{name:'one'}]})});assert.equal(r.data.connection_status,'authenticated_legacy_roster');assert.equal(r.calls.length,2);});
await check('unauthorized upstream has controlled failure',async()=>{const r=await run({reply:()=>new Response('private upstream details',{status:401})});assert.equal(r.status,502);assert.equal(r.data.connection_status,'authentication_failed');assert.ok(!JSON.stringify(r.data).includes('private'));});
await check('oversized body is rejected',async()=>{const r=await run({reply:()=>new Response('x'.repeat(70000),{headers:{'content-type':'application/json'}})});assert.equal(r.status,502);});
await check('redirect is rejected without following',async()=>{const r=await run({reply:()=>new Response('',{status:302,headers:{Location:'https://other.invalid'}})});assert.equal(r.status,502);assert.equal(r.calls.length,1);});
console.log(`${passed} runtime diagnostic contracts passed; transport and SDK mocked.`);

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const htmlPath = process.env.GDS_FRONTEND_HTML || path.join(__dirname, '..', 'web', 'gds_app.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).join('\n');
function harness(responder) {
  const elements = new Map();
  const calls = [], removed = [], alerts = [];
  let reloads = 0;
  const document = {getElementById(id) {
    if (!elements.has(id)) elements.set(id, {innerHTML:'', textContent:'', value:'', attributes:{},
      setAttribute(k,v){this.attributes[k]=v;}, classList:{add(){},remove(){},toggle(){}}, focus(){}});
    return elements.get(id);
  }};
  const location = {origin:'https://app.globaldigitalsecurity.io',reload(){reloads++;}};
  const context = vm.createContext({document,location,
    window:{location,alert:m=>alerts.push(m)},
    sessionStorage:{removeItem:k=>removed.push(k),setItem(){},getItem(){return '{broken cached session';}},
    fetch:async (url,options)=>{calls.push({url,options}); return responder(url,options);},
    console,Date,Set,Promise,Array,String,Error,JSON,Number,Math});
  vm.runInContext(script, context);
  return {context,elements,calls,removed,alerts,get reloads(){return reloads;}};
}
const reply = (data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const agents = [
  {name:'triage',display_name:'Triage',status:'OPERATIONAL',department:'SOC',tool_names:['read_alerts']},
  {name:'retest',display_name:'<img src=x onerror=alert(1)>',status:'DEGRADED',department:'Assurance',tool_names:[]}
];
function fixture(url) {
  if (url.endsWith('/agents/activity')) return reply([{agent_name:'triage'}]);
  if (url.endsWith('/agents/planned')) return reply([{name:'future_agent',display_name:'Future agent'}]);
  if (url.endsWith('/agents')) return reply(agents);
  return reply({},401);
}
test('the complete deployed script parses',()=>assert.doesNotThrow(()=>new vm.Script(script)));
test('agent counts and busy state come from three authenticated API responses',async()=>{
  const h=harness(fixture); await h.context.loadAgents();
  const output=h.elements.get('agentsList').innerHTML;
  assert.match(output,/Agent Assurance/);
  assert.match(output,/>2<\/strong><span>Registered/);
  assert.match(output,/>1<\/strong><span>Executing missions/);
  assert.match(output,/No running mission recorded/);
  assert.equal(h.calls.length,3);
  for(const call of h.calls){assert.match(call.url,/^https:\/\/app\.globaldigitalsecurity\.io\/api\//);assert.equal(call.options.credentials,'include');}
  assert.equal(h.elements.get('agentsList').attributes['aria-busy'],'false');
});
test('agent fields are escaped before HTML rendering',async()=>{
  const h=harness(fixture);await h.context.loadAgents();
  const output=h.elements.get('agentsList').innerHTML;
  assert.ok(!output.includes('<img'));
  assert.match(output,/&lt;img/);
});
test('a failed dependency does not invent an active-agent count',async()=>{
  const h=harness(url=>url.endsWith('/planned')?reply({},503):fixture(url));
  await h.context.loadAgents();
  assert.match(h.elements.get('agentsList').innerHTML,/Agent status unavailable/);
  assert.ok(!h.elements.get('agentsList').innerHTML.includes('Marked operational'));
});
test('an expired session produces an explicit sign-in message',async()=>{
  const h=harness(()=>reply({},401));await h.context.loadAgents();
  assert.match(h.elements.get('agentsList').innerHTML,/session has expired/);
});
test('session restoration validates with the backend instead of trusting browser storage',async()=>{
  const h=harness(()=>reply({},401));await h.context.window.onload();
  assert.equal(h.calls[0].url,'https://app.globaldigitalsecurity.io/api/auth/me');
  assert.ok(h.removed.includes('gds_user'));
});
test('sign out revokes the server session before reloading',async()=>{
  const h=harness(()=>reply({status:'logged_out'}));await h.context.logout();
  assert.equal(h.calls[0].options.method,'POST');
  assert.ok(h.calls[0].url.endsWith('/auth/logout'));assert.equal(h.reloads,1);
});
test('a failed sign out is not presented as successful',async()=>{
  const h=harness(()=>reply({},503));await h.context.logout();
  assert.equal(h.reloads,0);assert.equal(h.alerts.length,1);
});
test('forms have connected labels and keyboard-operable mode controls',()=>{
  for(const id of ['email','password','regEmail','regPassword','regOrg'])assert.ok(html.includes('for="'+id+'"'),id);
  assert.match(html,/<button[^>]*id="loginToggle"/);
  assert.match(html,/prefers-reduced-motion/);
  assert.ok(!html.includes('35 sovereign AI agents'));
});
test('findings and incident titles cannot inject HTML',async()=>{
  const h=harness(()=>reply([{title:'<img src=x onerror=alert(1)>',severity:'high',source:'<script>bad</script>',status:'open',created_at:'2026-11-14'}]));
  await h.context.loadFindings();await h.context.loadIncidents();
  for(const id of ['findingsList','incidentsList']){
    assert.ok(!h.elements.get(id).innerHTML.includes('<img'));
    assert.match(h.elements.get(id).innerHTML,/&lt;img/);
  }
});
test('an unavailable incident service never displays All clear',async()=>{
  const h=harness(()=>reply({},503));await h.context.loadIncidents();
  assert.match(h.elements.get('incidentsList').innerHTML,/Unable to verify/);
  assert.ok(!h.elements.get('incidentsList').innerHTML.includes('All clear'));
  assert.equal(h.elements.get('stat-incidents').textContent,'Unavailable');
});

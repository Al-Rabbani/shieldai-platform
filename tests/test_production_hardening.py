"""Offline execution-boundary tests; no live tools, models or database."""
import asyncio
import secrets
from types import SimpleNamespace
import unittest
from uuid import uuid4
from test_runtime_boundaries import load_nodes


class Denied(Exception):
    def __init__(self, decision, code, message):
        self.decision, self.denial_code = decision, code


class BindingTests(unittest.TestCase):
    def setUp(self):
        self.scope = dict(tenant_id=uuid4(), user_id=uuid4(), mission_id=uuid4(),
                          tool_name='read_evidence', input_data={'asset':'owned.invalid'})
        self.request = SimpleNamespace(**{k:v for k,v in self.scope.items() if k not in ('tool_name','input_data')},
            requested_tool_id='read_evidence',requested_parameters_safe={'asset':'owned.invalid'})
        self.validate = load_nodes('gds_api/capabilities/gateway.py', ['_validate_execution_binding'],
            {'CapabilityExecutionDenied':Denied})['_validate_execution_binding']

    def test_exact_request_matches(self):
        self.validate(self.request, **self.scope)

    def test_each_identity_and_tool_substitution_denied(self):
        for key in ('tenant_id','user_id','mission_id','tool_name'):
            changed = dict(self.scope, **{key:uuid4() if key.endswith('_id') else 'write_evidence'})
            with self.subTest(key=key), self.assertRaises(Denied):
                self.validate(self.request, **changed)

    def test_argument_substitution_denied(self):
        with self.assertRaises(Denied):
            self.validate(self.request, **dict(self.scope,input_data={'asset':'other.invalid'}))

    def test_raw_secret_cannot_replace_redacted_argument(self):
        self.request.requested_parameters_safe={'token':'[REDACTED]'}
        with self.assertRaises(Denied):
            self.validate(self.request, **dict(self.scope,input_data={'token':'a-secret-value'}))

    def test_missing_request_and_malformed_payload_denied(self):
        with self.assertRaises(Denied): self.validate(None,**self.scope)
        with self.assertRaises(Denied): self.validate(self.request,**dict(self.scope,input_data=[]))


class BoundaryTests(unittest.IsolatedAsyncioTestCase):
    async def test_raw_dispatch_does_not_call_registered_handler(self):
        calls=[]
        ns=load_nodes('gds_api/tool_gateway.py',['execute_tool'],{'TOOL_REGISTRY':{'scan':lambda p:calls.append(p)}})
        result=await ns['execute_tool']('scan',payload={'target':'owned.invalid'},actor_id='admin',tenant_id='forged')
        self.assertFalse(result['success']);self.assertEqual(calls,[])
        self.assertEqual(result['code'],'GOVERNED_CAPABILITY_REQUIRED')

    async def test_legacy_loop_has_no_direct_scanner_bypass(self):
        ns=load_nodes('gds_api/reasoning/agent_loop.py',[],{})
        # Extract the real class method without importing the provider/database stack.
        import ast
        from test_runtime_boundaries import ROOT
        tree=ast.parse((ROOT/'gds_api/reasoning/agent_loop.py').read_text())
        cls=next(n for n in tree.body if isinstance(n,ast.ClassDef) and n.name=='AgenticLoop')
        method=next(n for n in cls.body if getattr(n,'name',None)=='_execute_tool')
        exec(compile(ast.Module(body=[method],type_ignores=[]),'agent_loop','exec'),ns)
        for tool in ('aws_iam_scan','store_finding','get_findings','nmap_scan'):
            result=await ns['_execute_tool'](None,tool,{})
            self.assertEqual(result['code'],'GOVERNED_CAPABILITY_REQUIRED')

    async def test_kernel_rpc_cannot_run_raw_tools_or_grant_approval(self):
        class HTTPException(Exception):
            def __init__(self,status,detail):self.status_code=status
        ns=load_nodes('gds_kernel/kernel_router.py',['execute_tool','approval_grant'],{
            'ToolExecuteRequest':object,'ApprovalGrantRequest':object,'HTTPException':HTTPException,
            'router':SimpleNamespace(post=lambda *a,**k:lambda f:f)})
        for name in ('execute_tool','approval_grant'):
            with self.assertRaises(HTTPException) as caught: await ns[name](object())
            self.assertEqual(caught.exception.status_code,503)

    async def test_failure_output_is_recorded_as_failed(self):
        scope=dict(tenant_id=uuid4(),user_id=uuid4(),mission_id=uuid4(),request_id=uuid4())
        request=SimpleNamespace(tenant_id=scope['tenant_id'],user_id=scope['user_id'],mission_id=scope['mission_id'],
            requested_tool_id='read',requested_parameters_safe={},requesting_agent_id='analyst',workflow_run_id=None)
        marks=[]
        class DB:
            async def get(self,*args):return request
            async def commit(self):pass
        async def evaluate(*args,**kwargs):return SimpleNamespace(decision='ALLOW',decision_id=uuid4())
        async def execute(*args,**kwargs):return {'success':False,'error':'scanner failed'}
        async def mark(*args,**kwargs):marks.append(kwargs['status'])
        async def claim(*args,**kwargs):pass
        ns=load_nodes('gds_api/capabilities/gateway.py',['_validate_execution_binding','execute_capability_request'],{
            'uuid':__import__('uuid'),'AsyncSession':object,'CapabilityRequestRecord':object,
            'CapabilityExecutionDenied':Denied,'reevaluate_capability_request':evaluate,
            '_claim_execution':claim,'tool_gateway':SimpleNamespace(execute_tool_governed=execute),
            'mark_capability_execution':mark})
        r=await ns['execute_capability_request'](DB(),**scope,tool_name='read',input_data={})
        self.assertFalse(r['success']);self.assertEqual(marks,['failed'])

    async def test_failed_claim_prevents_dispatch(self):
        scope=dict(tenant_id=uuid4(),user_id=uuid4(),mission_id=uuid4(),request_id=uuid4())
        request=SimpleNamespace(tenant_id=scope['tenant_id'],user_id=scope['user_id'],mission_id=scope['mission_id'],
            requested_tool_id='read',requested_parameters_safe={},requesting_agent_id='analyst',workflow_run_id=None)
        calls=[]
        class DB:
            async def get(self,*args):return request
            async def commit(self):pass
        async def evaluate(*a,**kw):return SimpleNamespace(decision='ALLOW',decision_id=uuid4())
        async def claim(*a,**kw):raise RuntimeError('storage unavailable')
        async def execute(*a,**kw):calls.append(1)
        ns=load_nodes('gds_api/capabilities/gateway.py',['_validate_execution_binding','execute_capability_request'],{
            'uuid':__import__('uuid'),'AsyncSession':object,'CapabilityRequestRecord':object,
            'CapabilityExecutionDenied':Denied,'reevaluate_capability_request':evaluate,
            '_claim_execution':claim,'tool_gateway':SimpleNamespace(execute_tool_governed=execute)})
        with self.assertRaises(RuntimeError):await ns['execute_capability_request'](DB(),**scope,tool_name='read',input_data={})
        self.assertEqual(calls,[])


class BridgeAuthTests(unittest.TestCase):
    def test_empty_config_and_invalid_credentials_denied(self):
        class HTTPException(Exception):
            def __init__(self,status,detail):self.status_code=status
        for key,token in [('', 'Bearer '),('key',None),('key','Basic key'),('key','Bearer wrong'),('key','Bearer ☃')]:
            ns=load_nodes('gds_api/bridge/super_agent_bridge.py',['_verify_auth'],
                {'BRIDGE_API_KEY':key,'secrets':secrets,'HTTPException':HTTPException})
            with self.assertRaises(HTTPException):ns['_verify_auth'](token)

    def test_valid_auth_accepted(self):
        ns=load_nodes('gds_api/bridge/super_agent_bridge.py',['_verify_auth'],{'BRIDGE_API_KEY':'key','secrets':secrets})
        self.assertTrue(ns['_verify_auth']('Bearer key'))


class ClaimTests(unittest.IsolatedAsyncioTestCase):
    async def test_durable_claim_is_request_wide_and_cannot_be_replayed(self):
        scope=dict(tenant_id=uuid4(),request_id=uuid4(),decision_id=uuid4())
        decision=SimpleNamespace(request_id=scope['request_id'],tenant_id=scope['tenant_id'],decision='ALLOW',execution_status=None)
        class Column:
            def __eq__(self,other):return True
            def in_(self,other):return True
        RequestType=type('Request',(),{'id':Column(),'tenant_id':Column()})
        DecisionType=type('Decision',(),{'request_id':Column(),'tenant_id':Column(),'execution_status':Column()})
        class Query:
            def __init__(self,model):self.model=model;self.locked=False
            def where(self,*args):return self
            def with_for_update(self):self.locked=True;return self
        class DB:
            committed=False;rolled_back=False;locked=False
            async def execute(self,q):
                if q.model is RequestType:
                    self.locked=q.locked
                    return SimpleNamespace(scalar_one_or_none=lambda:object())
                return SimpleNamespace(scalars=lambda:SimpleNamespace(first=lambda:decision if decision.execution_status else None))
            async def get(self,*args):return decision
            async def commit(self):self.committed=True
            async def rollback(self):self.rolled_back=True
        ns=load_nodes('gds_api/capabilities/gateway.py',['_claim_execution'],{'select':Query,'CapabilityRequestRecord':RequestType,
            'CapabilityDecisionRecord':DecisionType,'CapabilityExecutionDenied':Denied})
        db=DB();await ns['_claim_execution'](db,**scope)
        self.assertTrue(db.locked);self.assertTrue(db.committed);self.assertEqual(decision.execution_status,'executing')
        with self.assertRaises(Denied):await ns['_claim_execution'](db,**scope)
        self.assertTrue(db.rolled_back)

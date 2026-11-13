"""Production boundary functions with the real Temporal SDK failure converter.

Database, workflow client and activity decorators are fixtures. No service is
started and no provider/tool call is made. Workflow run definitions are unchanged.
"""
import ast
from pathlib import Path
import sys
from types import SimpleNamespace
from typing import Any
import unittest
import uuid

from temporalio.api.failure.v1 import Failure
from temporalio.converter import DefaultFailureConverter, PayloadConverter
from temporalio.exceptions import ApplicationError

ROOT = Path(__file__).resolve().parents[2] / 'apps/api'
sys.path.insert(0, str(ROOT))
from gds_api.identifiers import parse_database_uuid

ACTIVITIES = {
    'assess_mission': 'mission', 'decide_next_step': 'payload',
    'evaluate_task': 'task', 'check_approval': 'approval',
    'execute_task': 'task', 'deny_task': 'task',
    'mark_mission_failed': 'payload', 'synthesize_report': 'payload',
}


def load(relative, names, extra):
    tree = ast.parse((ROOT / relative).read_text())
    nodes = [n for n in tree.body if getattr(n, 'name', None) in names]
    namespace = {'uuid': uuid, 'Any': Any, 'ApplicationError': ApplicationError,
                 'parse_database_uuid': parse_database_uuid,
                 'activity': SimpleNamespace(defn=lambda f: f)}
    namespace.update(extra)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), relative, 'exec'), namespace)
    return namespace


class ActivityIdentifierTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.opens = 0
        def forbidden_db():
            self.opens += 1
            raise AssertionError('Database session must not open for invalid input')
        self.ns = load('gds_api/workflows/activities.py',
                       ['_activity_record_uuid', *ACTIVITIES],
                       {'async_session_factory': forbidden_db})

    async def test_every_record_activity_rejects_legacy_id_before_database(self):
        for name, kind in ACTIVITIES.items():
            argument = {'mission_id': 'mission-0123456789ab'} if kind == 'payload' else 'mission-0123456789ab'
            with self.subTest(activity=name), self.assertRaises(ApplicationError) as caught:
                await self.ns[name](argument)
            self.assertTrue(caught.exception.non_retryable)
            self.assertEqual(caught.exception.type, 'InvalidDatabaseIdentifier')
            self.assertNotIn('0123456789ab', str(caught.exception))
        self.assertEqual(self.opens, 0)

    async def test_missing_payload_identifier_also_fails_before_database(self):
        for name, kind in ACTIVITIES.items():
            if kind == 'payload':
                with self.subTest(activity=name), self.assertRaises(ApplicationError):
                    await self.ns[name]({})
        self.assertEqual(self.opens, 0)

    async def test_real_sdk_serializes_nonretryable_failure_without_caller_value(self):
        try:
            self.ns['_activity_record_uuid']('private-input-marker', 'mission')
        except ApplicationError as exc:
            failure = Failure()
            DefaultFailureConverter().to_failure(exc, PayloadConverter.default, failure)
        else:
            self.fail('Expected a permanent input failure')
        self.assertTrue(failure.application_failure_info.non_retryable)
        self.assertEqual(failure.application_failure_info.type, 'InvalidDatabaseIdentifier')
        self.assertNotIn('private-input-marker', failure.message)
        self.assertFalse(failure.HasField('cause'))

    async def test_valid_assessment_identifier_reaches_lookup_unchanged(self):
        identity = uuid.uuid4()
        seen = []
        class LookupReached(Exception):
            pass
        class DB:
            async def get(self, model, key):
                seen.append(key)
                raise LookupReached()
        class Session:
            async def __aenter__(self):
                return DB()
            async def __aexit__(self, *args):
                return False
        self.ns.update(async_session_factory=Session, Mission=object)
        for value in (str(identity), identity):
            with self.assertRaises(LookupReached):
                await self.ns['assess_mission'](value)
        self.assertEqual(seen, [identity, identity])


class WorkflowStartIdentifierTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.connections = 0
        self.started = []
        self.rows = []
        async def start(*args, **kwargs):
            self.started.append((args, kwargs))
            return SimpleNamespace(id=kwargs['id'], run_id='fixture-run')
        async def connect():
            self.connections += 1
            return SimpleNamespace(start_workflow=start)
        async def flush():
            pass
        self.db = SimpleNamespace(add=self.rows.append, flush=flush)
        self.ns = load('gds_api/mission_lifecycle.py', ['start_mission_workflow'], {
            'AsyncSession': object, 'Mission': object, 'MissionKind': str,
            'WorkflowRun': lambda **fields: SimpleNamespace(**fields),
            'get_temporal_client': connect, 'TASK_QUEUE': 'fixture-queue',
            'MissionWorkflow': SimpleNamespace(run='direct-handler'),
            'ConversationTurnWorkflow': SimpleNamespace(run='chat-handler'),
        })

    async def test_legacy_id_never_opens_workflow_client_or_writes_row(self):
        for kind in ('direct', 'chat'):
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                await self.ns['start_mission_workflow'](
                    self.db, SimpleNamespace(id='mission-0123456789ab'), kind=kind)
        self.assertEqual(self.connections, 0)
        self.assertEqual(self.started, [])
        self.assertEqual(self.rows, [])

    async def test_valid_start_preserves_database_id_for_both_workflow_kinds(self):
        identity = uuid.uuid4()
        mission = SimpleNamespace(id=identity, tenant_id=uuid.uuid4(), conversation_thread_id=None)
        for kind, prefix in (('direct', 'mission'), ('chat', 'conversation-turn')):
            row = await self.ns['start_mission_workflow'](self.db, mission, kind=kind)
            args, kwargs = self.started[-1]
            self.assertEqual(args[1], str(identity))
            self.assertEqual(kwargs['id'], f'{prefix}-{identity}')
            self.assertEqual(row.mission_id, identity)
            self.assertEqual(row.tenant_id, mission.tenant_id)
        self.assertEqual(len(self.rows), 2)

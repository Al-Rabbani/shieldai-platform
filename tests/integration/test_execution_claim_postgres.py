"""Opt-in real PostgreSQL tests for the production request-claim function.

Use an isolated disposable database: GDS_TEST_DATABASE_URL must be set explicitly.
Creates/drops a unique schema only. Does not connect to the GDS VPS or run tools.
"""
import ast
import os
from pathlib import Path
from types import SimpleNamespace
import unittest
from uuid import uuid4


class ClaimDenied(Exception):
    def __init__(self, decision, code, message):
        self.decision, self.denial_code = decision, code


@unittest.skipUnless(os.environ.get('GDS_TEST_DATABASE_URL'), 'isolated PostgreSQL URL not configured')
class ExecutionClaimPostgresTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        from sqlalchemy import MetaData, String, Uuid, text, select
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
        from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
        self.schema='gds_claim_test_'+uuid4().hex
        class Base(DeclarativeBase):
            metadata=MetaData(schema=self.schema)
        class RequestRow(Base):
            __tablename__='capability_requests'
            id:Mapped[object]=mapped_column(Uuid,primary_key=True)
            tenant_id:Mapped[object]=mapped_column(Uuid,nullable=False)
        class DecisionRow(Base):
            __tablename__='capability_decisions'
            id:Mapped[object]=mapped_column(Uuid,primary_key=True)
            request_id:Mapped[object]=mapped_column(Uuid,nullable=False)
            tenant_id:Mapped[object]=mapped_column(Uuid,nullable=False)
            decision:Mapped[str]=mapped_column(String(30),nullable=False)
            execution_status:Mapped[str|None]=mapped_column(String(20),nullable=True)
        self.Request,self.Decision=RequestRow,DecisionRow
        self.engine=create_async_engine(os.environ['GDS_TEST_DATABASE_URL'],pool_size=5,max_overflow=15)
        self.sessions=async_sessionmaker(self.engine,expire_on_commit=False)
        self.text=text
        async with self.engine.begin() as connection:
            await connection.execute(text('CREATE SCHEMA '+self.schema))
            await connection.run_sync(Base.metadata.create_all)
        path=Path(__file__).resolve().parents[2]/'apps/api/gds_api/capabilities/gateway.py'
        tree=ast.parse(path.read_text())
        node=next(n for n in tree.body if getattr(n,'name',None)=='_claim_execution')
        ns={'select':select,'CapabilityRequestRecord':RequestRow,'CapabilityDecisionRecord':DecisionRow,'CapabilityExecutionDenied':ClaimDenied}
        exec(compile(ast.Module(body=[node],type_ignores=[]),str(path),'exec'),ns)
        self.claim=ns['_claim_execution']

    async def asyncTearDown(self):
        async with self.engine.begin() as connection:
            await connection.execute(self.text('DROP SCHEMA '+self.schema+' CASCADE'))
        await self.engine.dispose()

    async def seed(self,decisions=1,prior_status=None):
        tenant,request=uuid4(),uuid4()
        ids=[uuid4() for _ in range(decisions)]
        async with self.sessions() as db:
            db.add(self.Request(id=request,tenant_id=tenant))
            for index,identity in enumerate(ids):
                db.add(self.Decision(id=identity,request_id=request,tenant_id=tenant,decision='ALLOW',
                    execution_status=prior_status if index==0 else None))
            await db.commit()
        return tenant,request,ids

    async def test_twenty_concurrent_decisions_claim_request_once(self):
        import asyncio
        tenant,request,ids=await self.seed(decisions=20)
        start=asyncio.Event()
        async def worker(identity):
            async with self.sessions() as db:
                await start.wait()
                try:
                    await self.claim(db,tenant_id=tenant,request_id=request,decision_id=identity)
                    return 'claimed'
                except ClaimDenied as exc:
                    return exc.denial_code
        jobs=[asyncio.create_task(worker(identity)) for identity in ids]
        start.set()
        results=await asyncio.gather(*jobs)
        self.assertEqual(results.count('claimed'),1)
        self.assertEqual(results.count('execution_already_claimed'),19)

    async def test_new_decision_does_not_replay_prior_execution(self):
        for status in ('executing','executed','failed','cancelled'):
            tenant,request,ids=await self.seed(decisions=2,prior_status=status)
            async with self.sessions() as db:
                with self.assertRaises(ClaimDenied) as caught:
                    await self.claim(db,tenant_id=tenant,request_id=request,decision_id=ids[1])
                self.assertEqual(caught.exception.denial_code,'execution_already_claimed')

    async def test_wrong_tenant_cannot_claim_then_correct_tenant_can(self):
        tenant,request,ids=await self.seed()
        async with self.sessions() as db:
            with self.assertRaises(ClaimDenied):
                await self.claim(db,tenant_id=uuid4(),request_id=request,decision_id=ids[0])
        async with self.sessions() as db:
            await self.claim(db,tenant_id=tenant,request_id=request,decision_id=ids[0])
        async with self.sessions() as db:
            decision=await db.get(self.Decision,ids[0])
            self.assertEqual(decision.execution_status,'executing')

    async def test_decision_cannot_be_substituted_between_requests(self):
        tenant,request,ids=await self.seed()
        _,_,other=await self.seed()
        async with self.sessions() as db:
            with self.assertRaises(ClaimDenied):
                await self.claim(db,tenant_id=tenant,request_id=request,decision_id=other[0])
        async with self.sessions() as db:
            self.assertIsNone((await db.get(self.Decision,ids[0])).execution_status)

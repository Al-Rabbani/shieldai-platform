"""Regressions for the AWS discovery region defect.

Measured before this fix: every discovery run reported 3 assets and errors=[] against a real AWS
account. `_list_regions` built an EC2 client with no region, describe_regions raised "You must
specify a region", the caller caught it and set regions=[], so all 20 regional collectors iterated
over nothing while the job still said "completed". After the fix the same account yields 144 assets
across 17 regions.
"""
import asyncio

from gds_api.cloud.adapters import aws_discovery


class _RaisingClient:
    def describe_regions(self, **kwargs):
        raise RuntimeError("You must specify a region.")


class _EmptyClient:
    def describe_regions(self, **kwargs):
        return {"Regions": []}


class _GoodClient:
    def describe_regions(self, **kwargs):
        return {"Regions": [{"RegionName": "eu-west-2"}, {"RegionName": "us-east-1"}]}


class _Session:
    def __init__(self, client):
        self._client = client
        self.requested_region = None

    def client(self, service, region_name=None, config=None):
        self.requested_region = region_name
        return self._client


def _run(session, report=None):
    return asyncio.run(aws_discovery._list_regions(session, report))


def test_regions_never_empty_when_describe_regions_fails(monkeypatch):
    monkeypatch.setenv("AWS_REGION", "eu-west-2")
    monkeypatch.delenv("AWS_DISCOVERY_REGIONS", raising=False)
    report = {}
    regions = _run(_Session(_RaisingClient()), report)
    # The old behaviour was [] - which silently disabled all regional discovery.
    assert regions == ["eu-west-2"]
    assert report["regions"]["error"], "a failed describe_regions must be reported, not swallowed"
    assert "eu-west-2" in report["regions"]["source"]


def test_describe_regions_is_called_with_an_explicit_region(monkeypatch):
    monkeypatch.setenv("AWS_REGION", "eu-west-2")
    monkeypatch.delenv("AWS_DISCOVERY_REGIONS", raising=False)
    session = _Session(_GoodClient())
    regions = _run(session)
    assert session.requested_region == "eu-west-2"
    assert regions == ["eu-west-2", "us-east-1"]


def test_explicit_region_list_wins(monkeypatch):
    monkeypatch.setenv("AWS_DISCOVERY_REGIONS", "us-east-1, eu-west-2")
    report = {}
    regions = _run(_Session(_RaisingClient()), report)
    assert regions == ["eu-west-2", "us-east-1"]
    assert report["regions"]["source"] == "AWS_DISCOVERY_REGIONS"


def test_empty_region_answer_falls_back_and_says_so(monkeypatch):
    monkeypatch.setenv("AWS_REGION", "eu-west-2")
    monkeypatch.delenv("AWS_DISCOVERY_REGIONS", raising=False)
    report = {}
    assert _run(_Session(_EmptyClient()), report) == ["eu-west-2"]
    assert report["regions"]["error"]


def test_contained_category_failure_is_recorded():
    async def _boom():
        raise RuntimeError("AccessDenied for ec2:DescribeInstances")
        yield  # pragma: no cover

    async def _collect(report):
        return [a async for a in aws_discovery._safe_assets(_boom(), "ec2_instance:eu-west-2", report)]

    report = {}
    assert asyncio.run(_collect(report)) == []
    assert report["ec2_instance:eu-west-2"]["yielded"] == 0
    assert "AccessDenied" in report["ec2_instance:eu-west-2"]["error"]


def test_contained_category_success_records_zero_without_error():
    async def _nothing():
        if False:
            yield None

    async def _collect(report):
        return [a async for a in aws_discovery._safe_assets(_nothing(), "rds_instance:eu-west-2", report)]

    report = {}
    assert asyncio.run(_collect(report)) == []
    assert report["rds_instance:eu-west-2"] == {
        "yielded": 0, "error": None, "error_category": None
    }

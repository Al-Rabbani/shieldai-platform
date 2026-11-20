"""A subscription-scoped Reader cannot list subscriptions, so a declared subscription is read directly.

Measured 20 Nov 2026 against the real service principal: GET /subscriptions returned 200 with zero items while
GET /subscriptions/<id> returned 200 "GDS" with the same credential. Enumerating first turned a correctly-scoped
credential into a silent empty result, which validation then reported as success with no scope.
"""
from __future__ import annotations

import asyncio

from gds_api.cloud.adapters import azure

DECLARED = "d9369e8c-2b9e-49ea-9951-bcd336e6587c"


class _FakeSubscriptions:
    def __init__(self, declared):
        self.declared = declared
        self.list_calls = 0
        self.get_calls: list[str] = []

    def get(self, subscription_id):
        self.get_calls.append(subscription_id)
        return self.declared

    def list(self):
        self.list_calls += 1
        return []


class _FakeClient:
    def __init__(self, declared):
        self.subscriptions = _FakeSubscriptions(declared)


def test_declared_subscription_is_read_without_listing(monkeypatch):
    monkeypatch.setenv("AZURE_SUBSCRIPTION_ID", DECLARED)
    declared = object()
    client = _FakeClient(declared)

    resolved = asyncio.run(azure._resolve_subscriptions(client))

    assert resolved == [declared]
    assert client.subscriptions.get_calls == [DECLARED]
    assert client.subscriptions.list_calls == 0, (
        "must not depend on a list a subscription-scoped Reader cannot perform"
    )


def test_enumeration_remains_the_fallback_for_a_tenant_reader(monkeypatch):
    monkeypatch.delenv("AZURE_SUBSCRIPTION_ID", raising=False)
    client = _FakeClient(object())

    resolved = asyncio.run(azure._resolve_subscriptions(client))

    assert resolved == []
    assert client.subscriptions.list_calls == 1

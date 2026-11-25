"""A remediation capability that applies and proves a fix, instead of only planning one.

Measured 25 Nov 2026: the five-stage campaign could produce a verified plan and never apply anything. The
fixable container population turned out to be a dead end (every vendor image already at its newest published
tag, and the minio image carries no package manager), so the reachable fixable population is the web tier's
own configuration. These guards pin the parts that would silently rot: the capability exists, its tool is
dispatchable, an unknown fix is refused rather than guessed at, and the fix list stays honest.
"""
from gds_api.capabilities.catalog import CAPABILITY_REGISTRY, TOOL_TO_CAPABILITY_KEY
from gds_api.tool_gateway import TOOL_REGISTRY as TOOL_HANDLERS


def test_the_capability_exists_and_is_operational():
    cap = CAPABILITY_REGISTRY.get("remediation.apply_config_fix")
    assert cap is not None, "the remediation capability vanished"
    assert cap.required_tool_ids == ("remediation_apply_config_fix",)
    assert cap.risk_class.value == "R2", "a validated, reversible config fix is R2; raise it if that changes"


def test_the_tool_is_dispatchable_and_mapped():
    assert "remediation_apply_config_fix" in TOOL_HANDLERS, "declared but not dispatchable"
    assert TOOL_TO_CAPABILITY_KEY["remediation_apply_config_fix"] == "remediation.apply_config_fix"


def test_an_unknown_fix_is_refused_rather_than_guessed():
    import asyncio
    from gds_api.ops_tools import remediation_apply_config_fix

    out = asyncio.run(remediation_apply_config_fix({"fix_key": "delete_everything"}))
    assert out["success"] is False
    assert out["supported"] == ["hide_api_docs", "nginx_server_tokens_off"]


def test_a_missing_fix_key_is_refused():
    import asyncio
    from gds_api.ops_tools import remediation_apply_config_fix

    out = asyncio.run(remediation_apply_config_fix({}))
    assert out["success"] is False
    assert "fix_key is required" in out["error"]


def test_the_tool_accepts_the_payload_shape_the_gateway_sends():
    """The gateway calls handler(payload) positionally; a keyword-only signature fails every call."""
    import inspect
    from gds_api.ops_tools import remediation_apply_config_fix

    sig = inspect.signature(remediation_apply_config_fix)
    positional = [p for p in sig.parameters.values() if p.kind is p.POSITIONAL_OR_KEYWORD]
    assert positional, "the handler must accept one positional payload"

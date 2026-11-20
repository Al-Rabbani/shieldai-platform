"""Contract tests for the platform-wide SSE feed (gap C11).

These are live tests: they exercise the running API because a stream that is not running cannot be
tested. They skip with a stated reason when the API is not up, rather than passing quietly.
"""
import os
import uuid

import pytest

BASE_URL = os.environ.get("GDS_API_BASE_URL", "http://127.0.0.1:8000")


def _require_live():
    httpx = pytest.importorskip("httpx")
    try:
        if httpx.get(f"{BASE_URL}/health", timeout=5).status_code != 200:
            pytest.skip("API is not serving")
    except Exception:
        pytest.skip("API is unreachable")
    return httpx


def _token():
    """An authenticated session for the live stream tests.

    These two variables are the owner's identity, which is deployment configuration, not a constant. Without
    them this raised KeyError and the test reported a failure - a missing setting dressed up as a broken feed.
    A skip with the reason is the honest outcome: the stream was not tested.
    """
    if not os.environ.get("GDS_OWNER_USER_ID") or not os.environ.get("GDS_TENANT_ID"):
        pytest.skip("GDS_OWNER_USER_ID/GDS_TENANT_ID are not set; the authenticated stream was not tested")
    from gds_api.security import create_access_token

    return create_access_token(
        user_id=uuid.UUID(os.environ["GDS_OWNER_USER_ID"]),
        tenant_id=uuid.UUID(os.environ["GDS_TENANT_ID"]),
    )


def test_the_feed_requires_a_session():
    httpx = _require_live()
    response = httpx.get(f"{BASE_URL}/stream/platform", timeout=10)
    assert response.status_code in (401, 403), (
        f"an anonymous caller got {response.status_code} from the platform feed"
    )


def test_the_feed_is_published_as_server_sent_events():
    httpx = _require_live()
    from gds_api.security import ACCESS_COOKIE_NAME

    with httpx.Client(timeout=20) as client:
        client.cookies.set(ACCESS_COOKIE_NAME, _token())
        with client.stream("GET", f"{BASE_URL}/stream/platform") as response:
            assert response.status_code == 200
            assert response.headers["content-type"].startswith("text/event-stream")
            # A proxy that buffers would deliver nothing until close; the first frame arriving proves
            # the response is genuinely progressive rather than collected and flushed at the end.
            received = b""
            for chunk in response.iter_bytes():
                received += chunk
                if b": connected" in received:
                    break
            assert b": connected" in received, "the stream opened but sent no frame"

"""The config that runs must be the config that is versioned, and both front doors must be guarded.

MEASURED 26 Nov 2026: nginx was serving /etc/nginx/sites-enabled/gds-os as a regular file (5775 bytes, 25 Nov) while
/etc/nginx/sites-available/gds-os - the copy deploy.sh compares against and the only one in the repo - was still the
21 Nov version (4893 bytes). The hardening that refuses /docs, /openapi.json and /redoc, and the www placeholder,
existed on one machine and nowhere else; normalising sites-enabled into the usual symlink would have silently
republished the entire API schema. A second, older copy was also still enabled in sites-enabled, and it DID proxy
/docs and /openapi.json while duplicating every server_name (nginx warned "conflicting server name").

No limit_req existed anywhere: the only rate limiting was application-level, so a flood was rejected inside Python
after nginx had accepted the connection and a worker had parsed it. The first attempt at fixing that guarded only the
app host's /api/, and 60 rapid requests to the API host came back 401 with not one 429 - the host that serves the whole
surface had no limit at all.
"""
import pathlib
import re

REPO = pathlib.Path("/opt/gds-os")
SITE = REPO / "config" / "nginx" / "gds-os"
ZONES = REPO / "config" / "nginx" / "gds-rate-limit.conf"


def server_blocks() -> list[str]:
    return SITE.read_text().split("server {")[1:]


def block_for(name: str) -> str:
    for block in server_blocks():
        if f"server_name {name};" in block:
            return block
    raise AssertionError(f"no server block for {name}")


def test_the_versioned_site_refuses_the_api_schema():
    text = SITE.read_text()
    assert "location ~ ^/(docs|redoc|openapi\\.json)$" in text
    assert text.count("return 404;") >= 2, "both the app and api hosts must refuse the schema"


def test_both_front_doors_carry_a_rate_limit():
    for host in ("app.globaldigitalsecurity.io", "api.globaldigitalsecurity.io"):
        assert "limit_req zone=gds_api" in block_for(host), f"{host} accepts an unlimited flood"


def test_credential_submission_has_its_own_tighter_bucket():
    assert "limit_req zone=gds_auth" in block_for("app.globaldigitalsecurity.io")
    assert "limit_req zone=gds_auth" in block_for("api.globaldigitalsecurity.io")
    zones = ZONES.read_text()
    auth = re.search(r"zone=gds_auth:10m rate=(\d+)r/([sm])", zones)
    assert auth, "the auth zone must be declared"
    # "5r/m" is five per minute; "20r/s" is twenty a second.
    per_minute = int(auth.group(1)) if auth.group(2) == "m" else int(auth.group(1)) * 60
    assert per_minute <= 10, "a credential bucket above 10/min is not a brute-force control"


def test_the_zones_are_declared_in_the_http_context_not_the_site_file():
    # limit_req_zone is invalid inside a server block; nginx would refuse to start.
    assert "limit_req_zone" not in SITE.read_text()
    assert ZONES.read_text().count("limit_req_zone") >= 2


def test_deploy_installs_the_zones_before_the_site():
    deploy = (REPO / "scripts/ops/deploy.sh").read_text()
    zone_at = deploy.find("gds-rate-limit.conf")
    site_at = deploy.find("config/nginx/gds-os")
    assert zone_at != -1, "deploy never installs the zones, so the site would reference an undefined zone"
    assert zone_at < site_at, "zones must be installed before the site that references them"


def test_a_refused_request_is_429_not_a_generic_error():
    text = SITE.read_text()
    assert text.count("limit_req_status 429") >= 3

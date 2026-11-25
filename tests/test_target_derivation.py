"""The reasoning wrapper must supply the target a capability declares, or no agent can run a targeted tool."""
from types import SimpleNamespace

from gds_api.reasoning.governed_tools import _derive_target


def cap(*types):
    return SimpleNamespace(target_types=tuple(types))


def test_ip_target_is_typed_as_ip():
    assert _derive_target({"target": "127.0.0.1"}, cap("domain", "ip")) == ("ip", "127.0.0.1")


def test_hostname_picks_domain_when_only_domain_and_ip_allowed():
    assert _derive_target({"target": "www.example.com"}, cap("domain", "ip")) == ("domain", "www.example.com")


def test_url_is_reduced_to_host_so_it_matches_the_authorised_row():
    assert _derive_target({"url": "https://app.example.com/login?x=1"}, cap("web_application")) == (
        "web_application",
        "app.example.com",
    )


def test_url_capability_that_only_allows_domain_still_resolves():
    assert _derive_target({"url": "https://app.example.com/x"}, cap("domain")) == ("domain", "app.example.com")


def test_port_is_stripped():
    assert _derive_target({"target": "example.com:8443"}, cap("domain")) == ("domain", "example.com")


def test_non_targeted_capability_supplies_nothing():
    assert _derive_target({"target": "example.com"}, cap("none")) == (None, None)
    assert _derive_target({"target": "example.com"}, cap()) == (None, None)


def test_no_target_argument_supplies_nothing_rather_than_guessing():
    assert _derive_target({}, cap("domain", "ip")) == (None, None)


def test_a_type_the_capability_forbids_is_not_invented():
    # A URL offered to a capability that only accepts ip cannot be coerced into one.
    assert _derive_target({"url": "https://example.com"}, cap("ip")) == (None, "example.com")
